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

/** Standard ERC-20 Token Metadata */
export interface TokenMetadata {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
}

/** Asset balance tracking item (Native ETH or ERC-20 token) */
export interface AssetBalance {
  token?: TokenMetadata; // undefined indicates Native ETH
  isNative: boolean;
  balance: bigint;
  formattedBalance: string;
}

/** Explicit Transaction Lifecycle States */
export type TransactionState =
  | 'idle'
  | 'preparing'
  | 'awaiting_authorization'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'failed';

/** Pre-flight transfer validation response */
export interface TransferValidationResult {
  isValid: boolean;
  error?: string;
}

/** Parsed transaction receipt summary */
export interface TransactionReceiptSummary {
  transactionHash: Hash;
  blockNumber: bigint;
  blockHash: Hash;
  status: 'success' | 'reverted';
  gasUsed: bigint;
  effectiveGasPrice: bigint;
  confirmations: bigint;
}

/** Unified asset transfer parameter object */
export interface AssetTransferParams {
  assetType: 'NATIVE' | 'ERC20';
  tokenAddress?: Address;
  recipient: Address;
  amount: bigint;
  calldata?: Hex;
}

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
