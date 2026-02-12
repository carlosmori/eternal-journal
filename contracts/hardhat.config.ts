import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';

dotenv.config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '0x' + '0'.repeat(64);

const config: HardhatUserConfig = {
  solidity: '0.8.20',
  networks: {
    baseSepolia: {
      url: 'https://sepolia.base.org',
      chainId: 84532,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
    base: {
      url: 'https://mainnet.base.org',
      chainId: 8453,
      accounts: [DEPLOYER_PRIVATE_KEY],
    },
  },
};

export default config;
