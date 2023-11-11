// Hardhat
import { ethers, lspFactory } from "hardhat";

// Types
import type { AddressLike, BytesLike, BigNumberish, Interface } from "ethers";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { PhygitalAsset } from "../typechain-types";

// Constants
import { OPERATION_TYPES } from "@lukso/lsp-smart-contracts";

// Interfaces
import {
  LSP0ERC725AccountABIInterface,
  LSP6KeyManagerInterface,
  PhygitalAssetInterface,
} from "./Interfaces";

export const createUniversalProfile = async (
  universalProfileOwner: HardhatEthersSigner,
  phygitalAsset: PhygitalAsset
) => {
  const universalProfile = await lspFactory.UniversalProfile.deploy({
    controllerAddresses: [universalProfileOwner.address],
  });

  const universalProfileAddress = universalProfile.LSP0ERC725Account.address;

  const phygitalAssetContractAddress = await phygitalAsset.getAddress();

  const LSP6KeyManager = new ethers.Contract(
    universalProfile.LSP6KeyManager.address,
    LSP6KeyManagerInterface,
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
      [OPERATION_TYPES.CALL, contractAddress, 0, encodedInterfaceCall]
    );
    const tx = await LSP6KeyManager.execute(encodedExecuteCall);
    await tx.wait();
    return tx;
  };

  const mint = async (
    phygitalAddress: AddressLike,
    phygitalSignature: BytesLike,
    merkleProofOfCollection: BytesLike[],
    force: boolean
  ) =>
    await executeCallThroughKeyManager(
      PhygitalAssetInterface,
      phygitalAssetContractAddress,
      "mint",
      phygitalAddress,
      phygitalSignature,
      merkleProofOfCollection,
      force
    );

  const verifyOwnershipAfterTransfer = async (
    phygitalAddress: AddressLike,
    phygitalSignature: BytesLike
  ) =>
    await executeCallThroughKeyManager(
      PhygitalAssetInterface,
      phygitalAssetContractAddress,
      "verifyOwnershipAfterTransfer",
      phygitalAddress,
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
const MAX_ACCOUNTS = 5;
export const getUniversalProfiles = async (phygitalAsset: PhygitalAsset) => {
  const signers = await ethers.getSigners();

  const accounts = [];
  for (let i = 0; i < MAX_ACCOUNTS && i < signers.length; i++) {
    accounts.push(await createUniversalProfile(signers[i], phygitalAsset));
  }

  return accounts;
};
