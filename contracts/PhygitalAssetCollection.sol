// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {PhygitalAsset} from "./PhygitalAsset.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {LSP8Enumerable} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/extensions/LSP8Enumerable.sol";
import {LSP8IdentifiableDigitalAsset} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAsset.sol";
import {LSP8IdentifiableDigitalAssetCore} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAssetCore.sol";
import {LSP8NotTokenOwner, LSP8TokenIdAlreadyMinted} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Errors.sol";
import {_LSP8_TOKENID_TYPE_ADDRESS} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {PhygitalAssetOwnershipVerificationFailed, PhygitalAssetIsNotPartOfCollection, PhygitalAssetHasAnUnverifiedOwnership, PhygitalAssetHasAlreadyAVerifiedOwnership} from "./PhygitalAssetError.sol";
import {_PHYGITAL_ASSET_COLLECTION_MERKLE_TREE_URI_KEY, _INTERFACEID_PHYGITAL_ASSET_COLLECTION} from "./PhygitalAssetConstants.sol";

/**
 * @title Phygital Asset Collection Implementation.
 * A phygital asset collection is comprised of a specified amount of phygitals, which are included in a merkle tree to verify their validity/existence during minting (similar to a whitelist).
 * A phygital is represented by an asymmetric key pair (e.g. stored in a nfc tag or qr code) and an index which is equal to the position in the merkle tree leaf layer (= list of available phygitals).
 * The public key is called 'phygital address' and the private key is used to sign the owner's address to verify the ownership (e.g. during minting).
 * The so called 'phygital id' results from the keccak256 hash of the phygital address. Attention: The 'phygital id' is NOT equal to the LSP8 'tokenId'.
 * Minting a phygital creates an instance of type PhygitalAsset. The resulting contract address is casted to bytes32 and this value is referred to as the 'tokenId'.
 * @author Dennis Tuszynski
 * @dev Contract module represents a phygital asset collection.
 */
contract PhygitalAssetCollection is LSP8Enumerable {
    using ECDSA for bytes32;
    /**
     * @notice Root of the merkle tree which represents the phygital asset collection
     */
    bytes32 public immutable merkleRootOfCollection;

    /**
     * @notice Maps the phygital ids (keccak256 hashed public key of nfc tag or qr code) to the corresponding PhygitalAsset contract addresses
     */
    mapping(bytes32 => address) public phygitalIdToContractAddress;

    /**
     * @notice Constructs a phygital asset collection
     *
     * @param merkleRootOfCollection_ root of the merkle tree which represents the phygital asset collection
     * @param merkleTreeJSONURL_ url pointing to the json containing the merkle tree
     * @param name_ name of the phygital asset
     * @param symbol_ symbol of the phygital asset
     * @param collectionOwner_ address of the collection owner
     */
    constructor(
        bytes32 merkleRootOfCollection_,
        bytes memory merkleTreeJSONURL_,
        string memory name_,
        string memory symbol_,
        address collectionOwner_
    )
        LSP8IdentifiableDigitalAsset(
            name_,
            symbol_,
            collectionOwner_,
            _LSP8_TOKENID_TYPE_ADDRESS
        )
    {
        merkleRootOfCollection = merkleRootOfCollection_;
        _setData(
            _PHYGITAL_ASSET_COLLECTION_MERKLE_TREE_URI_KEY,
            merkleTreeJSONURL_
        );
    }

    /**
     * @notice Minting a phygital from the collection. Phygital id equals to the hash of the phygital address.
     *
     * @param phygitalId The id of the phygital to mint. (keccak256 hashed public key of nfc tag or qr code)
     * @param phygitalIndex The index of the phygital to mint.
     * @param phygitalSignature Signature sent alongside the minting to prove the ownership of the phygital.
     * @param merkleProofOfCollection Merkle proof sent alongside the minting to check whether the phygital is part of the given collection.
     * @param force Set to `false` to ensure that you are minting for a recipient that implements LSP1, `false` otherwise for forcing the minting.
     */
    function mint(
        bytes32 phygitalId,
        uint phygitalIndex,
        bytes memory phygitalSignature,
        bytes32[] memory merkleProofOfCollection,
        bool force
    ) public {
        address phygitalOwner = msg.sender;

        if (phygitalIdToContractAddress[phygitalId] != address(0)) {
            revert LSP8TokenIdAlreadyMinted(
                bytes32(
                    uint256(uint160(phygitalIdToContractAddress[phygitalId]))
                )
            );
        }

        if (
            !verifyPhygitalOwnership(
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
                phygitalId,
                phygitalIndex
            )
        ) {
            revert PhygitalAssetIsNotPartOfCollection(
                phygitalIndex,
                phygitalId
            );
        }

        PhygitalAsset phygitalAsset = new PhygitalAsset(phygitalId);

        phygitalIdToContractAddress[phygitalId] = address(phygitalAsset);

        bytes32 phygitalIdToContractAddressAsBytes32 = bytes32(
            uint256(uint160(address(phygitalAsset)))
        );
        _mint(phygitalOwner, phygitalIdToContractAddressAsBytes32, force, "");
    }

    /**
     * @notice Verifies the ownership of the phygital by recovering the signer from the signature
     *
     * @param phygitalOwner address of the phygital owner
     * @param phygitalId id of the phygital (keccak256 hashed public key of nfc tag or qr code)
     * @param phygitalSignature signature of the phygital (signed payload is the hashed address of the minter/owner of the phygital)
     */
    function verifyPhygitalOwnership(
        address phygitalOwner,
        bytes32 phygitalId,
        bytes memory phygitalSignature
    ) public pure returns (bool) {
        bytes32 hashedPhygitalOwnerAddress = keccak256(
            abi.encodePacked(phygitalOwner)
        );
        (
            address phygitalAddress,
            ECDSA.RecoverError recoverError,
            bytes32 signatureLength
        ) = hashedPhygitalOwnerAddress.tryRecover(phygitalSignature);
        if (ECDSA.RecoverError.NoError != recoverError)
            revert PhygitalAssetOwnershipVerificationFailed(
                phygitalOwner,
                phygitalId
            );
        return keccak256(abi.encodePacked(phygitalAddress)) == phygitalId;
    }

    /**
     * @notice Checks if the given phygital is part of the collection
     *
     * @param _merkleProofOfCollection merkle proof for the phygital in the merkle tree (= collection)
     * @param _phygitalId id of the phygital (keccak256 hashed public key of nfc tag or qr code)
     * @param _phygitalIndex index of the phygital address in the merkle tree (= collection)
     */
    function _isPhygitalPartOfCollection(
        bytes32[] memory _merkleProofOfCollection,
        bytes32 _phygitalId,
        uint _phygitalIndex
    ) public view returns (bool) {
        bytes32 hash = _phygitalId;

        for (uint i = 0; i < _merkleProofOfCollection.length; i++) {
            bytes32 proofElement = _merkleProofOfCollection[i];

            if (_phygitalIndex % 2 == 0) {
                hash = keccak256(abi.encodePacked(hash, proofElement));
            } else {
                hash = keccak256(abi.encodePacked(proofElement, hash));
            }

            _phygitalIndex = _phygitalIndex / 2;
        }

        return hash == merkleRootOfCollection;
    }

    /**
     * @notice Checks if the ownership is verified, if not then the transfer is reverted unless the phygitalOwner address is zero (during minting)
     *
     * @param phygitalOwner The current owner address
     * @param newPhygitalOwner The new owner address
     * @param phygitalContractAddressAsBytes32 The phygital contract address as bytes32 (tokenId)
     * @param data Custom data (unused)
     */
    function _beforeTokenTransfer(
        address phygitalOwner,
        address newPhygitalOwner,
        bytes32 phygitalContractAddressAsBytes32,
        bytes memory data
    ) internal override(LSP8Enumerable) {
        PhygitalAsset phygitalAsset = PhygitalAsset(
            address(uint160(uint256(phygitalContractAddressAsBytes32)))
        );
        if (phygitalOwner != address(0) && !phygitalAsset.verifiedOwnership()) {
            revert PhygitalAssetHasAnUnverifiedOwnership(
                phygitalOwner,
                phygitalAsset.id()
            );
        }

        super._beforeTokenTransfer(
            phygitalOwner,
            newPhygitalOwner,
            phygitalContractAddressAsBytes32,
            data
        );
    }

    /**
     * @notice Eithers sets the 'verified ownership' status to true if the phygitalOwner address is zero (during minting) or to false if it is a transfer.
     *
     * @param phygitalOwner The current owner address
     * @param newPhygitalOwner The new owner address
     * @param phygitalContractAddressAsBytes32 The phygital contract address as bytes32 (tokenId)
     * @param data Custom data (unused)
     */
    function _afterTokenTransfer(
        address phygitalOwner,
        address newPhygitalOwner,
        bytes32 phygitalContractAddressAsBytes32,
        bytes memory data
    ) internal override(LSP8IdentifiableDigitalAssetCore) {
        if (phygitalOwner != address(0)) {
            PhygitalAsset phygitalAsset = PhygitalAsset(
                address(uint160(uint256(phygitalContractAddressAsBytes32)))
            );
            phygitalAsset.resetOwnershipVerificationAfterTransfer();
        }
        super._afterTokenTransfer(
            phygitalOwner,
            newPhygitalOwner,
            phygitalContractAddressAsBytes32,
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
            interfaceId == _INTERFACEID_PHYGITAL_ASSET_COLLECTION ||
            super.supportsInterface(interfaceId);
    }
}
