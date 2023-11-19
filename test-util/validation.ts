// Crypto
import { isAddress, Contract, Signer } from "ethers";

// Interfaces
import {
  LSP0ERC725AccountABIInterface,
  LSP6KeyManagerInterface,
  PhygitalAssetInterface,
} from "./Interfaces";

// Constants
import { INTERFACE_IDS } from "@lukso/lsp-smart-contracts";

// Util
import { getInterfaceId } from "./util";

// Interface Id
export const interfaceIdOfPhygitalAsset = getInterfaceId(
  PhygitalAssetInterface
);
console.log("PhygitalAsset ERC165 Interface ID:", interfaceIdOfPhygitalAsset);

export function throwIfInvalidAddress(address: string) {
  if (!isAddress(address)) throw Error(`${address} is an invalid address`);
}

export async function throwIfAddressIsNotAERC725Account(
  controllerWallet: Signer,
  address: string
) {
  throwIfInvalidAddress(address);

  const erc725Account = new Contract(
    address,
    LSP0ERC725AccountABIInterface,
    controllerWallet
  );

  try {
    const isERC725Account = await erc725Account.supportsInterface(
      INTERFACE_IDS.LSP0ERC725Account
    );
    if (!isERC725Account) throw new Error();
  } catch (e) {
    throw new Error(`${address} is not an instance of type LSP0ERC725Account`);
  }
}

export async function throwIfAddressIsNotALSP6KeyManager(
  controllerWallet: Signer,
  address: string
) {
  throwIfInvalidAddress(address);

  const lsp6KeyManager = new Contract(
    address,
    LSP6KeyManagerInterface,
    controllerWallet
  );

  try {
    const isKeyManager = await lsp6KeyManager.supportsInterface(
      INTERFACE_IDS.LSP6KeyManager
    );
    if (!isKeyManager) throw new Error();
  } catch (e) {
    throw new Error(`${address} is not an instance of type LSP6KeyManager`);
  }
}

export async function throwIfAddressIsNotAPhygitalAsset(
  controllerWallet: Signer,
  address: string
) {
  throwIfInvalidAddress(address);

  const phygitalAsset = new Contract(
    address,
    PhygitalAssetInterface,
    controllerWallet
  );

  try {
    const isPhygitalAsset = await phygitalAsset.supportsInterface(
      interfaceIdOfPhygitalAsset
    );
    if (!isPhygitalAsset) throw new Error();
  } catch (e) {
    throw new Error(`${address} is not an instance of type PhygitalAsset`);
  }
}
