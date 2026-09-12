/**
 * @file packages/wallet-core/src/validation.ts
 * Pure validation engine for recipient addresses, transfer amounts, tokens, and balances.
 */

import type { Address, TransferValidationResult } from '@scw/types';
import { isValidEthereumAddress, isZeroAddress, parseTokenUnits } from './formatting.ts';

export interface ValidateTransferParams {
  recipient: string;
  amount: string;
  decimals: number;
  availableBalance: bigint;
  isNative?: boolean;
  tokenAddress?: string;
  gasAvailable?: bigint;
}

/**
 * Validates a recipient destination address.
 */
export function validateRecipientAddress(recipient: string): TransferValidationResult {
  if (!recipient || recipient.trim() === '') {
    return { isValid: false, error: 'Recipient address is required' };
  }

  const clean = recipient.trim();
  if (!isValidEthereumAddress(clean)) {
    return { isValid: false, error: 'Invalid Ethereum address format (must be 0x followed by 40 hex chars)' };
  }

  if (isZeroAddress(clean)) {
    return { isValid: false, error: 'Transfer to the zero address (0x000...000) is prohibited' };
  }

  return { isValid: true };
}

/**
 * Validates an ERC-20 token contract address.
 */
export function validateTokenAddress(tokenAddress: string | undefined): TransferValidationResult {
  if (!tokenAddress || tokenAddress.trim() === '') {
    return { isValid: false, error: 'Token address is required for ERC-20 transfers' };
  }

  const clean = tokenAddress.trim();
  if (!isValidEthereumAddress(clean)) {
    return { isValid: false, error: 'Invalid ERC-20 token contract address format' };
  }

  if (isZeroAddress(clean)) {
    return { isValid: false, error: 'Token address cannot be the zero address' };
  }

  return { isValid: true };
}

/**
 * Validates numeric amount string against token precision limits.
 */
export function validateAmount(
  amountStr: string,
  decimals: number,
): { isValid: boolean; parsedAmount?: bigint; error?: string } {
  if (!amountStr || amountStr.trim() === '') {
    return { isValid: false, error: 'Transfer amount is required' };
  }

  const clean = amountStr.trim();

  if (!/^\d+(\.\d+)?$/.test(clean)) {
    return { isValid: false, error: 'Amount must be a valid positive number' };
  }

  try {
    const parsed = parseTokenUnits(clean, decimals);
    if (parsed <= 0n) {
      return { isValid: false, error: 'Amount must be greater than zero' };
    }
    return { isValid: true, parsedAmount: parsed };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid amount';
    return { isValid: false, error: msg };
  }
}

/**
 * Comprehensive pre-flight transfer validator.
 */
export function validateTransfer(params: ValidateTransferParams): TransferValidationResult {
  // 1. Recipient Address Validation
  const recipientCheck = validateRecipientAddress(params.recipient);
  if (!recipientCheck.isValid) {
    return recipientCheck;
  }

  // 2. Token Address Validation (if ERC-20)
  if (!params.isNative) {
    const tokenCheck = validateTokenAddress(params.tokenAddress);
    if (!tokenCheck.isValid) {
      return tokenCheck;
    }
  }

  // 3. Amount Validation
  const amountCheck = validateAmount(params.amount, params.decimals);
  if (!amountCheck.isValid || amountCheck.parsedAmount === undefined) {
    return { isValid: false, error: amountCheck.error || 'Invalid amount' };
  }

  const parsedAmount = amountCheck.parsedAmount;

  // 4. Balance Sufficiency Check
  if (parsedAmount > params.availableBalance) {
    return {
      isValid: false,
      error: `Insufficient balance: requested ${params.amount}, but wallet only holds ${params.availableBalance.toString()} base units`,
    };
  }

  return { isValid: true };
}
