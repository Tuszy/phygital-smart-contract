import {
  Wallet,
  solidityPackedKeccak256,
  getBytes,
  AbiCoder,
  concat,
  keccak256,
  toUtf8Bytes,
} from "ethers";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { getLSP2JSONURL } from "./util";
import keyPairs from "./key-pairs";
import phygitalAssetLSP4Metadata from "./phygital-asset-lsp4-metadata.json";

export const KECCAK_256_HASH_FUNCTION = "0x6f357c6a";

export const phygitalCollection = [
  ...keyPairs.map((keyPair) => keyPair.publicKey),
  "0x0A942309aEF13Ae9823AcfAaAb169Da8A942EC92",
];

export const phygitalCollectionIpfsURL =
  "ipfs://QmfJ5dHSCVEDxAmY3oArZtf8o71ALQv4dfWFin5ZKYgaYM";
export const phygitalCollectionJSONURL = getLSP2JSONURL(
  phygitalCollection,
  phygitalCollectionIpfsURL
);

console.log("PHYGITAL COLLECTION", phygitalCollectionJSONURL);

export const phygitalAssetLSP4MetadataIpfsURL =
  "ipfs://QmNRCBoPYEwVv1UPXXuQZdSgSAML87UEoiMBB7jW3ixoN5";
export const phygitalAssetLSP4MetadataJSONURL = getLSP2JSONURL(
  phygitalAssetLSP4Metadata,
  phygitalAssetLSP4MetadataIpfsURL
);

console.log("LSP4 METADATA", phygitalAssetLSP4MetadataJSONURL);

export const phygitalAssetLSP8BaseURI = concat([
  KECCAK_256_HASH_FUNCTION ?? "0x00000000",
  toUtf8Bytes("ipfs://QmVMQDxmjAbXsvXrPsHdjbTgDJ9i5qQDD5fohPrfjkFmje/"),
]);

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

  const merkleProof = merkleTree.getProof(phygitalIndex);

  return {
    phygitalId,
    phygitalSignature,
    merkleProof,
  };
};
