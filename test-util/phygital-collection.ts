import {
  Wallet,
  solidityPackedKeccak256,
  getBytes,
  AbiCoder,
  keccak256,
} from "ethers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { getLSP2JSONURL } from "./util";
import keyPairs from "./key-pairs";
import phygitalAssetLSP4Metadata from "./phygital-asset-lsp4-metadata.json";

export const phygitalCollection = keyPairs.map((keyPair) => keyPair.publicKey);

export const phygitalCollectionIpfsURL =
  "ipfs://QmXGywSvgx6SJkvR5CqHjTenFUzmm1gh4ASwWDSyQyFNdZ";
export const phygitalCollectionJSONURL = getLSP2JSONURL(
  phygitalCollection,
  phygitalCollectionIpfsURL
);

console.log("PHYGITAL COLLECTION", phygitalCollectionJSONURL);

export const phygitalAssetLSP4MetadataIpfsURL =
  "ipfs://QmZW48MKKZviFdxsN3dZC4mzzCc79ynAHbHhnebwziRbjS";
export const phygitalAssetLSP4MetadataJSONURL = getLSP2JSONURL(
  phygitalAssetLSP4Metadata,
  phygitalAssetLSP4MetadataIpfsURL
);

console.log("LSP4 METADATA", phygitalAssetLSP4MetadataJSONURL);

export const createMerkleTree = (phygitalCollection: string[]) =>
  StandardMerkleTree.of(
    phygitalCollection.map((phygitalAddress) => [phygitalAddress]),
    ["address"]
  );

export const merkleTree = createMerkleTree(phygitalCollection);

export const getVerificationDataForPhygital = (
  phygitalAddress: string,
  phygitalOwnerAddress: string,
  nonce: number = 0
) => {
  let phygitalIndex = -1;
  for (const [index, data] of merkleTree.entries()) {
    if (data[0] === phygitalAddress) {
      phygitalIndex = index;
      break;
    }
  }

  const phygitalKeyPair = keyPairs[phygitalIndex];
  const phygitalId = keccak256(
    getBytes(AbiCoder.defaultAbiCoder().encode(["address"], [phygitalAddress]))
  );
  const phygitalWallet = new Wallet(phygitalKeyPair.privateKey);
  const phygitalSignature = phygitalWallet.signingKey.sign(
    solidityPackedKeccak256(
      ["address", "uint256"],
      [phygitalOwnerAddress, nonce]
    )
  ).serialized;

  const merkleProof = merkleTree
    .getProof(phygitalIndex)
    .map((element) => getBytes(element));

  return {
    phygitalId,
    phygitalSignature,
    merkleProof,
  };
};
