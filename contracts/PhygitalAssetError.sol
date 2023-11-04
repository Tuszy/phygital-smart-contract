// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @dev Reverts when the verification of the ownership of the phygital fails
 */
error PhygitalAssetOwnershipVerificationFailed(
    address owner,
    bytes32 phygitalAddress
);

/**
 * @dev Reverts when trying to mint a phygital that is not part of the collection
 */
error PhygitalAssetIsNotPartOfCollection(
    uint phygitalIndex,
    bytes32 phygitalAddress
);

/**
 * @dev Reverts when trying to transfer a phygital that has an unverified ownership
 */
error PhygitalAssetHasAnUnverifiedOwnership(
    address owner,
    bytes32 phygitalAddress
);
