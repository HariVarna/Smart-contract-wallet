/**
 * @file packages/wallet-core/src/formatting.ts
 * Type-safe currency and token balance string formatters and BigInt parsers.
 */

/**
 * Validates standard Ethereum address format (0x + 40 hex chars).
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Checks if an address is the zero address (0x0000...0000).
 */
export function isZeroAddress(address: string): boolean {
  return /^0x0{40}$/i.test(address);
}

/**
 * Truncates an Ethereum address for safe UI presentation (e.g. 0x1234...abcd).
 */
export function truncateAddress(
  address: string | undefined | null,
  prefix: number = 6,
  suffix: number = 4,
): string {
  if (!address || !isValidEthereumAddress(address)) return '';
  if (address.length <= prefix + suffix) return address;
  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`;
}

/**
 * Formats a raw token balance (BigInt) to a human-readable decimal string.
 * @param raw - BigInt token balance in base units
 * @param decimals - Token decimal precision (e.g. 18 for ETH/DAI, 6 for USDC)
 * @param maxDisplayDecimals - Maximum decimal places to display (defaults to 4)
 */
export function formatTokenBalance(
  raw: bigint | undefined | null,
  decimals: number = 18,
  maxDisplayDecimals: number = 4,
): string {
  if (raw === undefined || raw === null || raw === 0n) {
    return `0.${'0'.repeat(Math.min(maxDisplayDecimals, 4))}`;
  }

  const negative = raw < 0n;
  const absVal = negative ? -raw : raw;
  const divisor = 10n ** BigInt(decimals);
  const whole = absVal / divisor;
  const frac = absVal % divisor;

  if (decimals === 0) {
    return `${negative ? '-' : ''}${whole.toString()}`;
  }

  const fracPadded = frac.toString().padStart(decimals, '0');
  const fracTrimmed = fracPadded.slice(0, maxDisplayDecimals);

  return `${negative ? '-' : ''}${whole.toString()}.${fracTrimmed}`;
}

/**
 * Parses a decimal token string into a BigInt base units value according to token decimals.
 * Prevents floating point inaccuracy.
 * @param amountStr - Human-readable decimal amount (e.g. "1.5")
 * @param decimals - Token decimal precision (e.g. 18 or 6)
 */
export function parseTokenUnits(amountStr: string, decimals: number = 18): bigint {
  if (!amountStr || amountStr.trim() === '') return 0n;
  const clean = amountStr.trim();

  // Validate format
  if (!/^\d+(\.\d+)?$/.test(clean)) {
    throw new Error(`Invalid numeric amount: "${amountStr}"`);
  }

  const [wholePart = '0', fracPart = ''] = clean.split('.');

  if (fracPart.length > decimals) {
    throw new Error(
      `Fractional component "${fracPart}" exceeds token decimal precision of ${decimals} decimals.`,
    );
  }

  const wholeBase = BigInt(wholePart) * 10n ** BigInt(decimals);
  const paddedFrac = fracPart.padEnd(decimals, '0');
  const fracBase = BigInt(paddedFrac);

  return wholeBase + fracBase;
}

/**
 * Convenience wrapper for 18-decimal Native ETH balance formatting.
 */
export function formatEtherBalance(wei: bigint | undefined | null, maxDecimals: number = 4): string {
  return formatTokenBalance(wei, 18, maxDecimals);
}

/**
 * Convenience wrapper for 18-decimal Native ETH string parsing.
 */
export function parseEther(etherString: string): bigint {
  return parseTokenUnits(etherString, 18);
}
