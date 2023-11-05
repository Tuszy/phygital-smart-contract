// SPDX-License-Identifier: Apache 2.0
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
 * @dev Reverts when trying to verify a phygital with an already verified ownership
 */
error PhygitalAssetHasAlreadyAVerifiedOwnership(
    address owner,
    bytes32 phygitalId
);
