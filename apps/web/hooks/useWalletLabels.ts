'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Address } from '@scw/types';

/**
 * Custom hook for managing local labels/aliases for Smart Contract Wallets.
 */
export function useWalletLabels() {
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load labels from local storage on mount
    try {
      const stored = localStorage.getItem('scw-wallet-labels');
      if (stored) {
        setLabels(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse wallet labels from local storage', e);
    }
  }, []);

  const setLabel = useCallback((address: Address, label: string) => {
    setLabels((prev) => {
      const updated = { ...prev, [address.toLowerCase()]: label };
      try {
        localStorage.setItem('scw-wallet-labels', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save wallet labels to local storage', e);
      }
      return updated;
    });
  }, []);

  const getLabel = useCallback(
    (address: Address | null) => {
      if (!address) return '';
      return labels[address.toLowerCase()] || '';
    },
    [labels]
  );

  return { labels, setLabel, getLabel };
}
