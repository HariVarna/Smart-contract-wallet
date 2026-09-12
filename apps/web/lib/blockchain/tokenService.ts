/**
 * @file apps/web/lib/blockchain/tokenService.ts
 * Type-safe service functions for querying token metadata, checking balances, estimating gas, and verifying receipts.
 */

import type { PublicClient } from 'viem';
import { ERC20ABI, SmartWalletABI } from '@scw/contracts';
import type { Address, Hash, TokenMetadata, TransactionReceiptSummary } from '@scw/types';
import { encodeERC20Transfer } from '@scw/wallet-core';

/**
 * Fetches standard ERC-20 token metadata (name, symbol, decimals).
 */
export async function fetchTokenMetadata(
  publicClient: PublicClient,
  tokenAddress: Address,
): Promise<TokenMetadata> {
  // First verify if bytecode exists at address
  const bytecode = await publicClient.getBytecode({ address: tokenAddress });
  if (!bytecode || bytecode === '0x') {
    throw new Error(`Address ${tokenAddress} is not a contract on this network.`);
  }

  try {
    const [name, symbol, decimals] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'name',
      }) as Promise<string>,
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'symbol',
      }) as Promise<string>,
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'decimals',
      }) as Promise<number>,
    ]);

    return {
      address: tokenAddress,
      name: String(name),
      symbol: String(symbol),
      decimals: Number(decimals),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Contract does not implement standard ERC-20 metadata';
    throw new Error(`Failed to load token metadata: ${msg}`);
  }
}

/**
 * Queries ERC-20 balanceOf for a given account.
 */
export async function fetchTokenBalance(
  publicClient: PublicClient,
  tokenAddress: Address,
  accountAddress: Address,
): Promise<bigint> {
  try {
    const balance = (await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20ABI,
      functionName: 'balanceOf',
      args: [accountAddress],
    })) as bigint;

    return balance;
  } catch {
    return 0n;
  }
}

/**
 * Queries Native ETH balance for a given account.
 */
export async function fetchNativeBalance(
  publicClient: PublicClient,
  accountAddress: Address,
): Promise<bigint> {
  try {
    return await publicClient.getBalance({ address: accountAddress });
  } catch {
    return 0n;
  }
}

/**
 * Simulates and estimates gas for SmartWallet execution.
 */
export async function simulateSmartWalletExecution(
  publicClient: PublicClient,
  params: {
    walletAddress: Address;
    ownerAddress: Address;
    target: Address;
    value: bigint;
    data: `0x${string}`;
  },
): Promise<{ success: boolean; estimatedGas: bigint; returnData?: string }> {
  const { result, request } = await publicClient.simulateContract({
    address: params.walletAddress,
    abi: SmartWalletABI,
    functionName: 'execute',
    args: [params.target, params.value, params.data],
    account: params.ownerAddress,
  });

  return {
    success: true,
    estimatedGas: request.gas || 150000n,
    returnData: result as string,
  };
}

/**
 * Polls for transaction receipt and tracks block confirmations.
 */
export async function waitForReceiptWithConfirmations(
  publicClient: PublicClient,
  txHash: Hash,
  targetConfirmations: number = 1,
): Promise<TransactionReceiptSummary> {
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: targetConfirmations,
  });

  const currentBlock = await publicClient.getBlockNumber();
  const confirmations = currentBlock >= receipt.blockNumber ? currentBlock - receipt.blockNumber + 1n : 1n;

  return {
    transactionHash: receipt.transactionHash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    status: receipt.status === 'success' ? 'success' : 'reverted',
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.effectiveGasPrice,
    confirmations,
  };
}
