import { Wallet } from "ethers";
import { MerkleTree } from "merkletreejs";
import { getLSP2JSONURL, keccak256 } from "./util";
import keyPairs from "./key-pairs";
import phygitalAssetLSP4Metadata from "./phygital-asset-lsp4-metadata.json";

export const phygitalAddressList = keyPairs.map((keyPair) => keyPair.publicKey);
export const phygitalIdList = phygitalAddressList.map(keccak256("address"));

export const merkleTreeIpfsURL =
  "ipfs://QmXGywSvgx6SJkvR5CqHjTenFUzmm1gh4ASwWDSyQyFNdZ";
export const merkleTreeLSP2JSONURL = getLSP2JSONURL(
  phygitalAddressList,
  merkleTreeIpfsURL
);

export const phygitalAssetLSP4MetadataIpfsURL =
  "ipfs://QmXnVhSYvUsVTQ8TrRaX9ABmDC5W8HyTxKCcjAFySixKUF";
export const phygitalAssetLSP4MetadataLSP2JSONURL = getLSP2JSONURL(
  phygitalAssetLSP4Metadata,
  phygitalAssetLSP4MetadataIpfsURL
);

export const createMerkleTree = (phygitalIdList: string[]) =>
  new MerkleTree(phygitalIdList, keccak256("bytes"));

export const merkleTree = createMerkleTree(phygitalIdList);

export const merkleTreeRoot = "0x" + merkleTree.getRoot().toString("hex");

export const getVerificationDataForPhygital = (
  phygitalIndex: number,
  phygitalOwnerAddress: string
) => {
  const hashedPhygitalOwnerAddress = keccak256("address")(phygitalOwnerAddress);
  const phygitalKeyPair = keyPairs[phygitalIndex];
  const phygitalAddress = phygitalKeyPair.publicKey;
  const phygitalId = keccak256("address")(phygitalAddress);
  const phygitalWallet = new Wallet(phygitalKeyPair.privateKey);
  const phygitalSignature = phygitalWallet.signingKey.sign(
    hashedPhygitalOwnerAddress
  ).serialized;
  const merkleProof = merkleTree.getProof(phygitalId).map((node) => node.data);

  return {
    phygitalId,
    phygitalSignature,
    merkleProof,
  };
};
