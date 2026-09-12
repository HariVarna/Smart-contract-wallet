'use client';

/**
 * @file apps/web/hooks/useDeployWallet.ts
 * Deploys new deterministic SmartWallet accounts through the WalletFactory.
 */

import { useState, useCallback } from 'react';
import type { Address, Hash } from '@scw/types';
import { WalletFactoryABI } from '@scw/contracts';
import { getPublicClient, getInjectedWalletClient, getChain } from '../lib/blockchain/clients';
import { useWallet } from './useWallet';

export function useDeployWallet() {
  const { factoryAddress, ownerAddress, chainId, refresh, selectSmartWallet } = useWallet();
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);

  /**
   * Deploys a new SmartWallet for the connected owner.
   * If salt is undefined, automatically queries the factory for the next available salt.
   */
  const deploy = useCallback(
    async (explicitSalt?: bigint): Promise<Address | null> => {
      if (!factoryAddress) {
        setError('WalletFactory contract address is not configured for this network');
        return null;
      }

      if (!ownerAddress) {
        setError('Owner signing authority not connected');
        return null;
      }

      setIsDeploying(true);
      setError(null);

      try {
        const publicClient = getPublicClient(chainId);
        const walletClient = getInjectedWalletClient(chainId);

        if (!walletClient) {
          throw new Error('Browser wallet required to sign deployment transaction');
        }

        let salt = explicitSalt;
        if (salt === undefined) {
          const count = (await publicClient.readContract({
            address: factoryAddress,
            abi: WalletFactoryABI,
            functionName: 'getWalletCount',
            args: [ownerAddress],
          })) as bigint;
          salt = count;
        }

        // 1. Predict address
        const predicted = (await publicClient.readContract({
          address: factoryAddress,
          abi: WalletFactoryABI,
          functionName: 'getAddress',
          args: [ownerAddress, salt],
        })) as Address;

        // 2. Dispatch deployment
        const hash = await walletClient.writeContract({
          chain: getChain(chainId),
          address: factoryAddress,
          abi: WalletFactoryABI,
          functionName: 'createWallet',
          args: [ownerAddress, salt],
          account: ownerAddress,
        });

        setTxHash(hash);

        // 3. Wait for block confirmation
        await publicClient.waitForTransactionReceipt({ hash });

        // 4. Update active wallet & refresh context
        selectSmartWallet(predicted);
        await refresh();

        return predicted;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Wallet deployment failed';
        setError(msg);
        return null;
      } finally {
        setIsDeploying(false);
      }
    },
    [factoryAddress, ownerAddress, chainId, refresh, selectSmartWallet],
  );

  return { deploy, isDeploying, error, txHash };
}
