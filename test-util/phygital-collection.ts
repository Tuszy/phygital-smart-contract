import { Wallet, solidityPackedKeccak256 } from "ethers";
import { MerkleTree } from "merkletreejs";
import { getLSP2JSONURL, keccak256 } from "./util";
import keyPairs from "./key-pairs";
import phygitalAssetLSP4Metadata from "./phygital-asset-lsp4-metadata.json";

const phygitalCollection = keyPairs
  .map((keyPair) => keyPair.publicKey)
  .map(keccak256("address"));

export const phygitalCollectionIpfsURL =
  "ipfs://QmUyM9XyXVFEpF38Kj6omo98F5ZTfFYvnKhgtf6exWfSnC";
export const phygitalCollectionJSONURL = getLSP2JSONURL(
  phygitalCollection,
  phygitalCollectionIpfsURL
);

export const phygitalAssetLSP4MetadataIpfsURL =
  "ipfs://QmXnVhSYvUsVTQ8TrRaX9ABmDC5W8HyTxKCcjAFySixKUF";
export const phygitalAssetLSP4MetadataJSONURL = getLSP2JSONURL(
  phygitalAssetLSP4Metadata,
  phygitalAssetLSP4MetadataIpfsURL
);

export const createMerkleTree = (phygitalCollection: string[]) =>
  new MerkleTree(phygitalCollection, keccak256("bytes"));

export const merkleTree = createMerkleTree(phygitalCollection);

export const merkleRoot = merkleTree.getHexRoot();

export const getVerificationDataForPhygital = (
  phygitalIndex: number,
  phygitalOwnerAddress: string,
  nonce: number = 0
) => {
  const phygitalKeyPair = keyPairs[phygitalIndex];
  const phygitalAddress = phygitalKeyPair.publicKey;
  const phygitalId = keccak256("address")(phygitalAddress);
  const phygitalWallet = new Wallet(phygitalKeyPair.privateKey);
  const phygitalSignature = phygitalWallet.signingKey.sign(
    solidityPackedKeccak256(
      ["address", "uint256"],
      [phygitalOwnerAddress, nonce]
    )
  ).serialized;
  const merkleProof = merkleTree.getProof(phygitalId).map((node) => node.data);

  return {
    phygitalId,
    phygitalSignature,
    merkleProof,
  };
};
