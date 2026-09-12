'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, RefreshCw, Power, ChevronDown, Radio } from 'lucide-react';
import { SUPPORTED_NETWORKS } from '@scw/contracts';
import { truncateAddress } from '@scw/wallet-core';
import { useWallet } from '../../hooks/useWallet';

export function Navbar() {
  const { ownerAddress, chainId, switchNetwork, disconnect, refresh, isLoading } = useWallet();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Smart Contract Wallet</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-normal">
                v0.1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Non-Custodial Account Abstraction</p>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Network Selector */}
          <div className="relative inline-block">
            <select
              value={chainId}
              onChange={(e) => switchNetwork(Number(e.target.value))}
              className="appearance-none bg-slate-900/90 text-slate-200 text-xs font-medium pl-8 pr-8 py-2 rounded-xl border border-slate-700/60 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {Object.values(SUPPORTED_NETWORKS).map((net) => (
                <option key={net.chainId} value={net.chainId}>
                  {net.name} ({net.chainId})
                </option>
              ))}
            </select>
            <Radio className="w-3.5 h-3.5 text-emerald-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Action */}
          <button
            onClick={() => refresh()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900/90 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-50"
            title="Refresh on-chain state"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* Connected Owner Status */}
          {ownerAddress ? (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/60 pl-3 pr-1.5 py-1.5 rounded-xl">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">Owner Authority</span>
                <span className="text-xs font-mono text-slate-200 font-semibold">{truncateAddress(ownerAddress)}</span>
              </div>
              <button
                onClick={disconnect}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                title="Disconnect authority"
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/onboarding"
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200"
            >
              Connect Signer
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
