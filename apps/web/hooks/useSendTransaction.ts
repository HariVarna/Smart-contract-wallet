'use client';

/**
 * @file apps/web/hooks/useSendTransaction.ts
 * Manages comprehensive pre-flight validation, simulation, authorization, submission,
 * receipt confirmation, and explicit 7-stage lifecycle state machine for wallet transactions.
 */

import { useState, useCallback } from 'react';
import type {
  Address,
  Hash,
  Hex,
  TransactionState,
  TransactionReceiptSummary,
  TokenMetadata,
} from '@scw/types';
import { SmartWalletABI } from '@scw/contracts';
import {
  validateTransfer,
  encodeERC20Transfer,
  parseTokenUnits,
  parseEther,
  isValidEthereumAddress,
} from '@scw/wallet-core';
import { getPublicClient, getInjectedWalletClient, getChain } from '../lib/blockchain/clients';
import { waitForReceiptWithConfirmations } from '../lib/blockchain/tokenService';
import { useWallet } from './useWallet';

export interface TransferRequestParams {
  assetType: 'NATIVE' | 'ERC20';
  recipient: string;
  amount: string;
  token?: TokenMetadata;
  customCalldata?: string;
  availableBalance: bigint;
}

export interface SimulationDetails {
  success: boolean;
  estimatedGas: bigint;
  target: Address;
  value: bigint;
  data: Hex;
  returnData?: string;
  error?: string;
}

export function useSendTransaction() {
  const { smartWalletAddress, ownerAddress, chainId, isDeployed, refresh } = useWallet();
  const [state, setState] = useState<TransactionState>('idle');
  const [simulation, setSimulation] = useState<SimulationDetails | null>(null);
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [receipt, setReceipt] = useState<TransactionReceiptSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Pre-flight validation, gas estimation, and contract call simulation.
   */
  const prepareAndSimulate = useCallback(
    async (params: TransferRequestParams): Promise<SimulationDetails | null> => {
      if (!smartWalletAddress || !ownerAddress) {
        setState('failed');
        setErrorMessage('Wallet is not connected');
        return null;
      }

      if (!isDeployed) {
        setState('failed');
        setErrorMessage('Smart wallet contract is not yet deployed on-chain');
        return null;
      }

      setState('preparing');
      setErrorMessage(null);
      setSimulation(null);

      // 1. Run Pure Validation Engine
      const decimals = params.assetType === 'NATIVE' ? 18 : params.token?.decimals ?? 18;
      const validation = validateTransfer({
        recipient: params.recipient,
        amount: params.amount,
        decimals,
        availableBalance: params.availableBalance,
        isNative: params.assetType === 'NATIVE',
        tokenAddress: params.token?.address,
      });

      if (!validation.isValid) {
        setState('failed');
        setErrorMessage(validation.error || 'Invalid transfer parameters');
        return null;
      }

      try {
        const publicClient = getPublicClient(chainId);
        let targetAddress: Address;
        let transferValue: bigint = 0n;
        let callData: Hex = '0x';

        if (params.assetType === 'NATIVE') {
          targetAddress = params.recipient.trim() as Address;
          transferValue = parseEther(params.amount);
          callData = (params.customCalldata?.trim() || '0x') as Hex;
        } else {
          // ERC-20 Transfer
          if (!params.token) {
            throw new Error('Token metadata missing for ERC-20 transfer');
          }
          targetAddress = params.token.address;
          transferValue = 0n;
          const parsedTokens = parseTokenUnits(params.amount, params.token.decimals);
          callData = encodeERC20Transfer(params.recipient.trim() as Address, parsedTokens);
        }

        // 2. Perform eth_call simulation
        const { result, request } = await publicClient.simulateContract({
          address: smartWalletAddress,
          abi: SmartWalletABI,
          functionName: 'execute',
          args: [targetAddress, transferValue, callData],
          account: ownerAddress,
        });

        const simResult: SimulationDetails = {
          success: true,
          estimatedGas: request.gas || 150000n,
          target: targetAddress,
          value: transferValue,
          data: callData,
          returnData: result as string,
        };

        setSimulation(simResult);
        setState('awaiting_authorization');
        return simResult;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Transaction simulation reverted';
        const simResult: SimulationDetails = {
          success: false,
          estimatedGas: 0n,
          target: params.recipient as Address,
          value: 0n,
          data: '0x',
          error: msg,
        };
        setSimulation(simResult);
        setErrorMessage(msg);
        setState('failed');
        return null;
      }
    },
    [smartWalletAddress, ownerAddress, chainId, isDeployed],
  );

  /**
   * Dispatches the transaction to the network, collects hash, and waits for confirmation.
   */
  const executeTransfer = useCallback(async (): Promise<TransactionReceiptSummary | null> => {
    if (!simulation || !simulation.success) {
      setState('failed');
      setErrorMessage('Cannot execute: transaction has not been prepared or simulated.');
      return null;
    }

    if (!smartWalletAddress || !ownerAddress) {
      setState('failed');
      setErrorMessage('Wallet is not connected');
      return null;
    }

    setState('submitted');
    setErrorMessage(null);

    try {
      const walletClient = getInjectedWalletClient(chainId);
      if (!walletClient) {
        throw new Error('No browser wallet provider found. Please connect an authorized wallet.');
      }

      const publicClient = getPublicClient(chainId);

      // Sign and broadcast on-chain
      const hash = await walletClient.writeContract({
        chain: getChain(chainId),
        address: smartWalletAddress,
        abi: SmartWalletABI,
        functionName: 'execute',
        args: [simulation.target, simulation.value, simulation.data],
        account: ownerAddress,
      });

      setTxHash(hash);
      setState('confirming');

      // Wait for 1 confirmation and get receipt
      const confirmedReceipt = await waitForReceiptWithConfirmations(publicClient, hash, 1);
      setReceipt(confirmedReceipt);

      if (confirmedReceipt.status === 'reverted') {
        setState('failed');
        setErrorMessage('Transaction was included in a block but reverted on-chain.');
        return confirmedReceipt;
      }

      setState('confirmed');
      await refresh();
      return confirmedReceipt;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction submission or execution failed';
      setErrorMessage(msg);
      setState('failed');
      return null;
    }
  }, [simulation, smartWalletAddress, ownerAddress, chainId, refresh]);

  /**
   * Resets the transaction workflow back to idle state.
   */
  const reset = useCallback(() => {
    setState('idle');
    setSimulation(null);
    setTxHash(null);
    setReceipt(null);
    setErrorMessage(null);
  }, []);

  return {
    state,
    simulation,
    txHash,
    receipt,
    errorMessage,
    prepareAndSimulate,
    executeTransfer,
    reset,
  };
}
