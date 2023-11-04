// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {LSP8IdentifiableDigitalAsset} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8IdentifiableDigitalAsset.sol";
import {LSP8NotTokenOwner} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Errors.sol";
import {_LSP8_TOKENID_TYPE_HASH} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {PhygitalAssetOwnershipVerificationFailed, PhygitalAssetIsNotPartOfCollection, PhygitalAssetHasAnUnverifiedOwnership, PhygitalAssetHasAlreadyAVerifiedOwnership} from "./PhygitalAssetError.sol";
import {_PHYGITAL_ASSET_COLLECTION_MERKLE_TREE_URI_KEY} from "./PhygitalAssetConstants.sol";

/**
 * @title Phygital Asset Collection Implementation.
 * The phygital is represented by an asymmetric key pair and an index which is equal to the position in the merkle tree (= collection).
 * The public key is called 'phygital address' and the private key is used to sign the owner's address to verify the ownership during minting.
 * The id of the phygital results form the keccak256 hash of the public key (= phygital address).
 * @author Dennis Tuszynski
 * @dev Contract module represents a phygital asset.
 */
contract PhygitalAssetCollection is LSP8IdentifiableDigitalAsset {
    /**
     * @notice Root of the merkle tree which represents the phygital asset collection
     */
    bytes32 public merkleRootOfCollection;

    /**
     * @notice Indicates whether the ownership of the phygital has been verified. Only verified phygitals can be transferred.
     * Minting automatically verifies the ownership, whereas everytime a verified phygital is transferred to another address it loses its verified status and must be reverified by the owner.
     */
    mapping(bytes32 => bool) public verifiedOwnership;

    /**
     * @notice Constructs a phygital asset
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
            _LSP8_TOKENID_TYPE_HASH
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
                phygitalId,
                phygitalIndex
            )
        ) {
            revert PhygitalAssetIsNotPartOfCollection(
                phygitalIndex,
                phygitalId
            );
        }

        _mint(phygitalOwner, phygitalId, force, "");
    }

    /**
     * @notice Tries to verify the ownership of the phygital after a transfer - on success updates the verifiedOwnership field with true.
     *
     * @param phygitalId id of the phygital (keccak256 hashed public key of nfc tag or qr code)
     * @param phygitalSignature signature of the phygital (signed payload is the hashed address of the minter/owner of the phygital)
     */
    function verifyOwnershipAfterTransfer(
        bytes32 phygitalId,
        bytes memory phygitalSignature
    ) public {
        _existsOrError(phygitalId);

        address phygitalOwner = msg.sender;

        address realPhygitalOwner = tokenOwnerOf(phygitalId);
        if (realPhygitalOwner != phygitalOwner) {
            revert LSP8NotTokenOwner(
                realPhygitalOwner,
                phygitalId,
                phygitalOwner
            );
        }

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
     * @param _phygitalOwner address of the phygital owner
     * @param _phygitalId id of the phygital (keccak256 hashed public key of nfc tag or qr code)
     * @param _phygitalSignature signature of the phygital (signed payload is the hashed address of the minter/owner of the phygital)
     */
    function _verifyPhygitalOwnership(
        address _phygitalOwner,
        bytes32 _phygitalId,
        bytes memory _phygitalSignature
    ) public pure returns (bool) {
        bytes32 hashedPhygitalOwnerAddress = keccak256(
            abi.encodePacked(_phygitalOwner)
        );
        return
            keccak256(
                abi.encodePacked(
                    _recoverSigner(
                        hashedPhygitalOwnerAddress,
                        _phygitalSignature
                    )
                )
            ) == _phygitalId;
    }

    /**
     * @notice Recovers the signer
     *
     * @param _messageHash hashed message
     * @param _signature signature
     *
     */
    function _recoverSigner(
        bytes32 _messageHash,
        bytes memory _signature
    ) public pure returns (address) {
        (bytes32 r, bytes32 s, uint8 v) = _splitSignature(_signature);

        return ecrecover(_messageHash, v, r, s);
    }

    /**
     * @notice Splits the 65 byte signature into r, s and v.
     *
     * @param _signature signature
     */
    function _splitSignature(
        bytes memory _signature
    ) public pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(_signature.length == 65, "invalid signature length");

        assembly {
            r := mload(add(_signature, 32))
            s := mload(add(_signature, 64))
            v := byte(0, mload(add(_signature, 96)))
        }
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
     * @param phygitalId The phygitalId to transfer
     */
    function _beforeTokenTransfer(
        address phygitalOwner,
        address /*to*/,
        bytes32 phygitalId,
        bytes memory /*data*/
    ) internal view override {
        if (phygitalOwner != address(0) && !verifiedOwnership[phygitalId])
            revert PhygitalAssetHasAnUnverifiedOwnership(
                phygitalOwner,
                phygitalId
            );
    }

    /**
     * @notice Eithers sets the 'verified ownership' status to true if the phygitalOwner address is zero (during minting) or to false if it is a transfer.
     *
     * @param phygitalOwner The current owner address
     * @param phygitalId The phygitalId to transfer
     */
    function _afterTokenTransfer(
        address phygitalOwner,
        address /*to*/,
        bytes32 phygitalId,
        bytes memory /*data*/
    ) internal override {
        verifiedOwnership[phygitalId] = phygitalOwner == address(0);
    }
}
