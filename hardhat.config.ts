import { HardhatUserConfig, extendEnvironment } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";
import { LSPFactory } from "@lukso/lsp-factory.js";
import { ERC725 } from "@erc725/erc725.js";
import { SignerOptions } from "@lukso/lsp-factory.js/build/main/src/lib/interfaces/lsp-factory-options";

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    Web3Provider: any;
    LSPFactory: typeof LSPFactory;
    lspFactory: LSPFactory;
    ERC725: typeof ERC725;
  }
}

// Add Web3Provider to HRE
extendEnvironment(async (hre) => {
  hre.Web3Provider = new hre.ethers.BrowserProvider(hre.network.provider);
});

// Add LSPFactory to HRE
extendEnvironment(async (hre) => {
  hre.LSPFactory = LSPFactory;

  const signerOptions: SignerOptions = {
    deployKey: hre.network.config.accounts, // Private key of the account which will deploy smart contracts
    chainId: hre.network.config.chainId,
  };

  // hre.network.provider is an EIP1193-compatible provider.
  hre.lspFactory = new LSPFactory(hre.Web3Provider, signerOptions);
});

// Add ERC725 to HRE
extendEnvironment(async (hre) => {
  hre.ERC725 = ERC725;
});

const config: HardhatUserConfig = {
  solidity: "0.8.20",
};

export default config;
