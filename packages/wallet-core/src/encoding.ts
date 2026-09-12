/**
 * @file packages/wallet-core/src/encoding.ts
 * Standard calldata encoders and decoders for ERC-20 and SmartWallet interactions.
 */

import { encodeFunctionData, decodeFunctionData } from 'viem';
import { ERC20ABI, SmartWalletABI } from '../../contracts/src/index.ts';
import type { Address, Hex } from '@scw/types';

/**
 * Encodes standard ERC-20 transfer(address to, uint256 amount) calldata.
 */
export function encodeERC20Transfer(recipient: Address, amount: bigint): Hex {
  return encodeFunctionData({
    abi: ERC20ABI,
    functionName: 'transfer',
    args: [recipient, amount],
  });
}

/**
 * Decodes calldata to check if it represents an ERC-20 transfer(to, amount) call.
 * Returns null if the calldata does not match the ERC-20 transfer signature.
 */
export function decodeERC20Transfer(
  calldata: Hex,
): { recipient: Address; amount: bigint } | null {
  if (!calldata || calldata === '0x' || calldata.length < 10) {
    return null;
  }

  try {
    const decoded = decodeFunctionData({
      abi: ERC20ABI,
      data: calldata,
    });

    if (decoded.functionName === 'transfer' && decoded.args) {
      const [to, amount] = decoded.args as [Address, bigint];
      return { recipient: to, amount };
    }
  } catch {
    // Not an ERC-20 transfer call
  }

  return null;
}

/**
 * Encodes SmartWallet.execute(address target, uint256 value, bytes data) calldata.
 */
export function encodeSmartWalletExecute(
  target: Address,
  value: bigint,
  data: Hex = '0x',
): Hex {
  return encodeFunctionData({
    abi: SmartWalletABI,
    functionName: 'execute',
    args: [target, value, data],
  });
}
