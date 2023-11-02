import {
  solidityPackedKeccak256,
  dataSlice,
  toUtf8Bytes,
  hexlify,
} from "ethers";

export const keccak256 = (type: string) => (data: any) =>
  solidityPackedKeccak256([type], [data]);

// see https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-2-ERC725YJSONSchema.md#JSONURL
export const getLSP2JSONURL = (json: Object, ipfsURL: string): string => {
  const hashFunction = dataSlice(
    keccak256("bytes")(toUtf8Bytes("keccak256(utf8)")),
    0,
    4
  );
  const hashedJSON = keccak256("bytes")(
    toUtf8Bytes(JSON.stringify(json))
  ).substring(2);

  const hexlifiedIpfsURL = hexlify(toUtf8Bytes(ipfsURL)).substring(2);

  const jsonURL = hashFunction + hashedJSON + hexlifiedIpfsURL;

  return jsonURL;
};
