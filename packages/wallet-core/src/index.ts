/**
 * @file packages/wallet-core/src/index.ts
 * Framework-agnostic wallet client primitives and helpers.
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { localhost } from 'viem/chains';
import type { NetworkConfig } from '@scw/types';

/**
 * Creates a viem PublicClient for querying on-chain wallet state.
 */
export function createWalletPublicClient(network: NetworkConfig): PublicClient {
  return createPublicClient({
    chain: {
      ...localhost,
      id: network.chainId,
      name: network.name,
    },
    transport: http(network.rpcUrl),
  });
}

/**
 * Validates basic Ethereum address format (0x + 40 hex chars).
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
