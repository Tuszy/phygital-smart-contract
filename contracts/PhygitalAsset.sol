// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ERC725Y, ERC725YCore} from "@erc725/smart-contracts/contracts/ERC725Y.sol";
import {OwnableUnset} from "@erc725/smart-contracts/contracts/custom/OwnableUnset.sol";
import {LSP8NotTokenOwner} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Errors.sol";
import {PhygitalAssetCollection} from "./PhygitalAssetCollection.sol";
import {NotContainingPhygitalAssetCollection, SenderNotOfTypePhygitalAssetCollection, SenderIsNeitherPhygitalAssetCollectionNorPhygitalAssetOwner, PhygitalAssetHasAlreadyAVerifiedOwnership, PhygitalAssetOwnershipVerificationFailed, PhygitalAssetContainingCollectionMustNotBeChanged} from "./PhygitalAssetError.sol";
import {_INTERFACEID_PHYGITAL_ASSET, _INTERFACEID_PHYGITAL_ASSET_COLLECTION} from "./PhygitalAssetConstants.sol";

/**
 * @title Phygital Asset Implementation.
 * Must be instantiated by a contract instance of type PhygitalAssetCollection.
 * @author Dennis Tuszynski
 * @dev Contract module represents a phygital asset.
 */
contract PhygitalAsset is ERC725Y {
    /**
     * @notice The so called 'phygital id' results from the keccak256 hash of the phygital address. Attention: The 'phygital id' is NOT equal to the 'tokenId'.
     * Minting a phygital creates an instance of type PhygitalAsset. The resulting contract address is casted to bytes32 and this value is referred to as the 'tokenId'.
     */
    bytes32 public immutable id;
    bool public verifiedOwnership;

    /**
     * @notice Guard: Only the phygital owner is allowed to call the modified function.
     */
    modifier onlyPhygitalOwner() {
        if (msg.sender != phygitalOwner()) {
            revert LSP8NotTokenOwner(owner(), id, msg.sender);
        }
        _;
    }

    /**
     * @notice Guard: Only the containing collection is allowed to call the modified function.
     */
    modifier onlyContainingCollection() {
        if (msg.sender != owner()) {
            revert NotContainingPhygitalAssetCollection(msg.sender, owner());
        }
        _;
    }

    /**
     * @notice Guard: Only a contract of type PhygitalAssetCollectionis allowed to call the modified function.
     */
    modifier onlyOfTypePhygitalAssetCollection() {
        try
            PhygitalAssetCollection(payable(msg.sender)).supportsInterface(
                _INTERFACEID_PHYGITAL_ASSET_COLLECTION
            )
        returns (bool result) {
            if (!result) {
                revert SenderNotOfTypePhygitalAssetCollection(msg.sender);
            }
        } catch {
            revert SenderNotOfTypePhygitalAssetCollection(msg.sender);
        }
        _;
    }

    /**
     * @notice Constructs a phygital asset
     *
     * @param id_ The id of the phygital that is represented by this contract instance
     */
    constructor(
        bytes32 id_
    ) onlyOfTypePhygitalAssetCollection ERC725Y(msg.sender) {
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
        if (verifiedOwnership) {
            revert PhygitalAssetHasAlreadyAVerifiedOwnership(msg.sender, id);
        }

        if (
            !PhygitalAssetCollection(payable(owner())).verifyPhygitalOwnership(
                msg.sender,
                id,
                phygitalSignature
            )
        ) {
            revert PhygitalAssetOwnershipVerificationFailed(msg.sender, id);
        }

        verifiedOwnership = true;
    }

    /**
     *  @notice Returns the address of the phygital owner (fetch from the containing collection)
     */
    function phygitalOwner() public view returns (address) {
        return
            PhygitalAssetCollection(payable(owner())).tokenOwnerOf(tokenId());
    }

    /**
     *  @notice Returns the token id of the phygital (NOT equal to the phygital id)
     */
    function tokenId() public view returns (bytes32) {
        return bytes32(uint256(uint160(address(this))));
    }

    /**
     * Resets the ownership verification status to false
     */
    function resetOwnershipVerificationAfterTransfer()
        external
        onlyContainingCollection
    {
        verifiedOwnership = false;
    }

    /**
     * Allow not only the the owner (containing collection) but also the phygital owner to edit the ERC725Y data.
     */
    function _checkOwner() internal view virtual override(OwnableUnset) {
        if (owner() != msg.sender && phygitalOwner() != msg.sender) {
            revert SenderIsNeitherPhygitalAssetCollectionNorPhygitalAssetOwner(
                msg.sender,
                owner(),
                phygitalOwner()
            );
        }
    }

    /**
     * Disallow changing the owner (containing collection)
     */
    function _setOwner(
        address newOwner
    ) internal virtual override(OwnableUnset) {
        if (owner() != address(0)) {
            revert PhygitalAssetContainingCollectionMustNotBeChanged();
        }
        super._setOwner(newOwner);
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
