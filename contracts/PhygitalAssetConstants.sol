// SPDX-License-Identifier: Apache 2.0
pragma solidity ^0.8.20;

// --- ERC165 interface ids
bytes4 constant _INTERFACEID_PHYGITAL_ASSET = 0xae8205e1;

// keccak256('PhygitalAssetCollectionURI')
bytes32 constant _PHYGITAL_ASSET_COLLECTION_URI_KEY = 0x4eff76d745d12fd5e5f7b38e8f396dd0d099124739e69a289ca1faa7ebc53768;

// keccak256('LSP4TokenType')
bytes32 constant _LSP4_TOKEN_TYPE_KEY = 0xe0261fa95db2eb3b5439bd033cda66d56b96f92f243a8228fd87550ed7bdfdb3;

// LSP4 TOKEN TYPES
enum _LSP4_TOKEN_TYPE {
    TOKEN,
    NFT,
    COLLECTION
}
