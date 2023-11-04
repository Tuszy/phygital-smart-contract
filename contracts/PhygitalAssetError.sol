// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @dev Reverts when the verification of the ownership of the phygital fails
 */
error PhygitalAssetOwnershipVerificationFailed(
    address owner,
    bytes32 phygitalId
);

/**
 * @dev Reverts when trying to mint a phygital that is not part of the collection
 */
error PhygitalAssetIsNotPartOfCollection(
    uint phygitalIndex,
    bytes32 phygitalId
);

/**
 * @dev Reverts when trying to transfer a phygital that has an unverified ownership
 */
error PhygitalAssetHasAnUnverifiedOwnership(address owner, bytes32 phygitalId);

/**
 * @dev Reverts when trying to verify a phygital with a already verified ownership
 */
error PhygitalAssetHasAlreadyAVerifiedOwnership(
    address owner,
    bytes32 phygitalId
);

/**
 * @dev Reverts when sender address is not of type PhygitalAssetCollection
 */
error SenderNotOfTypePhygitalAssetCollection(address senderAddress);

/**
 * @dev Reverts when sender address is unequal to the expected phygital asset collection address
 */
error NotContainingPhygitalAssetCollection(
    address senderAddress,
    address phygitalAssetCollectionAddress
);

/**
 * @dev Reverts when sender address is neither the phygital asset collection address nor the phygital owner address
 */
error SenderIsNeitherPhygitalAssetCollectionNorPhygitalAssetOwner(
    address senderAddress,
    address phygitalAssetCollectionAddress,
    address phygitalAssetOwnerAddress
);
