// Interfaces
import {
  PhygitalAssetInterface,
  INTERFACE_ID_OF_PHYGITAL_ASSET,
} from "./Interfaces";

// ERC725
import ERC725, { ERC725JSONSchema } from "@erc725/erc725.js";

// Schema
import LSP6KeyManagerSchema from "../schemas/LSP6KeyManager.json";

// Constants
import { ERC725YDataKeys } from "@lukso/lsp-smart-contracts";

export const KeyManagerERC725 = new ERC725(
  LSP6KeyManagerSchema as ERC725JSONSchema[]
);

const restrictCallOperation = "0x00000002"; // restriction 'call' operation
const allowCallingAnyContractInstance =
  "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"; // // allow calling any contract

// https://github.com/lukso-network/LIPs/blob/main/LSPs/LSP-6-KeyManager.md
const allowedCallPermission = [
  [
    restrictCallOperation,
    allowCallingAnyContractInstance,
    INTERFACE_ID_OF_PHYGITAL_ASSET, // contract must support the PhygitalAsset interface
    PhygitalAssetInterface.getFunction("mint")!.selector, // allow calling the 'mint' function
  ],
  [
    restrictCallOperation,
    allowCallingAnyContractInstance,
    INTERFACE_ID_OF_PHYGITAL_ASSET, // contract must support the PhygitalAsset interface
    PhygitalAssetInterface.getFunction("verifyOwnershipAfterTransfer")!
      .selector, // allow calling the 'verifyOwnershipAfterTransfer' function
  ],
  [
    restrictCallOperation,
    allowCallingAnyContractInstance,
    INTERFACE_ID_OF_PHYGITAL_ASSET, // contract must support the PhygitalAsset interface
    PhygitalAssetInterface.getFunction("transfer")!.selector, // allow calling the 'transfer' function
  ],
];
const allowedSetDataPermissions = [
  ERC725YDataKeys.LSP12["LSP12IssuedAssets[]"].index,
  ERC725YDataKeys.LSP12.LSP12IssuedAssetsMap,
];

export const createPermissionData = (controllerKey: string) =>
  KeyManagerERC725.encodeData([
    {
      keyName: "AddressPermissions:Permissions:<address>",
      dynamicKeyParts: controllerKey,
      value: KeyManagerERC725.encodePermissions({
        EXECUTE_RELAY_CALL: true,
        CALL: true,
        SETDATA: true,
      }),
    },
    {
      keyName: "AddressPermissions:AllowedCalls:<address>",
      dynamicKeyParts: controllerKey,
      // @ts-ignore
      value: allowedCallPermission,
    },
    {
      keyName: "AddressPermissions:AllowedERC725YDataKeys:<address>",
      dynamicKeyParts: controllerKey,
      // @ts-ignore
      value: allowedSetDataPermissions,
    },
  ]);
