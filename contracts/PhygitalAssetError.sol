// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @dev Reverts when the verification of the ownership of the phygital fails
 */
error PhygitalAssetOwnershipVerificationFailed(
    address owner,
    address phygitalAddress
);

/**
 * @dev Reverts when trying to mint a phygital that is not part of the collection
 */
error PhygitalAssetIsNotPartOfCollection(
    address phygitalAddress,
    uint phygitalIndex
);
