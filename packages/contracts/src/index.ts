/**
 * @file packages/contracts/src/index.ts
 * Centralized smart contract registry, chain deployments, and ABI descriptors.
 */

import type { Address, NetworkConfig } from '@scw/types';

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
  31337: {},
  11155111: {},
};

/** Helper to retrieve network config by Chain ID */
export function getNetworkConfig(chainId: number): NetworkConfig | undefined {
  return SUPPORTED_NETWORKS[chainId];
}
