// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.20;

// OpenZeppelin
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// Lukso
import {LSP8Enumerable} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/extensions/LSP8Enumerable.sol";
import {LSP8IdentifiableDigitalAsset} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAsset.sol";
import {LSP8IdentifiableDigitalAssetCore} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAssetCore.sol";
import {LSP8NotTokenOwner, LSP8TokenIdAlreadyMinted} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Errors.sol";
import {_LSP8_TOKENID_TYPE_HASH} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {_LSP4_METADATA_KEY} from "@lukso/lsp-smart-contracts/contracts/LSP4DigitalAssetMetadata/LSP4Constants.sol";

// Local
import {PhygitalAssetOwnershipVerificationFailed, PhygitalAssetIsNotPartOfCollection, PhygitalAssetHasAnUnverifiedOwnership, PhygitalAssetHasAlreadyAVerifiedOwnership} from "./PhygitalAssetError.sol";
import {_PHYGITAL_ASSET_COLLECTION_URI_KEY, _INTERFACEID_PHYGITAL_ASSET} from "./PhygitalAssetConstants.sol";

/**
 * @title Phygital Asset Implementation.
 * A Phygital Asset is comprised of a specified amount of phygitals, whose addresses are forming the merkle tree to verify their validity/existence during minting (similar to a whitelist).
 * A phygital is represented by an asymmetric key pair (e.g. stored in a nfc tag or qr code).
 * The public key is called 'phygital address' and the private key is used to sign the abi.encoded(owner's address, nonce) to verify the ownership (during minting the nonce is equal to 0).
 * The 'phygital id' results from the keccak256 hash of the phygital address.
 * @author Dennis Tuszynski
 * @dev Contract module represents a phygital asset.
 */
contract PhygitalAsset is LSP8Enumerable {
    using ECDSA for bytes32;
    using MerkleProof for bytes32[];
    /**
     * @notice The root of the merkle tree created from the collection
     */
    bytes32 public immutable merkleRootOfCollection;

    /**
     * @notice Indicates whether the phygital ownership has been verified
     */
    mapping(bytes32 => bool) public verifiedOwnership;

    /**
     * @notice Nonce is used to verify the ownership after a transfer. Increased with each transfer.
     */
    mapping(bytes32 => uint256) public nonce;

    /**
     * @notice Constructs a phygital asset
     *
     * @param merkleRootOfCollection_ The root of the merkle tree
     * @param collectionJSONURL_ The url pointing to the json containing the collection
     * @param name_ The name of the phygital asset
     * @param symbol_ The symbol of the phygital asset
     * @param collectionOwner_ The address of the collection owner
     */
    constructor(
        bytes32 merkleRootOfCollection_,
        bytes memory collectionJSONURL_,
        string memory name_,
        string memory symbol_,
        bytes memory metadataJSONURL_,
        address collectionOwner_
    )
        LSP8IdentifiableDigitalAsset(
            name_,
            symbol_,
            msg.sender,
            _LSP8_TOKENID_TYPE_HASH
        )
    {
        merkleRootOfCollection = merkleRootOfCollection_;
        _setData(_PHYGITAL_ASSET_COLLECTION_URI_KEY, collectionJSONURL_);
        setData(_LSP4_METADATA_KEY, metadataJSONURL_);
        _setOwner(collectionOwner_);
    }

    /**
     * @notice Mints a phygital from the collection.
     *
     * @param phygitalId The id of the phygital to mint. (keccak256 hashed public key of nfc tag or qr code)
     * @param phygitalSignature The signature to prove the ownership of the phygital. (= signed owner address)
     * @param merkleProofOfCollection The merkle proof to check whether the phygital is part of the given collection.
     * @param force Set to `false` to ensure minting for a recipient that implements LSP1, `false` otherwise for forcing the minting.
     */
    function mint(
        bytes32 phygitalId,
        bytes memory phygitalSignature,
        bytes32[] memory merkleProofOfCollection,
        bool force
    ) public {
        address phygitalOwner = msg.sender;

        if(nonce[phygitalId] > 0) revert LSP8TokenIdAlreadyMinted(phygitalId);

        if (
            !_verifyPhygitalOwnership(
                phygitalOwner,
                phygitalId,
                phygitalSignature
            )
        ) {
            revert PhygitalAssetOwnershipVerificationFailed(
                phygitalOwner,
                phygitalId
            );
        }
        if (
            !_isPhygitalPartOfCollection(
                merkleProofOfCollection,
                phygitalId
            )
        ) {
            revert PhygitalAssetIsNotPartOfCollection(
                phygitalId
            );
        }

        verifiedOwnership[phygitalId] = true;

        _mint(phygitalOwner, phygitalId, force, "");
    }

    /**
     * @notice Tries to verify the ownership of the phygital after a transfer - on success updates the verifiedOwnership field with true.
     *
     * @param phygitalId The id of the phygital
     * @param phygitalSignature The signature of the phygital (signed payload is the hashed address of the minter/owner of the phygital)
     */
    function verifyOwnershipAfterTransfer(
        bytes32 phygitalId,
        bytes memory phygitalSignature
    ) public {
        if (msg.sender != tokenOwnerOf(phygitalId)) {
            revert LSP8NotTokenOwner(
                tokenOwnerOf(phygitalId),
                phygitalId,
                msg.sender
            );
        }

        address phygitalOwner = msg.sender;

        if (verifiedOwnership[phygitalId]) {
            revert PhygitalAssetHasAlreadyAVerifiedOwnership(
                phygitalOwner,
                phygitalId
            );
        }

        if (
            !_verifyPhygitalOwnership(
                phygitalOwner,
                phygitalId,
                phygitalSignature
            )
        ) {
            revert PhygitalAssetOwnershipVerificationFailed(
                phygitalOwner,
                phygitalId
            );
        }

        verifiedOwnership[phygitalId] = true;
    }

    /**
     * @notice Verifies the ownership of the phygital by recovering the signer from the signature
     *
     * @param phygitalOwner The address of the phygital owner
     * @param phygitalId The id of the phygital (keccak256 hashed public key of nfc tag or qr code)
     * @param phygitalSignature The signature of the phygital (signed payload is the hashed address of the minter/owner of the phygital and the current nonce)
          */
    function _verifyPhygitalOwnership(
        address phygitalOwner,
        bytes32 phygitalId,
        bytes memory phygitalSignature
    ) public view returns (bool) {       
        bytes32 hashedPhygitalOwnerAddress = keccak256(
            abi.encodePacked(phygitalOwner, nonce[phygitalId])
        );
        (
            address phygitalAddress,
            ECDSA.RecoverError recoverError,

        ) = hashedPhygitalOwnerAddress.tryRecover(phygitalSignature);
        if (ECDSA.RecoverError.NoError != recoverError)
            revert PhygitalAssetOwnershipVerificationFailed(
                phygitalOwner,
                phygitalId
            );

        return keccak256(abi.encode(phygitalAddress)) == phygitalId;
    }

    /**
     * @notice Checks if the given phygital is part of the collection
     *
     * @param merkleProofOfCollection The merkle proof for the phygital in the merkle tree
     * @param phygitalId The id of the phygital (keccak256 hashed public key of nfc tag or qr code)
     */
    function _isPhygitalPartOfCollection(
        bytes32[] memory merkleProofOfCollection,
        bytes32 phygitalId
    ) public view returns (bool) {
        return merkleProofOfCollection.verify(merkleRootOfCollection, keccak256(bytes.concat(phygitalId)));
    }

    /**
     * @notice Checks if the ownership is verified, if not then the transfer is reverted unless the phygitalOwner address is zero (during minting)
     *
     * @param phygitalOwner The current owner address
     * @param newPhygitalOwner The new owner address
     * @param phygitalId The phygital id
     * @param data Custom data (unused)
     */
    function _beforeTokenTransfer(
        address phygitalOwner,
        address newPhygitalOwner,
        bytes32 phygitalId,
        bytes memory data
    ) internal override(LSP8Enumerable) {
        if (phygitalOwner != address(0) && !verifiedOwnership[phygitalId]) {
            revert PhygitalAssetHasAnUnverifiedOwnership(
                phygitalOwner,
                phygitalId
            );
        }

        super._beforeTokenTransfer(
            phygitalOwner,
            newPhygitalOwner,
            phygitalId,
            data
        );
    }

    /**
     * @notice Eithers sets the 'verified ownership' status to true if the phygitalOwner address is zero (during minting) or to false if it is a transfer.
     *
     * @param phygitalOwner The current owner address
     * @param newPhygitalOwner The new owner address
     * @param phygitalId The phygital id
     * @param data Custom data (unused)
     */
    function _afterTokenTransfer(
        address phygitalOwner,
        address newPhygitalOwner,
        bytes32 phygitalId,
        bytes memory data
    ) internal override(LSP8IdentifiableDigitalAssetCore) {
        if (phygitalOwner != address(0)) {
            verifiedOwnership[phygitalId] = false;
            nonce[phygitalId] = nonce[phygitalId] + 1;
        }else{
            nonce[phygitalId] = 1;
        }
        super._afterTokenTransfer(
            phygitalOwner,
            newPhygitalOwner,
            phygitalId,
            data
        );
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(LSP8IdentifiableDigitalAsset)
        returns (bool)
    {
        return
            interfaceId == _INTERFACEID_PHYGITAL_ASSET ||
            super.supportsInterface(interfaceId);
    }
}
