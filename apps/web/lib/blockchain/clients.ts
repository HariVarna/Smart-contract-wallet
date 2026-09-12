/**
 * @file apps/web/lib/blockchain/clients.ts
 * Type-safe Viem blockchain clients for querying and executing contract transactions.
 */

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  defineChain,
  type Chain,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { sepolia } from 'viem/chains';
import { SUPPORTED_NETWORKS } from '@scw/contracts';
import type { Address } from '@scw/types';

export const anvilChain = defineChain({
  id: 31337,
  name: 'Anvil Localnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env['NEXT_PUBLIC_RPC_URL'] || 'http://127.0.0.1:8545'],
    },
  },
});

/**
 * Returns the Viem Chain definition for a given chain ID.
 */
export function getChain(chainId: number): Chain {
  if (chainId === 11155111) return sepolia;
  return anvilChain;
}

/**
 * Returns a PublicClient for the specified network.
 */
export function getPublicClient(chainId: number = 31337): PublicClient {
  const chain = getChain(chainId);
  const network = SUPPORTED_NETWORKS[chainId] || SUPPORTED_NETWORKS[31337]!;

  return createPublicClient({
    chain,
    transport: http(network.rpcUrl),
  });
}

/**
 * Returns an Injected WalletClient (e.g. MetaMask / Browser Extension) if available.
 */
export function getInjectedWalletClient(chainId: number = 31337): WalletClient | null {
  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    return null;
  }

  const chain = getChain(chainId);

  return createWalletClient({
    chain,
    transport: custom((window as unknown as { ethereum: unknown }).ethereum as never),
  });
}

/**
 * Requests Ethereum accounts from injected provider (window.ethereum).
 */
export async function requestInjectedAccounts(): Promise<Address[]> {
  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    throw new Error('No Ethereum browser wallet found. Please install MetaMask or use a supported browser.');
  }

  const provider = (window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }).ethereum;
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  return accounts as Address[];
}
