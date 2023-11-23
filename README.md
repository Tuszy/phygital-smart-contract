# Phygital Smart Contract

The **[PhygitalAsset](https://github.com/Tuszy/phygital-smart-contract/blob/main/contracts/PhygitalAsset.sol)** smart contract is based on the **[LSP8Enumerable](https://github.com/lukso-network/lsp-smart-contracts/blob/develop/contracts/LSP8IdentifiableDigitalAsset/extensions/LSP8Enumerable.sol)** and allows the user to implement phygitals in a simple but efficient way.

## Overview

- A Phygital Asset (= extended LSP8 contract) is comprised of a specified amount of phygitals (= LSP8 tokens), whose addresses are forming the [merkle tree](https://github.com/OpenZeppelin/merkle-tree) to verify their validity/existence during minting (similar to a whitelist)
- A Phygital (= LSP8 token) is represented by an asymmetric key-pair (e.g. stored in a NFC tag or QR code)
  - The *public key* is called **Phygital address**
  - The *private key* is used to sign the **Phygital Owner** (= owner's universal profile address) concatenated with a **Nonce** to verify the ownership, e.g. during minting and after transfers
  - The **Phygital Id** results from the *keccak256* hash of the abi-encoded *phygital address* (= LSP8 token id of type *hash*)
  - The *verified ownership status* indicates whether the currently assigned owner has verified the ownership of the phygital. This is only possible if he/she is in possession of the physical part of the phygital, since they need the private key of the phygital to sign their own universal profile address and the current nonce to prove real ownership. During minting, the status is set to true, but changes to false after each transfer. So that the new owner must verify the ownership to turn it back to true.

## Raw interaction without the [Backend](https://github.com/Tuszy/phygital-backend)
### Steps to create **PhygitalAsset**
   1. Upload LSP4 metadata for collection to IPFS and create LSP2 JSONURL
   2. Upload LSP4 metadata and image directories which contain the data for the phygitals to IPFS and create the base uri
   3. Compile list of phygital addresses (= phygital collection)
   4. Upload the collection to IPFS and create a LSP2 JSONURL
   5. Calculate the merkle root for the collection
   6. Deploy PhygitalAsset contract instance with the prepared data

### Steps to mint **PhygitalAsset**
   1. Retrieve phygital address (e.g. from NFC tag or QR code)
   2. Sign your universal profile address concatenated with 0 (initial phygital nonce) with the private key of the phygital
   3. Determine merkle proof from the collection merkle tree
   4. Mint PhygitalAsset token with the prepared data

### Steps to verify ownership of **PhygitalAsset** after transfer
   1. Retrieve phygital address (e.g. from NFC tag or QR code)
   2. Sign your universal profile address concatenated with the current phygital nonce with the private key of the phygital
   3. Verify PhygitalAsset token ownership with the prepared data
