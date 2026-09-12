import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatEtherBalance,
  parseEther,
  formatTokenBalance,
  parseTokenUnits,
  truncateAddress,
  isValidEthereumAddress,
  isZeroAddress,
} from '../src/formatting.ts';

describe('Formatting & Address Utilities', () => {
  it('should validate standard Ethereum addresses', () => {
    assert.equal(isValidEthereumAddress('0x5fbdb2315678afecb367f032d93f642f64180aa3'), true);
    assert.equal(isValidEthereumAddress('0x0000000000000000000000000000000000000000'), true);
    assert.equal(isValidEthereumAddress('0xInvalidAddress'), false);
    assert.equal(isValidEthereumAddress(''), false);
    assert.equal(isValidEthereumAddress('5fbdb2315678afecb367f032d93f642f64180aa3'), false);
  });

  it('should detect zero address', () => {
    assert.equal(isZeroAddress('0x0000000000000000000000000000000000000000'), true);
    assert.equal(isZeroAddress('0x0000000000000000000000000000000000000001'), false);
    assert.equal(isZeroAddress('0x5fbdb2315678afecb367f032d93f642f64180aa3'), false);
  });

  it('should truncate addresses safely', () => {
    const addr = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
    assert.equal(truncateAddress(addr), '0x5fbd...0aa3');
    assert.equal(truncateAddress(''), '');
    assert.equal(truncateAddress(null), '');
  });

  it('should format 18-decimal ether balances correctly', () => {
    assert.equal(formatEtherBalance(0n), '0.0000');
    assert.equal(formatEtherBalance(1000000000000000000n), '1.0000');
    assert.equal(formatEtherBalance(1500000000000000000n), '1.5000');
    assert.equal(formatEtherBalance(1234567890000000000n, 2), '1.23');
    assert.equal(formatEtherBalance(undefined), '0.0000');
  });

  it('should format 6-decimal tokens (e.g. USDC) correctly', () => {
    assert.equal(formatTokenBalance(1000000n, 6), '1.0000');
    assert.equal(formatTokenBalance(25000000n, 6), '25.0000');
    assert.equal(formatTokenBalance(500000n, 6), '0.5000');
  });

  it('should parse ether strings to wei bigint', () => {
    assert.equal(parseEther('1'), 1000000000000000000n);
    assert.equal(parseEther('1.5'), 1500000000000000000n);
    assert.equal(parseEther('0.0001'), 100000000000000n);
    assert.equal(parseEther(''), 0n);
  });

  it('should parse 6-decimal token strings to base units', () => {
    assert.equal(parseTokenUnits('1', 6), 1000000n);
    assert.equal(parseTokenUnits('100.5', 6), 100500000n);
  });

  it('should reject numbers with excessive decimal places', () => {
    assert.throws(() => parseTokenUnits('1.1234567', 6), /exceeds token decimal precision/);
  });
});
