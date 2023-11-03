// Hardhat
import { ethers, lspFactory } from "hardhat";

// Types
import type { AddressLike, BytesLike, BigNumberish } from "ethers";
import type { HardhatEthersSigner } from "../node_modules/@nomicfoundation/hardhat-ethers/signers";

// ABI
import { abi as LSP0ERC725AccountABI } from "@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json";
import { abi as LSP6KeyManagerABI } from "@lukso/lsp-smart-contracts/artifacts/LSP6KeyManager.json";
import { abi as PhygitalAssetABI } from "../artifacts/contracts/PhygitalAsset.sol/PhygitalAsset.json";
import { PhygitalAsset } from "../typechain-types";

export const createUniversalProfile = async (
  universalProfileOwner: HardhatEthersSigner,
  phygitalAsset: PhygitalAsset
) => {
  const phygitalAsserContractAddress = await phygitalAsset.getAddress();
  const universalProfile = await lspFactory.UniversalProfile.deploy({
    controllerAddresses: [universalProfileOwner.address],
  });

  const universalProfileAddress = universalProfile.LSP0ERC725Account.address;

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
    functionName: string,
    ...params: any[]
  ) => {
    const encodedPhygitalAssetCall = PhygitalAssetInterface.encodeFunctionData(
      functionName,
      params
    );
    const encodedExecuteCall = LSP0ERC725AccountABIInterface.encodeFunctionData(
      "execute",
      [0, phygitalAsserContractAddress, 0, encodedPhygitalAssetCall]
    );
    const tx = await LSP6KeyManager.execute(encodedExecuteCall);
    await tx.wait();
    return tx;
  };

  const mint = async (
    phygitalOwnerAddress: AddressLike,
    phygitalAddress: AddressLike,
    phygitalIndex: BigNumberish,
    phygitalSignature: BytesLike,
    merkleProofOfCollection: BytesLike[],
    force: boolean
  ) =>
    await executeCallThroughKeyManager(
      "mint",
      phygitalOwnerAddress,
      phygitalAddress,
      phygitalIndex,
      phygitalSignature,
      merkleProofOfCollection,
      force
    );

  return {
    universalProfileOwner, // EOA (= Owner -> KeyManager -> Universal Profile)
    universalProfile, // Universal Profile contract instance
    universalProfileAddress, // Universal Profile address
    executeCallThroughKeyManager, // Universal Profile helper function for calling methods through the KeyManager
    mint,
  };
};

// Local constant
const MAX_ACCOUNTS = 10;
export const getOwnerAndUniversalProfiles = async (
  phygitalAsset: PhygitalAsset
) => {
  const signers = await ethers.getSigners();

  const accounts = [];
  for (let i = 0; i < MAX_ACCOUNTS && i < signers.length; i++) {
    accounts.push(await createUniversalProfile(signers[i], phygitalAsset));
  }

  return accounts;
};
