/**
 * @file packages/contracts/src/index.ts
 * Centralized smart contract registry, chain deployments, and ABI exports.
 */

import type { Address, NetworkConfig } from '@scw/types';
export { SmartWalletABI } from './abis/SmartWalletABI.ts';
export { WalletFactoryABI } from './abis/WalletFactoryABI.ts';
export { ERC20ABI } from './abis/ERC20ABI.ts';

/** Registry mapping chain IDs to deployed contract addresses */
export interface ContractDeploymentAddresses {
  walletFactory?: Address;
  entryPoint?: Address;
  paymaster?: Address;
}

/** Centralized network configurations */
export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    chainId: 31337,
    name: 'Anvil Localnet',
    rpcUrl:
      (typeof process !== 'undefined' && process.env?.['NEXT_PUBLIC_RPC_URL']) ||
      'http://127.0.0.1:8545',
    currencySymbol: 'ETH',
    isTestnet: true,
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://rpc.sepolia.org',
    currencySymbol: 'ETH',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
};

/** Deployment address map per network */
export const CONTRACT_DEPLOYMENTS: Record<number, ContractDeploymentAddresses> = {
  31337: {
    // Default deterministic Anvil first deployed address or env override
    walletFactory:
      (typeof process !== 'undefined' &&
        (process.env?.['NEXT_PUBLIC_FACTORY_ADDRESS'] as Address | undefined)) ||
      '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  },
  11155111: {
    walletFactory:
      typeof process !== 'undefined'
        ? (process.env?.['NEXT_PUBLIC_SEPOLIA_FACTORY_ADDRESS'] as Address | undefined)
        : undefined,
  },
};

/** Helper to retrieve network config by Chain ID */
export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return SUPPORTED_NETWORKS[chainId];
}

/** Helper to retrieve contract deployment addresses by Chain ID */
export function getContractDeployments(chainId: number): ContractDeploymentAddresses | undefined {
  return CONTRACT_DEPLOYMENTS[chainId];
}
