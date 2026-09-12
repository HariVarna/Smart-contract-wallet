'use client';

/**
 * @file apps/web/lib/wallet/context.tsx
 * Centralized React context for managing smart wallet state, owner connection, and chain selection.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Address } from '@scw/types';
import {
  SmartWalletABI,
  WalletFactoryABI,
  CONTRACT_DEPLOYMENTS,
  SUPPORTED_NETWORKS,
} from '@scw/contracts';
import { getPublicClient, requestInjectedAccounts } from '../blockchain/clients';
import { useWalletLabels } from '../../hooks/useWalletLabels';

export interface WalletContextState {
  ownerAddress: Address | null;
  smartWalletAddress: Address | null;
  deployedWallets: Address[];
  isDeployed: boolean;
  chainId: number;
  balance: bigint;
  ownerBalance: bigint;
  nonce: bigint;
  factoryAddress: Address | null;
  isLoading: boolean;
  error: string | null;
  connectInjected: () => Promise<void>;
  connectManual: (address: Address) => void;
  disconnect: () => void;
  selectSmartWallet: (address: Address) => void;
  switchNetwork: (chainId: number) => void;
  refresh: () => Promise<void>;
  labels: Record<string, string>;
  setLabel: (address: Address, label: string) => void;
  getLabel: (address: Address | null) => string;
}

const WalletContext = createContext<WalletContextState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [ownerAddress, setOwnerAddress] = useState<Address | null>(null);
  const [smartWalletAddress, setSmartWalletAddress] = useState<Address | null>(null);
  const [deployedWallets, setDeployedWallets] = useState<Address[]>([]);
  const [isDeployed, setIsDeployed] = useState<boolean>(false);
  const [chainId, setChainId] = useState<number>(31337);
  const [balance, setBalance] = useState<bigint>(0n);
  const [ownerBalance, setOwnerBalance] = useState<bigint>(0n);
  const [nonce, setNonce] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { labels, setLabel, getLabel } = useWalletLabels();

  const factoryAddress = CONTRACT_DEPLOYMENTS[chainId]?.walletFactory || null;

  // Refresh on-chain states
  const refresh = useCallback(async () => {
    if (!ownerAddress) {
      setBalance(0n);
      setOwnerBalance(0n);
      setNonce(0n);
      setIsDeployed(false);
      setDeployedWallets([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const publicClient = getPublicClient(chainId);

      // 1. Fetch Owner EOA balance
      const oBal = await publicClient.getBalance({ address: ownerAddress });
      setOwnerBalance(oBal);

      // 2. Query factory for created wallets if factory is configured
      let walletsList: Address[] = [];
      if (factoryAddress) {
        try {
          const result = await publicClient.readContract({
            address: factoryAddress,
            abi: WalletFactoryABI,
            functionName: 'getWallets',
            args: [ownerAddress],
          });
          walletsList = result as Address[];
          setDeployedWallets(walletsList);
        } catch {
          // Factory might not be deployed yet on this network
          walletsList = [];
          setDeployedWallets([]);
        }
      }

      // 3. Determine active smart wallet
      let activeWallet = smartWalletAddress;
      if (!activeWallet) {
        if (walletsList.length > 0 && walletsList[0]) {
          activeWallet = walletsList[0];
          setSmartWalletAddress(activeWallet);
        } else if (factoryAddress) {
          // Compute counterfactual wallet with salt = 0
          try {
            const predicted = (await publicClient.readContract({
              address: factoryAddress,
              abi: WalletFactoryABI,
              functionName: 'getAddress',
              args: [ownerAddress, 0n],
            })) as Address;
            activeWallet = predicted;
            setSmartWalletAddress(predicted);
          } catch {
            activeWallet = null;
          }
        }
      }

      // 4. If active smart wallet exists, check bytecode and balance
      if (activeWallet) {
        const bytecode = await publicClient.getBytecode({ address: activeWallet });
        const deployed = Boolean(bytecode && bytecode !== '0x');
        setIsDeployed(deployed);

        const wBal = await publicClient.getBalance({ address: activeWallet });
        setBalance(wBal);

        if (deployed) {
          try {
            const n = (await publicClient.readContract({
              address: activeWallet,
              abi: SmartWalletABI,
              functionName: 'getNonce',
            })) as bigint;
            setNonce(n);
          } catch {
            setNonce(0n);
          }
        } else {
          setNonce(0n);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to query blockchain state';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [ownerAddress, smartWalletAddress, chainId, factoryAddress]);

  // Connect via browser extension
  const connectInjected = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const accounts = await requestInjectedAccounts();
      if (accounts && accounts[0]) {
        setOwnerAddress(accounts[0]);
      } else {
        throw new Error('No accounts selected in browser wallet');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect manually (e.g. for testing with deterministic Anvil accounts)
  const connectManual = useCallback((address: Address) => {
    setOwnerAddress(address);
    setSmartWalletAddress(null);
  }, []);

  // Disconnect active session
  const disconnect = useCallback(() => {
    setOwnerAddress(null);
    setSmartWalletAddress(null);
    setDeployedWallets([]);
    setBalance(0n);
    setOwnerBalance(0n);
    setNonce(0n);
    setIsDeployed(false);
    setError(null);
  }, []);

  // Switch active smart wallet
  const selectSmartWallet = useCallback((address: Address) => {
    // Isolate state completely when switching
    setSmartWalletAddress(address);
    setBalance(0n);
    setNonce(0n);
    setIsDeployed(false);
  }, []);

  // Switch network
  const switchNetwork = useCallback((newChainId: number) => {
    if (SUPPORTED_NETWORKS[newChainId]) {
      setChainId(newChainId);
      setSmartWalletAddress(null);
    }
  }, []);

  // Trigger refresh whenever dependencies change
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <WalletContext.Provider
      value={{
        ownerAddress,
        smartWalletAddress,
        deployedWallets,
        isDeployed,
        chainId,
        balance,
        ownerBalance,
        nonce,
        factoryAddress,
        isLoading,
        error,
        connectInjected,
        connectManual,
        disconnect,
        selectSmartWallet,
        switchNetwork,
        refresh,
        labels,
        setLabel,
        getLabel,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextState {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
