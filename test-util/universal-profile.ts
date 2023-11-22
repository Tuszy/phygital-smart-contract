// Hardhat
import { ethers, lspFactory } from "hardhat";

// Types
import type { AddressLike, BytesLike, Interface } from "ethers";
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

// ERC725
import { createPermissionData } from "./permission";

// Signing
import { EIP191Signer } from "@lukso/eip191-signer.js";

const controllerKey = {
  private: "0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0",
  public: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
};

export const createUniversalProfile = async (
  universalProfileOwner: HardhatEthersSigner,
  phygitalAsset: PhygitalAsset
) => {
  const universalProfile = await lspFactory.UniversalProfile.deploy({
    controllerAddresses: [universalProfileOwner.address],
  });

  const universalProfileAddress = universalProfile.LSP0ERC725Account.address;

  const phygitalAssetContractAddress = await phygitalAsset.getAddress();

  const LSP0ERC725Account = new ethers.Contract(
    universalProfileAddress,
    LSP0ERC725AccountABIInterface,
    universalProfileOwner
  );

  const LSP6KeyManager = new ethers.Contract(
    universalProfile.LSP6KeyManager.address,
    LSP6KeyManagerInterface,
    universalProfileOwner
  );

  // Set Permissions
  const permissionData = createPermissionData(controllerKey.public);
  await LSP0ERC725Account.setDataBatch(
    permissionData.keys,
    permissionData.values
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

    const network = await universalProfileOwner.provider.getNetwork();
    const chainId = network.chainId;

    const encodedExecuteCall = LSP0ERC725AccountABIInterface.encodeFunctionData(
      "execute",
      [OPERATION_TYPES.CALL, contractAddress, 0, encodedInterfaceCall]
    );

    const nonce = await LSP6KeyManager.getNonce(controllerKey.public, 0);
    let encodedMessage = ethers.solidityPacked(
      ["uint256", "uint256", "uint256", "uint256", "uint256", "bytes"],
      [
        25, // LSP25_VERSION
        chainId,
        nonce,
        0,
        0,
        encodedExecuteCall,
      ]
    );

    const eip191Signer = new EIP191Signer();
    const { signature } = await eip191Signer.signDataWithIntendedValidator(
      universalProfile.LSP6KeyManager.address,
      encodedMessage,
      controllerKey.private
    );

    const tx = await LSP6KeyManager.executeRelayCall(
      signature,
      nonce,
      0,
      encodedExecuteCall
    );
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
