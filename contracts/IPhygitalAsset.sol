// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.20;

// Lukso
import {ILSP8IdentifiableDigitalAsset} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/ILSP8IdentifiableDigitalAsset.sol";

/**
 * @title Phygital Asset Interface.
 * @author Dennis Tuszynski
 * @dev Interface of a PhygitalAsset - Collection of mintable, verifiable and transferable Phygitals (Physical world verification method: NFC tag or QR Code which contain an asymmetric keypair).
 */
interface IPhygitalAsset is ILSP8IdentifiableDigitalAsset {
    /**
     * @dev Emitted when the `owner` verifies the ownership of the `phygitalId`.
     * @param owner The owner who verified the physical possession of the phygital described by the `phygitalId`.
     * @param phygitalId The phygital id of which the ownership has been verified.
     */
    event OwnershipVerified(address indexed owner, bytes32 indexed phygitalId);

    /**
     * @dev Returns the root of the merkle tree created from the collection (list of phygital addresses).
     * @return The root of the merkle tree created from the collection (list of phygital addresses).
     */
    function merkleRootOfCollection() external view returns (bytes32);

    /**
     * @notice The ownership verification tells us whether the new owner has verified the possession of the "physical part" of the phygital.
     * Attention: An unverified ownership status blocks transfers.
     *
     * @dev Indicates whether the phygital ownership has been verified after a transfer.
     * If not then further transfers are disallowed unless the ownership status becomes verified.
     *
     * @param phygitalId The phygital id to retrieve ownership verification status for.
     * @return The ownership verification status (true: verified after transfer, false: not yet verified after transfer).
     */
    function verifiedOwnership(bytes32 phygitalId) external view returns (bool);

    /**
     * @notice Nonce is used for minting and for verifying the ownership after a transfer.
     *
     * @dev If the phygital id has not been minted yet, the nonce is 0 and must be increased to 1 after a successful mint.
     * Furthermore it must be increased with each transfer by 1 (optimally in the _afterTokenTransfer hook).
     * The purpose of the nonce is to prevent reusage of signatures for ownership verification in different transactions.
     * Expected message format: abi.encoded(owner's address, nonce)
     *
     * @param phygitalId The phygital id to get the current nonce for.
     * @return The nonce for the given phygital id.
     */
    function nonce(bytes32 phygitalId) external view returns (uint256);

    /**
     * @notice Mints a phygital from the collection to the `msg.sender`.
     *
     * @param phygitalAddress The address of the phygital to mint. (public key of nfc tag or qr code)
     * @param phygitalSignature The signature to prove the ownership of the phygital. (= signed `msg.sender` with nonce `0`)
     * @param merkleProofOfCollection The merkle proof to check whether the phygital is part of the given collection.
     * @param force Set to `false` to ensure minting for a recipient that implements LSP1, `false` otherwise for forcing the minting.
     */
    function mint(
        address phygitalAddress,
        bytes memory phygitalSignature,
        bytes32[] memory merkleProofOfCollection,
        bool force
    ) external;

    /**
     * @notice Verifies the ownership of the phygital after a transfer for the `msg.sender`.
     *
     * @dev On success updates the `verifiedOwnership` field with `true` otherwise reverts.
     *
     * @param phygitalAddress The address of the phygital to verify ownership for. (public key of nfc tag or qr code)
     * @param phygitalSignature The signature of the phygital to prove the ownership of the phygital. (= signed `msg.sender` with current nonce `x != 0`)
     */
    function verifyOwnershipAfterTransfer(
        address phygitalAddress,
        bytes memory phygitalSignature
    ) external;
}
