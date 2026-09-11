/**
 * @file packages/types/src/index.ts
 * Core domain types and interfaces for the Smart Contract Wallet system.
 */

export type Address = `0x${string}`;
export type Hex = `0x${string}`;
export type Hash = `0x${string}`;

/** Supported blockchain network configuration */
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  currencySymbol: string;
  blockExplorerUrl?: string;
  isTestnet: boolean;
}

/** Basic execution call payload */
export interface ExecutionCall {
  to: Address;
  value: bigint;
  data: Hex;
}

/** Signed wallet transaction request */
export interface WalletTransactionRequest {
  walletAddress: Address;
  calls: ExecutionCall[];
  nonce: bigint;
  deadline?: bigint;
  signature?: Hex;
}

/** Wallet state representation */
export type WalletState = 'UNINITIALIZED' | 'DEPLOYED' | 'LOCKED';

/** Execution result details */
export interface ExecutionResult {
  transactionHash: Hash;
  blockNumber: bigint;
  success: boolean;
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  returnData?: Hex[];
}

/** EIP-712 Domain Specification */
export interface EIP712Domain {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: Address;
}
