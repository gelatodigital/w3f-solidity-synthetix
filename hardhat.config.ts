import { HardhatUserConfig } from "hardhat/config";

// PLUGINS
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-deploy";

// Process Env Variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const PK = process.env.PK;
const ALCHEMY_ID = process.env.ALCHEMY_ID;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

// HardhatUserConfig bug
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: HardhatUserConfig = {
  // web3 functions
  w3f: {
    rootDir: "./web3-functions",
    debug: false,
    networks: ["hardhat", "mumbai"], //(multiChainProvider) injects provider for these networks
  },
  // hardhat-deploy
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  defaultNetwork:"localhost",
  networks: {
    hardhat: {
      // Standard config
      // timeout: 150000,
      // forking: {
      //   url: `https://opt-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
      //   blockNumber: 111271566,//111271567,//111332665,
      // },
      forking: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
         blockNumber: 18438389,
      },
    },
    localhost: {
      url: 'http://127.0.0.1:8545/',
      chainId: 31337,
    },
    mainnet: {
      accounts: PK ? [PK] : [],
      chainId: 1,
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
    },
    optimism: {
      url: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_ID}`,
      chainId: 10,
      accounts: PK ? [PK] : [],
    }
  },

  solidity: {
    compilers: [
      {
        version: "0.8.16",
      },
      {
        version: "0.5.16"
      }, {
        version:"0.4.25"
      }
    ],
  },

  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },

  // hardhat-deploy
  verify: {
    etherscan: {
      apiKey: ETHERSCAN_API_KEY ? ETHERSCAN_API_KEY : "",
    },
  },
};

export default config;
