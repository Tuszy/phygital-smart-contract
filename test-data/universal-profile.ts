// Hardhat
import { ethers, lspFactory } from "hardhat";

// Types
import type { AddressLike, BytesLike, BigNumberish, Interface } from "ethers";
import type { HardhatEthersSigner } from "../node_modules/@nomicfoundation/hardhat-ethers/signers";

// ABI
import { abi as LSP0ERC725AccountABI } from "@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json";
import { abi as LSP6KeyManagerABI } from "@lukso/lsp-smart-contracts/artifacts/LSP6KeyManager.json";
import { abi as PhygitalAssetABI } from "../artifacts/contracts/PhygitalAsset.sol/PhygitalAsset.json";
import { PhygitalAsset } from "../typechain-types";
import { getInterfaceID } from "./util";

console.log(
  "PhygitalAsset ERC165 Interface ID:",
  getInterfaceID(new ethers.Interface(PhygitalAssetABI))
);

export const createUniversalProfile = async (
  universalProfileOwner: HardhatEthersSigner,
  phygitalAsset: PhygitalAsset
) => {
  const universalProfile = await lspFactory.UniversalProfile.deploy({
    controllerAddresses: [universalProfileOwner.address],
  });

  const universalProfileAddress = universalProfile.LSP0ERC725Account.address;

  const phygitalAssetContractAddress = await phygitalAsset.getAddress();
  const PhygitalAssetInterface = new ethers.Interface(PhygitalAssetABI);
  const LSP0ERC725AccountABIInterface = new ethers.Interface(
    LSP0ERC725AccountABI
  );

  const LSP6KeyManager = new ethers.Contract(
    universalProfile.LSP6KeyManager.address,
    LSP6KeyManagerABI,
    universalProfileOwner
  );
  const executeCallThroughKeyManager = async (
    contractInterface: Interface,
    contractAddress: AddressLike,
    functionName: string,
    ...params: any[]
  ) => {
    const encodedInterfaceCall = contractInterface.encodeFunctionData(
      functionName,
      params
    );
    const encodedExecuteCall = LSP0ERC725AccountABIInterface.encodeFunctionData(
      "execute",
      [0, contractAddress, 0, encodedInterfaceCall]
    );
    const tx = await LSP6KeyManager.execute(encodedExecuteCall);
    await tx.wait();
    return tx;
  };

  const mint = async (
    phygitalId: BytesLike,
    phygitalIndex: BigNumberish,
    phygitalSignature: BytesLike,
    merkleProofOfCollection: BytesLike[],
    force: boolean
  ) =>
    await executeCallThroughKeyManager(
      PhygitalAssetInterface,
      phygitalAssetContractAddress,
      "mint",
      phygitalId,
      phygitalIndex,
      phygitalSignature,
      merkleProofOfCollection,
      force
    );

  const verifyOwnershipAfterTransfer = async (
    phygitalId: BytesLike,
    phygitalSignature: BytesLike
  ) =>
    await executeCallThroughKeyManager(
      PhygitalAssetInterface,
      phygitalAssetContractAddress,
      "verifyOwnershipAfterTransfer",
      phygitalId,
      phygitalSignature
    );

  const transfer = async (
    newPhygitalOwner: AddressLike,
    phygitalId: BytesLike,
    force: boolean
  ) =>
    await executeCallThroughKeyManager(
      PhygitalAssetInterface,
      phygitalAssetContractAddress,
      "transfer",
      universalProfileAddress,
      newPhygitalOwner,
      phygitalId,
      force,
      "0x"
    );

  return {
    universalProfileOwner, // EOA (= Owner -> KeyManager -> Universal Profile)
    universalProfile, // Universal Profile contract instance
    universalProfileAddress, // Universal Profile address
    executeCallThroughKeyManager, // Universal Profile helper function for calling methods through the KeyManager
    mint,
    transfer,
    verifyOwnershipAfterTransfer,
  };
};

// Local constant
const MAX_ACCOUNTS = 10;
export const getUniversalProfiles = async (phygitalAsset: PhygitalAsset) => {
  const signers = await ethers.getSigners();

  const accounts = [];
  for (let i = 0; i < MAX_ACCOUNTS && i < signers.length; i++) {
    accounts.push(await createUniversalProfile(signers[i], phygitalAsset));
  }

  return accounts;
};
