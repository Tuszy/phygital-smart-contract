// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.20;

// OpenZeppelin
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// Lukso
import {_INTERFACEID_LSP0} from "@lukso/lsp-smart-contracts/contracts/LSP0ERC725Account/LSP0Constants.sol";
import {LSP8Enumerable} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/extensions/LSP8Enumerable.sol";
import {LSP8IdentifiableDigitalAsset} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAsset.sol";
import {LSP8IdentifiableDigitalAssetCore} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAssetCore.sol";
import {LSP8NotTokenOwner, LSP8TokenIdAlreadyMinted} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Errors.sol";
import {_LSP8_TOKENID_TYPE_UNIQUE_ID, _LSP8_TOKEN_METADATA_BASE_URI} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {_LSP4_METADATA_KEY, _LSP4_CREATORS_ARRAY_KEY, _LSP4_CREATORS_MAP_KEY_PREFIX} from "@lukso/lsp-smart-contracts/contracts/LSP4DigitalAssetMetadata/LSP4Constants.sol";

// Local
import {IPhygitalAsset} from "./IPhygitalAsset.sol";
import {PhygitalAssetOwnershipVerificationFailed, PhygitalAssetIsNotPartOfCollection, PhygitalAssetHasAnUnverifiedOwnership, PhygitalAssetHasAlreadyAVerifiedOwnership} from "./PhygitalAssetError.sol";
import {_PHYGITAL_ASSET_COLLECTION_URI_KEY, _INTERFACEID_PHYGITAL_ASSET, _LSP4_TOKEN_TYPE_KEY, _LSP4_TOKEN_TYPE} from "./PhygitalAssetConstants.sol";

/**
 * @title Phygital Asset Implementation.
 * A Phygital Asset is comprised of a specified amount of phygitals, whose addresses are forming the merkle tree to verify their validity/existence during minting (similar to a whitelist).
 * A phygital is represented by an asymmetric key pair (e.g. stored in a nfc tag or qr code).
 * The public key is called 'phygital address' and the private key is used to sign the abi.encoded(owner's address, nonce) to verify the ownership (during minting the nonce is equal to 0).
 * The 'phygital id' results from the keccak256 hash of the phygital address. (Phygital Id == to Token Id)
 * @author Dennis Tuszynski
 * @dev Contract module represents an implementation of the PhygitalAsset interface IPhygitalAsset.
 */
contract PhygitalAsset is IPhygitalAsset, LSP8Enumerable {
    using ECDSA for bytes32;
    using MerkleProof for bytes32[];

    /**
     * @inheritdoc IPhygitalAsset
     */
    bytes32 public immutable merkleRootOfCollection;

    /**
     * @inheritdoc IPhygitalAsset
     */
    mapping(bytes32 => bool) public verifiedOwnership;

    /**
     * @inheritdoc IPhygitalAsset
     */
    mapping(bytes32 => uint256) public nonce;

    /**
     * @notice Constructs a phygital asset
     *
     * @param merkleRootOfCollection_ The root of the merkle tree.
     * @param collectionJSONURL_ The url pointing to the json containing the collection.
     * @param name_ The name of the phygital asset.
     * @param symbol_ The symbol of the phygital asset.
     * @param metadataBaseURI_ The metadata base uri for the phygitals.
     * @param collectionOwner_ The address of the collection owner.
     */
    constructor(
        bytes32 merkleRootOfCollection_,
        bytes memory collectionJSONURL_,
        string memory name_,
        string memory symbol_,
        bytes memory metadataJSONURL_,
        bytes memory metadataBaseURI_,
        address collectionOwner_
    )
        LSP8IdentifiableDigitalAsset(
            name_,
            symbol_,
            msg.sender,
            _LSP8_TOKENID_TYPE_UNIQUE_ID
        )
    {
        merkleRootOfCollection = merkleRootOfCollection_;

        _setData(_PHYGITAL_ASSET_COLLECTION_URI_KEY, collectionJSONURL_);

        _setData(_LSP4_METADATA_KEY, metadataJSONURL_);
        _setData(_LSP4_TOKEN_TYPE_KEY, abi.encode(_LSP4_TOKEN_TYPE.COLLECTION));

        _setData(_LSP8_TOKEN_METADATA_BASE_URI, metadataBaseURI_);

        _setData(_LSP4_CREATORS_ARRAY_KEY, bytes.concat(bytes16(uint128(1))));
        _setData(
            bytes32(
                bytes.concat(
                    bytes16(_LSP4_CREATORS_ARRAY_KEY),
                    bytes16(uint128(0))
                )
            ),
            bytes.concat(bytes20(collectionOwner_))
        );
        _setData(
            bytes32(
                bytes.concat(
                    _LSP4_CREATORS_MAP_KEY_PREFIX,
                    bytes20(collectionOwner_)
                )
            ),
            bytes.concat(_INTERFACEID_LSP0, bytes16(uint128(0)))
        );

        _setOwner(collectionOwner_);
    }

    /**
     * @inheritdoc IPhygitalAsset
     */
    function mint(
        address phygitalAddress,
        bytes memory phygitalSignature,
        bytes32[] memory merkleProofOfCollection,
        bool force
    ) public virtual override {
        address phygitalOwner = msg.sender;
        bytes32 phygitalId = keccak256(abi.encode(phygitalAddress));

        if (nonce[phygitalId] > 0) revert LSP8TokenIdAlreadyMinted(phygitalId);

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
        if (!_isPhygitalPartOfCollection(merkleProofOfCollection, phygitalId)) {
            revert PhygitalAssetIsNotPartOfCollection(phygitalId);
        }

        verifiedOwnership[phygitalId] = true;

        _mint(phygitalOwner, phygitalId, force, "");
    }

    /**
     * @inheritdoc IPhygitalAsset
     */
    function verifyOwnershipAfterTransfer(
        address phygitalAddress,
        bytes memory phygitalSignature
    ) public virtual override {
        bytes32 phygitalId = keccak256(abi.encode(phygitalAddress));

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

        emit OwnershipVerified(phygitalOwner, phygitalId);
    }

    /**
     * @dev Verifies the ownership of the phygital by recovering the signer from the signature.
     *
     * @param phygitalOwner The address of the phygital owner. (public key of nfc tag or qr code)
     * @param phygitalId The id of the phygital. (keccak256 hashed public key of nfc tag or qr code)
     * @param phygitalSignature The signature of the phygital to prove the ownership of the phygital. (= signed `phygitalOwner` with current nonce `x`)
     * @return The verification result (true if recovered address equals to passed `phygitalOwner` otherwise false)
     */
    function _verifyPhygitalOwnership(
        address phygitalOwner,
        bytes32 phygitalId,
        bytes memory phygitalSignature
    ) internal view virtual returns (bool) {
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
     * @dev Checks if the given phygital is part of the merkle tree (= based on the collection).
     *
     * @param merkleProofOfCollection The merkle proof for the phygital in the merkle tree.
     * @param phygitalId The id of the phygital. (keccak256 hashed public key of nfc tag or qr code)
     * @return The existence state of the phygital in the collection. (true if it is part of the merkle tree otherwise falls)
     */
    function _isPhygitalPartOfCollection(
        bytes32[] memory merkleProofOfCollection,
        bytes32 phygitalId
    ) internal view virtual returns (bool) {
        return
            merkleProofOfCollection.verify(
                merkleRootOfCollection,
                keccak256(bytes.concat(phygitalId))
            );
    }

    /**
     * @dev Checks if the ownership is verified, if not then the transfer is reverted unless the `phygitalOwner` address is zero (during minting)
     *
     * @param phygitalOwner The current owner address.
     * @param newPhygitalOwner The new owner address.
     * @param phygitalId The phygital id. (= tokenId)
     * @param data Custom data. (unused)
     */
    function _beforeTokenTransfer(
        address phygitalOwner,
        address newPhygitalOwner,
        bytes32 phygitalId,
        bytes memory data
    ) internal virtual override(LSP8Enumerable) {
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
     * @dev Increases the nonce by one and either updates the 'verifiedOwnership' field for the phygital id to`true`
     *      if the `phygitalOwner` address is zero (during minting) or to `false` if it is a transfer.
     *
     * @param phygitalOwner The current owner address.
     * @param newPhygitalOwner The new owner address.
     * @param phygitalId The phygital id. (= tokenId)
     * @param data Custom data. (unused)
     */
    function _afterTokenTransfer(
        address phygitalOwner,
        address newPhygitalOwner,
        bytes32 phygitalId,
        bytes memory data
    ) internal virtual override(LSP8IdentifiableDigitalAssetCore) {
        if (phygitalOwner != address(0)) {
            verifiedOwnership[phygitalId] = false;
            nonce[phygitalId] = nonce[phygitalId] + 1;
        } else {
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
        override(IERC165, LSP8IdentifiableDigitalAsset)
        returns (bool)
    {
        return
            interfaceId == _INTERFACEID_PHYGITAL_ASSET ||
            super.supportsInterface(interfaceId);
    }
}
