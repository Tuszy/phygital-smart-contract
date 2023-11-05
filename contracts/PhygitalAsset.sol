// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC725Y, ERC725YCore} from "@erc725/smart-contracts/contracts/ERC725Y.sol";
import {LSP8NotTokenOwner} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Errors.sol";
import {PhygitalAssetCollection} from "./PhygitalAssetCollection.sol";
import {NotContainingPhygitalAssetCollection, SenderNotOfTypePhygitalAssetCollection, SenderIsNeitherPhygitalAssetCollectionNorPhygitalAssetOwner, PhygitalAssetHasAlreadyAVerifiedOwnership, PhygitalAssetOwnershipVerificationFailed} from "./PhygitalAssetError.sol";
import {_INTERFACEID_PHYGITAL_ASSET, _INTERFACEID_PHYGITAL_ASSET_COLLECTION} from "./PhygitalAssetConstants.sol";

/**
 * @title Phygital Asset Implementation.
 * Must be instantiated by a contract instance of type PhygitalAssetCollection.
 * @author Dennis Tuszynski
 * @dev Contract module represents a phygital asset.
 */
contract PhygitalAsset is ERC725Y {
    bytes32 public immutable id;
    PhygitalAssetCollection public immutable collection;
    bool public verifiedOwnership;

    /**
     * @notice Guard: Only the phygital owner is allowed to call the modified function.
     */
    modifier onlyPhygitalOwner() {
        if (msg.sender != owner()) {
            revert LSP8NotTokenOwner(owner(), id, msg.sender);
        }
        _;
    }

    /**
     * @notice Guard: Only the containing collection is allowed to call the modified function.
     */
    modifier onlyContainingCollection() {
        if (msg.sender != address(collection)) {
            revert NotContainingPhygitalAssetCollection(
                msg.sender,
                address(collection)
            );
        }
        _;
    }

    /**
     * @notice Guard: Only a contract of type PhygitalAssetCollectionis allowed to call the modified function.
     */
    modifier onlyOfTypePhygitalAssetCollection() {
        if (
            !PhygitalAssetCollection(payable(msg.sender)).supportsInterface(
                _INTERFACEID_PHYGITAL_ASSET_COLLECTION
            )
        ) {
            revert SenderNotOfTypePhygitalAssetCollection(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructs a phygital asset
     *
     * @param id_ The id of the phygital that is represented by this contract instance
     * @param owner_ The owner of the phygital
     */
    constructor(
        bytes32 id_,
        address owner_
    ) onlyOfTypePhygitalAssetCollection ERC725Y(owner_) {
        collection = PhygitalAssetCollection(payable(msg.sender));
        id = id_;
        verifiedOwnership = true;
    }

    /**
     * @notice Tries to verify the ownership of the phygital after a transfer - on success updates the verifiedOwnership field with true.
     *
     * @param phygitalSignature signature of the phygital (signed payload is the hashed address of the minter/owner of the phygital)
     */
    function verifyOwnershipAfterTransfer(
        bytes memory phygitalSignature
    ) public onlyPhygitalOwner {
        address phygitalOwner = msg.sender;
        if (verifiedOwnership) {
            revert PhygitalAssetHasAlreadyAVerifiedOwnership(phygitalOwner, id);
        }

        if (
            !collection.verifyPhygitalOwnership(
                phygitalOwner,
                id,
                phygitalSignature
            )
        ) {
            revert PhygitalAssetOwnershipVerificationFailed(phygitalOwner, id);
        }

        verifiedOwnership = true;
    }

    /**
     * Override to allow not only the phygital owner but also the containing collection to edit the ERC725Y data.
     */
    function _checkOwner() internal view override {
        if (owner() != msg.sender && address(collection) != msg.sender) {
            revert SenderIsNeitherPhygitalAssetCollectionNorPhygitalAssetOwner(
                msg.sender,
                address(collection),
                owner()
            );
        }
    }

    /**
     * Resets the ownership verification status to false
     */
    function transferTo(address newOwner) external onlyContainingCollection {
        verifiedOwnership = false;
        transferOwnership(newOwner);
    }

    /**
     * @inheritdoc IERC165
     */
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC725YCore) returns (bool) {
        return
            interfaceId == _INTERFACEID_PHYGITAL_ASSET ||
            super.supportsInterface(interfaceId);
    }
}
