import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encodeERC20Transfer, decodeERC20Transfer, encodeSmartWalletExecute } from '../src/encoding.ts';
import type { Address } from '@scw/types';

describe('Calldata Encoding & Decoding', () => {
  const recipient: Address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const amount = 1000000n; // 1 USDC

  it('should encode ERC-20 transfer calldata with 0xa9059cbb selector', () => {
    const encoded = encodeERC20Transfer(recipient, amount);
    assert.ok(encoded.startsWith('0xa9059cbb'));
  });

  it('should decode ERC-20 transfer calldata accurately', () => {
    const encoded = encodeERC20Transfer(recipient, amount);
    const decoded = decodeERC20Transfer(encoded);
    assert.ok(decoded);
    assert.equal(decoded.recipient.toLowerCase(), recipient.toLowerCase());
    assert.equal(decoded.amount, amount);
  });

  it('should return null when decoding invalid or non-ERC20 calldata', () => {
    assert.equal(decodeERC20Transfer('0x'), null);
    assert.equal(decodeERC20Transfer('0x12345678'), null);
  });

  it('should encode SmartWallet.execute calldata with 0xb61d27f6 selector', () => {
    const encoded = encodeSmartWalletExecute(recipient, 1000n, '0x');
    assert.ok(encoded.startsWith('0xb61d27f6'));
  });
});
