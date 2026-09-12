import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRecipientAddress,
  validateTokenAddress,
  validateAmount,
  validateTransfer,
} from '../src/validation.ts';

describe('Validation Engine', () => {
  const validRecipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
  const zeroAddress = '0x0000000000000000000000000000000000000000';
  const invalidAddress = '0xinvalid';

  describe('validateRecipientAddress', () => {
    it('accepts valid ethereum address', () => {
      const res = validateRecipientAddress(validRecipient);
      assert.equal(res.isValid, true);
    });

    it('rejects zero address as recipient', () => {
      const res = validateRecipientAddress(zeroAddress);
      assert.equal(res.isValid, false);
      assert.match(res.error || '', /zero address/i);
    });

    it('rejects invalid address format', () => {
      const res = validateRecipientAddress(invalidAddress);
      assert.equal(res.isValid, false);
      assert.match(res.error || '', /invalid ethereum address/i);
    });

    it('rejects empty address', () => {
      const res = validateRecipientAddress('');
      assert.equal(res.isValid, false);
    });
  });

  describe('validateTokenAddress', () => {
    it('accepts valid ERC20 contract address', () => {
      const res = validateTokenAddress(validRecipient);
      assert.equal(res.isValid, true);
    });

    it('rejects zero address for ERC20 contract', () => {
      const res = validateTokenAddress(zeroAddress);
      assert.equal(res.isValid, false);
    });
  });

  describe('validateAmount', () => {
    it('validates positive numeric amounts', () => {
      const res = validateAmount('1.5', 18);
      assert.equal(res.isValid, true);
      assert.equal(res.parsedAmount, 1500000000000000000n);
    });

    it('rejects negative or zero amounts', () => {
      const zeroRes = validateAmount('0', 18);
      assert.equal(zeroRes.isValid, false);

      const negRes = validateAmount('-5', 18);
      assert.equal(negRes.isValid, false);
    });

    it('rejects non-numeric strings', () => {
      const res = validateAmount('abc', 18);
      assert.equal(res.isValid, false);
    });

    it('rejects amounts exceeding decimal precision', () => {
      const res = validateAmount('1.1234567', 6);
      assert.equal(res.isValid, false);
      assert.match(res.error || '', /exceeds token decimal precision/i);
    });
  });

  describe('validateTransfer', () => {
    it('passes for valid Native ETH transfer within balance', () => {
      const res = validateTransfer({
        recipient: validRecipient,
        amount: '1.0',
        decimals: 18,
        availableBalance: 2000000000000000000n, // 2 ETH
        isNative: true,
      });
      assert.equal(res.isValid, true);
    });

    it('fails when transfer amount exceeds available balance', () => {
      const res = validateTransfer({
        recipient: validRecipient,
        amount: '5.0',
        decimals: 18,
        availableBalance: 2000000000000000000n, // 2 ETH
        isNative: true,
      });
      assert.equal(res.isValid, false);
      assert.match(res.error || '', /insufficient balance/i);
    });

    it('fails when ERC20 token address is invalid', () => {
      const res = validateTransfer({
        recipient: validRecipient,
        amount: '10',
        decimals: 6,
        availableBalance: 100000000n,
        isNative: false,
        tokenAddress: zeroAddress,
      });
      assert.equal(res.isValid, false);
    });
  });
});
