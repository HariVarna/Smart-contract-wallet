import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSimulateTransaction } from './useSimulateTransaction';
import { WalletProvider } from '../lib/wallet/context';

const mockEstimateGas = vi.fn();
const mockCall = vi.fn();

vi.mock('../lib/blockchain/clients', () => ({
  getPublicClient: vi.fn(() => ({
    estimateGas: mockEstimateGas,
    call: mockCall,
  })),
}));

// Mock the wallet context hook
vi.mock('./useWallet', () => ({
  useWallet: vi.fn(() => ({
    smartWalletAddress: '0xWallet1',
    chainId: 31337,
  })),
}));

describe('useSimulateTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully simulate a standard transaction', async () => {
    mockEstimateGas.mockResolvedValue(21000n);
    mockCall.mockResolvedValue('0x');

    const { result } = renderHook(() => useSimulateTransaction());

    let simulationResult;
    await act(async () => {
      simulationResult = await result.current.simulate('0xTarget', 0n, '0x');
    });

    expect(simulationResult.success).toBe(true);
    expect(simulationResult.estimatedGas).toBe(21000n);
    expect(simulationResult.warning).toBeUndefined();
  });

  it('should generate a security warning for ERC20 approve calldata', async () => {
    mockEstimateGas.mockResolvedValue(45000n);
    mockCall.mockResolvedValue('0x');

    const { result } = renderHook(() => useSimulateTransaction());

    // 0x095ea7b3 is approve(address,uint256)
    let simulationResult;
    await act(async () => {
      simulationResult = await result.current.simulate('0xTarget', 0n, '0x095ea7b3000000000000000000000000123');
    });

    expect(simulationResult.success).toBe(true);
    expect(simulationResult.warning).toContain('Token Approval Warning');
  });

  it('should return failure if simulation reverts', async () => {
    mockEstimateGas.mockRejectedValue(new Error('Execution Reverted'));

    const { result } = renderHook(() => useSimulateTransaction());

    let simulationResult;
    await act(async () => {
      simulationResult = await result.current.simulate('0xTarget', 0n, '0x1234');
    });

    expect(simulationResult.success).toBe(false);
    expect(simulationResult.error).toBe('Execution Reverted');
  });
});
