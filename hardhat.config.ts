import { HardhatUserConfig, extendEnvironment } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-deploy";
import { EthersExternalProvider, LSPFactory } from "@lukso/lsp-factory.js";
import { ERC725 } from "@erc725/erc725.js";

const DEFAULT_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const LSP_FACTORY_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff82";

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
  hre.Web3Provider = hre.network.provider;
  hre.Web3Provider.chainId = hre.network.config.chainId;
});

// Add LSPFactory to HRE
extendEnvironment(async (hre) => {
  hre.LSPFactory = LSPFactory;
  hre.lspFactory = new LSPFactory(
    hre.Web3Provider as EthersExternalProvider,
    LSP_FACTORY_PRIVATE_KEY ?? hre.network.config.accounts[0]
  );
});

// Add ERC725 to HRE
extendEnvironment(async (hre) => {
  hre.ERC725 = ERC725;
});

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 10000,
      },
    },
  },
  gasReporter: {
    enabled: true,
    currency: "USD",
  },
  networks: {
    LuksoMainnet: {
      url:
        process.env.RPC_URL_MAINNET && process.env.RPC_URL_API_KEY_MAINNET
          ? `${process.env.RPC_URL_MAINNET}?apiKey=${process.env.RPC_URL_API_KEY_MAINNET}`
          : "https://rpc.lukso.gateway.fm",
      chainId: 42,
      accounts: [process.env.PRIVATE_KEY ?? DEFAULT_PRIVATE_KEY],
    },
    LuksoTestnet: {
      url:
        process.env.RPC_URL_TESTNET && process.env.RPC_URL_API_KEY_TESTNET
          ? `${process.env.RPC_URL_TESTNET}?apiKey=${process.env.RPC_URL_API_KEY_TESTNET}`
          : "https://rpc.testnet.lukso.gateway.fm",
      chainId: 4201,
      accounts: [process.env.PRIVATE_KEY ?? DEFAULT_PRIVATE_KEY],
    },
    hardhat: {
      chainId: 1337,
      accounts: [
        {
          privateKey: DEFAULT_PRIVATE_KEY,
          balance: "10000000000000000000000", // 10000 ETH
        },
        {
          privateKey:
            "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
          balance: "10000000000000000000000", // 10000 ETH
        },
        {
          privateKey:
            "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
          balance: "10000000000000000000000", // 10000 ETH
        },
        {
          privateKey:
            "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
          balance: "10000000000000000000000", // 10000 ETH
        },
        {
          privateKey:
            "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
          balance: "10000000000000000000000", // 10000 ETH
        },
        {
          privateKey: LSP_FACTORY_PRIVATE_KEY,
          balance: "10000000000000000000000", // 10000 ETH
        },
      ],
    },
    localhost: {
      chainId: 1337,
      accounts: [
        DEFAULT_PRIVATE_KEY,
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
        "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
        "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
        LSP_FACTORY_PRIVATE_KEY,
      ],
    },
  },
  etherscan: {
    apiKey: {
      //lukso: "lukso api key for lukso-scan"
    },
  },
  namedAccounts: {
    deployer: 0,
  },
};

export default config;
