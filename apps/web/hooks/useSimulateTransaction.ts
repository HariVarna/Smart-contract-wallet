'use client';

import { useState, useCallback } from 'react';
import type { Address, Hex } from '@scw/types';
import { getPublicClient } from '../lib/blockchain/clients';
import { useWallet } from './useWallet';

export interface SimulationResult {
  success: boolean;
  estimatedGas?: bigint;
  error?: string;
  warning?: string;
}

export function useSimulateTransaction() {
  const { smartWalletAddress, chainId } = useWallet();
  const [isSimulating, setIsSimulating] = useState(false);

  const simulate = useCallback(
    async (
      target: Address,
      value: bigint,
      calldata: Hex
    ): Promise<SimulationResult> => {
      if (!smartWalletAddress) {
        return { success: false, error: 'No active smart wallet' };
      }

      setIsSimulating(true);
      try {
        const publicClient = getPublicClient(chainId);

        // Security Warning Logic
        let warning = undefined;
        // Basic check for approvals
        if (calldata.startsWith('0x095ea7b3')) { // approve(address,uint256)
          warning = 'Token Approval Warning: You are authorizing another contract to spend your tokens. Ensure you trust the target.';
        }

        // Simulate using eth_call / simulateContract
        // We simulate from the Smart Wallet to the Target
        const estimatedGas = await publicClient.estimateGas({
          account: smartWalletAddress,
          to: target,
          value,
          data: calldata,
        });

        // Try a call to see if it reverts
        await publicClient.call({
          account: smartWalletAddress,
          to: target,
          value,
          data: calldata,
        });

        return {
          success: true,
          estimatedGas,
          warning,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Simulation failed';
        return { success: false, error: message };
      } finally {
        setIsSimulating(false);
      }
    },
    [smartWalletAddress, chainId]
  );

  return { simulate, isSimulating };
}
