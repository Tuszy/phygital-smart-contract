import { MerkleTree } from "merkletreejs";
import listOfKeyPairs from "./key-pairs";
import { keccak256 } from "./util";

const listOfPublicKeys = listOfKeyPairs.map((keyPair) => keyPair.publicKey);

const createMerkleTree = (listOfPublicKeys: string[]) =>
  new MerkleTree(
    listOfPublicKeys.map(keccak256("address")),
    keccak256("bytes")
  );

const merkleTree = createMerkleTree(listOfPublicKeys);

export default merkleTree;
