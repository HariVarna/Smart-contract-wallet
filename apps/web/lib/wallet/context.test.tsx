import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletProvider, useWallet } from './context';
import type { Address } from '@scw/types';

// Mock Blockchain Clients
vi.mock('../blockchain/clients', () => ({
  getPublicClient: vi.fn(() => ({
    getBalance: vi.fn(async ({ address }) => {
      if (address === '0xOwner') return 100n;
      if (address === '0xWallet1') return 50n;
      if (address === '0xWallet2') return 10n;
      return 0n;
    }),
    readContract: vi.fn(async ({ functionName, address, args }) => {
      if (functionName === 'getWallets') {
        return ['0xWallet1', '0xWallet2'];
      }
      if (functionName === 'getAddress') {
        return '0xWallet1';
      }
      if (functionName === 'getNonce') {
        if (address === '0xWallet1') return 5n;
        if (address === '0xWallet2') return 2n;
      }
      return 0n;
    }),
    getBytecode: vi.fn(async ({ address }) => {
      if (address === '0xWallet1' || address === '0xWallet2') return '0x1234'; // Deployed
      return '0x';
    })
  })),
  requestInjectedAccounts: vi.fn(async () => ['0xOwner']),
}));

describe('WalletContext State Isolation & Switching', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WalletProvider>{children}</WalletProvider>
  );

  it('should initialize empty state', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.smartWalletAddress).toBeNull();
    expect(result.current.balance).toBe(0n);
  });

  it('should load initial wallet data when owner connects', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    
    await act(async () => {
      await result.current.connectInjected();
    });

    // Wait for refresh to complete
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.ownerAddress).toBe('0xOwner');
    expect(result.current.deployedWallets).toEqual(['0xWallet1', '0xWallet2']);
    
    // Auto-selects first wallet
    expect(result.current.smartWalletAddress).toBe('0xWallet1');
    expect(result.current.balance).toBe(50n); // Wallet1 balance
    expect(result.current.nonce).toBe(5n);    // Wallet1 nonce
  });

  it('should rigidly isolate state when switching wallets', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    
    await act(async () => {
      await result.current.connectInjected();
    });
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    // Initially Wallet1
    expect(result.current.smartWalletAddress).toBe('0xWallet1');
    expect(result.current.balance).toBe(50n);

    // Switch to Wallet2
    act(() => {
      result.current.selectSmartWallet('0xWallet2' as Address);
    });

    // IMMEDIATELY on switch, state must be isolated/cleared before refresh completes
    expect(result.current.smartWalletAddress).toBe('0xWallet2');
    expect(result.current.balance).toBe(0n);
    expect(result.current.nonce).toBe(0n);
    expect(result.current.isDeployed).toBe(false);

    // After refresh completes for the new wallet
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });

    expect(result.current.balance).toBe(10n); // Wallet2 balance
    expect(result.current.nonce).toBe(2n);    // Wallet2 nonce
    expect(result.current.isDeployed).toBe(true);
  });

  it('should persist and retrieve labels accurately per address', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    
    act(() => {
      result.current.setLabel('0xWallet1' as Address, 'Main Trading');
      result.current.setLabel('0xWallet2' as Address, 'Savings');
    });

    expect(result.current.getLabel('0xWallet1' as Address)).toBe('Main Trading');
    expect(result.current.getLabel('0xWallet2' as Address)).toBe('Savings');
    
    // Case insensitivity check (simulating internal structure)
    const rawStorage = JSON.parse(localStorage.getItem('scw-wallet-labels') || '{}');
    expect(rawStorage['0xwallet1']).toBe('Main Trading');
  });
});
