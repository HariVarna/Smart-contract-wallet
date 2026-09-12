'use client';

/**
 * @file apps/web/hooks/useActivity.ts
 * Fetches and parses on-chain transaction events for the active SmartWallet,
 * with automatic decoding for outgoing ERC-20 transfers.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Address, Hash, Hex } from '@scw/types';
import { SmartWalletABI } from '@scw/contracts';
import { decodeERC20Transfer } from '@scw/wallet-core';
import { getPublicClient } from '../lib/blockchain/clients';
import { useWallet } from './useWallet';

export interface ActivityItem {
  id: string;
  type: 'INCOMING_ETH' | 'OUTGOING_ETH' | 'OUTGOING_ERC20' | 'OUTGOING_EXECUTION';
  txHash: Hash;
  blockNumber: bigint;
  targetOrSender: Address;
  value: bigint;
  nonce?: bigint;
  data?: string;
  tokenRecipient?: Address;
  tokenAmount?: bigint;
  status: 'SUCCESS' | 'FAILED';
}

export function useActivity() {
  const { smartWalletAddress, chainId, isDeployed } = useWallet();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    if (!smartWalletAddress || !isDeployed) {
      setActivities([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = getPublicClient(chainId);

      // Query EthReceived events
      const ethReceivedLogs = await publicClient.getLogs({
        address: smartWalletAddress,
        event: {
          type: 'event',
          name: 'EthReceived',
          inputs: [
            { name: 'sender', type: 'address', indexed: true },
            { name: 'amount', type: 'uint256', indexed: false },
          ],
        },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      // Query TransactionExecuted events
      const txExecutedLogs = await publicClient.getLogs({
        address: smartWalletAddress,
        event: {
          type: 'event',
          name: 'TransactionExecuted',
          inputs: [
            { name: 'target', type: 'address', indexed: true },
            { name: 'value', type: 'uint256', indexed: false },
            { name: 'data', type: 'bytes', indexed: false },
            { name: 'nonce', type: 'uint256', indexed: false },
            { name: 'returnData', type: 'bytes', indexed: false },
          ],
        },
        fromBlock: 0n,
        toBlock: 'latest',
      });

      const parsed: ActivityItem[] = [];

      for (const log of ethReceivedLogs) {
        const args = (log as { args: { sender?: Address; amount?: bigint } }).args;
        parsed.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'INCOMING_ETH',
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          targetOrSender: args.sender || '0x0000000000000000000000000000000000000000',
          value: args.amount || 0n,
          status: 'SUCCESS',
        });
      }

      for (const log of txExecutedLogs) {
        const args = (log as {
          args: {
            target?: Address;
            value?: bigint;
            data?: string;
            nonce?: bigint;
          };
        }).args;

        const calldataHex = (args.data || '0x') as Hex;
        const target = args.target || '0x0000000000000000000000000000000000000000';
        const val = args.value || 0n;

        // Check if calldata is an ERC-20 transfer
        const erc20Decoded = decodeERC20Transfer(calldataHex);

        if (erc20Decoded) {
          parsed.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            type: 'OUTGOING_ERC20',
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            targetOrSender: target, // Token Contract Address
            value: 0n,
            tokenRecipient: erc20Decoded.recipient,
            tokenAmount: erc20Decoded.amount,
            nonce: args.nonce,
            data: args.data,
            status: 'SUCCESS',
          });
        } else if (val > 0n && (!args.data || args.data === '0x')) {
          parsed.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            type: 'OUTGOING_ETH',
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            targetOrSender: target,
            value: val,
            nonce: args.nonce,
            data: args.data,
            status: 'SUCCESS',
          });
        } else {
          parsed.push({
            id: `${log.transactionHash}-${log.logIndex}`,
            type: 'OUTGOING_EXECUTION',
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            targetOrSender: target,
            value: val,
            nonce: args.nonce,
            data: args.data,
            status: 'SUCCESS',
          });
        }
      }

      // Sort newest first
      parsed.sort((a, b) => (b.blockNumber > a.blockNumber ? -1 : 1));
      parsed.reverse();
      setActivities(parsed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch on-chain activity';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [smartWalletAddress, chainId, isDeployed]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return { activities, isLoading, error, refetch: fetchActivity };
}
