import { MerkleTree } from "merkletreejs";
import { solidityPackedKeccak256 } from "ethers";
import listOfKeyPairs from "./key-pairs";

const listOfPublicKeys = listOfKeyPairs.map((keyPair) => keyPair.publicKey);

const keccak256 = (publicKey: string) =>
  solidityPackedKeccak256(["address"], [publicKey]);

const createMerkleTree = (listOfPublicKeys: string[]) =>
  new MerkleTree(listOfPublicKeys.map(keccak256), keccak256);

const merkleTree = createMerkleTree(listOfPublicKeys);

export default merkleTree;
