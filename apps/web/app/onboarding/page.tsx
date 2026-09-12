'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Wallet, Terminal, ArrowRight, AlertCircle } from 'lucide-react';
import type { Address } from '@scw/types';
import { isValidEthereumAddress } from '@scw/wallet-core';
import { useWallet } from '../../hooks/useWallet';

// Standard well-known Anvil deterministic test accounts for local development
const ANVIL_TEST_ACCOUNTS: { name: string; address: Address }[] = [
  { name: 'Anvil Account #0', address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' },
  { name: 'Anvil Account #1', address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' },
  { name: 'Anvil Account #2', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { connectInjected, connectManual, ownerAddress, isLoading, error } = useWallet();
  const [manualAddress, setManualAddress] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // If already connected, offer redirect to wallet
  React.useEffect(() => {
    if (ownerAddress) {
      router.push('/wallet');
    }
  }, [ownerAddress, router]);

  const handleManualConnect = (addr: string) => {
    if (!isValidEthereumAddress(addr)) {
      setInputError('Please enter a valid Ethereum address (0x...)');
      return;
    }
    setInputError(null);
    connectManual(addr as Address);
    router.push('/wallet');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 flex-1 flex flex-col justify-center">
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel text-xs text-indigo-400 border border-indigo-500/20">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Non-Custodial Account Setup</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Connect Signing Authority
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Your smart contract wallet account is controlled by an authorized key. Select your signing method to continue.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Option 1: Browser Injected Wallet */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all duration-200">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Browser Wallet (Injected)</h2>
                <p className="text-xs text-slate-400">Connect via MetaMask, Coinbase Wallet, or browser extension.</p>
              </div>
            </div>
          </div>
          <button
            onClick={connectInjected}
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all duration-200 disabled:opacity-50"
          >
            <span>{isLoading ? 'Connecting...' : 'Connect Browser Wallet'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Option 2: Anvil Local Test Accounts */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Local Development Accounts (Anvil)</h2>
              <p className="text-xs text-slate-400">Select a deterministic local test account for instant testing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ANVIL_TEST_ACCOUNTS.map((acc) => (
              <button
                key={acc.address}
                onClick={() => handleManualConnect(acc.address)}
                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 text-left transition-all group"
              >
                <div className="text-[11px] font-semibold text-white group-hover:text-indigo-300">{acc.name}</div>
                <div className="text-[10px] font-mono text-slate-400 truncate">{acc.address}</div>
              </button>
            ))}
          </div>

          {/* Manual Address Input */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <label className="text-[11px] font-medium text-slate-400">Or enter custom owner address:</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="0x..."
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value.trim())}
                className="flex-1 bg-slate-900/90 text-white text-xs px-3.5 py-2 rounded-xl border border-slate-700/60 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => handleManualConnect(manualAddress)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Connect
              </button>
            </div>
            {inputError && <p className="text-[11px] text-rose-400">{inputError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
