// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.20;

/**
 * @dev Reverts when the verification of the ownership of the phygital fails (0xe73552b6)
 */
error PhygitalAssetOwnershipVerificationFailed(
    address owner,
    bytes32 phygitalId
);

/**
 * @dev Reverts when trying to mint a phygital that is not part of the collection (0x461e0d36)
 */
error PhygitalAssetIsNotPartOfCollection(
    bytes32 phygitalId
);

/**
 * @dev Reverts when trying to transfer a phygital that has an unverified ownership (0x906fb8a7)
 */
error PhygitalAssetHasAnUnverifiedOwnership(address owner, bytes32 phygitalId);

/**
 * @dev Reverts when trying to verify a phygital with an already verified ownership (0x56d5acaf)
 */
error PhygitalAssetHasAlreadyAVerifiedOwnership(
    address owner,
    bytes32 phygitalId
);
