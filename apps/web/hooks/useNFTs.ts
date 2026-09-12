'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Address } from '@scw/types';
import { getPublicClient } from '../lib/blockchain/clients';
import { useWallet } from './useWallet';

export interface NFTAsset {
  contractAddress: Address;
  tokenId: bigint;
  type: 'ERC721' | 'ERC1155';
  balance?: bigint; // For ERC1155
}

// In a real production environment, this would be powered by an Indexer (Alchemy/Moralis/Graph).
// Since we don't have an indexer, we track a hardcoded list of known test contracts.
const KNOWN_NFT_CONTRACTS: Address[] = [
  '0x1234567890123456789012345678901234567890', // Mock ERC721
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', // Mock ERC1155
];

export function useNFTs() {
  const { smartWalletAddress, chainId, isDeployed } = useWallet();
  const [nfts, setNfts] = useState<NFTAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNFTs = useCallback(async () => {
    if (!smartWalletAddress || !isDeployed) {
      setNfts([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = getPublicClient(chainId);
      const foundNfts: NFTAsset[] = [];

      // Minimal mock querying (e.g. checking balance for first 10 token IDs)
      // because viem does not natively support "getAllNFTs"
      for (const contract of KNOWN_NFT_CONTRACTS) {
        try {
          // Attempt ERC721 balance check
          const balance = await publicClient.readContract({
            address: contract,
            abi: [{ name: 'balanceOf', type: 'function', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' }],
            functionName: 'balanceOf',
            args: [smartWalletAddress],
          }) as bigint;

          if (balance > 0n) {
            // Found tokens, but we can't easily enumerate which ones without Enumerable extension
            // We'll mock returning a dummy token ID for UI demonstration
            foundNfts.push({
              contractAddress: contract,
              tokenId: 1n,
              type: 'ERC721'
            });
          }
        } catch (e) {
          // Ignore, might not be ERC721 or contract not deployed
        }
      }

      setNfts(foundNfts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch NFTs';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [smartWalletAddress, chainId, isDeployed]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return { nfts, isLoading, error, refetch: fetchNFTs };
}
