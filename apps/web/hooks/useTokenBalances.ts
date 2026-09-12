'use client';

/**
 * @file apps/web/hooks/useTokenBalances.ts
 * Manages native currency and ERC-20 token balances and custom token imports for the smart wallet.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Address, AssetBalance, TokenMetadata } from '@scw/types';
import { formatEtherBalance, formatTokenBalance, isValidEthereumAddress } from '@scw/wallet-core';
import { getPublicClient } from '../lib/blockchain/clients';
import { fetchNativeBalance, fetchTokenBalance, fetchTokenMetadata } from '../lib/blockchain/tokenService';
import { useWallet } from './useWallet';

const STORAGE_KEY_PREFIX = 'scw_custom_tokens_';

export function useTokenBalances() {
  const { smartWalletAddress, chainId, isDeployed, balance: nativeEthBalance } = useWallet();
  const [trackedTokens, setTrackedTokens] = useState<TokenMetadata[]>([]);
  const [assets, setAssets] = useState<AssetBalance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load custom saved tokens from localStorage on mount / chain change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${chainId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as TokenMetadata[];
        setTrackedTokens(parsed);
      } else {
        setTrackedTokens([]);
      }
    } catch {
      setTrackedTokens([]);
    }
  }, [chainId]);

  // Refresh all balances
  const refreshBalances = useCallback(async () => {
    if (!smartWalletAddress) {
      setAssets([
        {
          isNative: true,
          balance: 0n,
          formattedBalance: '0.0000',
        },
      ]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = getPublicClient(chainId);

      // 1. Fetch Native ETH Balance
      const ethBal = await fetchNativeBalance(publicClient, smartWalletAddress);
      const nativeAsset: AssetBalance = {
        isNative: true,
        balance: ethBal,
        formattedBalance: formatEtherBalance(ethBal),
      };

      // 2. Fetch ERC-20 Balances
      const tokenAssets: AssetBalance[] = await Promise.all(
        trackedTokens.map(async (meta) => {
          const bal = await fetchTokenBalance(publicClient, meta.address, smartWalletAddress);
          return {
            token: meta,
            isNative: false,
            balance: bal,
            formattedBalance: formatTokenBalance(bal, meta.decimals),
          };
        }),
      );

      setAssets([nativeAsset, ...tokenAssets]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to query token balances';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [smartWalletAddress, chainId, trackedTokens]);

  // Import a new ERC-20 token
  const importToken = useCallback(
    async (tokenAddress: string): Promise<TokenMetadata> => {
      if (!isValidEthereumAddress(tokenAddress)) {
        throw new Error('Invalid Ethereum contract address format');
      }

      const cleanAddress = tokenAddress.toLowerCase() as Address;

      // Check if already tracked
      if (trackedTokens.some((t) => t.address.toLowerCase() === cleanAddress)) {
        throw new Error('Token is already imported in your asset list');
      }

      const publicClient = getPublicClient(chainId);
      const metadata = await fetchTokenMetadata(publicClient, cleanAddress);

      const updated = [...trackedTokens, metadata];
      setTrackedTokens(updated);

      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${chainId}`, JSON.stringify(updated));
      }

      return metadata;
    },
    [chainId, trackedTokens],
  );

  // Remove a tracked token
  const removeToken = useCallback(
    (tokenAddress: Address) => {
      const updated = trackedTokens.filter((t) => t.address.toLowerCase() !== tokenAddress.toLowerCase());
      setTrackedTokens(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`${STORAGE_KEY_PREFIX}${chainId}`, JSON.stringify(updated));
      }
    },
    [chainId, trackedTokens],
  );

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  return {
    assets,
    trackedTokens,
    isLoading,
    error,
    importToken,
    removeToken,
    refreshBalances,
  };
}
