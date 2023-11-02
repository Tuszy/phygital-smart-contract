import keyPairs from "./key-pairs.json";
export type KeyPair = {
  publicKey: string;
  privateKey: string;
};

export default keyPairs as KeyPair[];
