'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Cpu,
  Database,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Zap,
} from 'lucide-react';
import { truncateAddress } from '@scw/wallet-core';
import { useWallet } from '../hooks/useWallet';

export default function HomePage() {
  const { ownerAddress } = useWallet();

  return (
    <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
      {/* Header Banner */}
      <div className="flex flex-col items-center text-center space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel text-xs font-medium text-indigo-400 border border-indigo-500/20">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Non-Custodial Account Abstraction</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
          Smart Contract Wallet
        </h1>
        <p className="max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed">
          Production-grade, non-custodial smart contract wallet architecture on Ethereum. Powered by
          EIP-712 cryptographic signatures, deterministic CREATE2 factory deployments, and monotonic replay defense.
        </p>

        {/* CTA Buttons */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          {ownerAddress ? (
            <Link
              href="/wallet"
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all duration-200"
            >
              <span>Open Wallet Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href="/onboarding"
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-xl shadow-indigo-600/30 transition-all duration-200"
            >
              <span>Connect Signing Authority</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}

          <Link
            href="/onboarding/create"
            className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-all duration-200"
          >
            <span>Deploy via Factory</span>
          </Link>
        </div>
      </div>

      {/* Grid: Architecture & Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1 */}
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">Smart Contract Accounts</h2>
          <p className="text-xs text-slate-400">
            Every wallet account is a smart contract executing calls with custom signature verification and monotonic nonces.
          </p>
          <div className="pt-2 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Direct Owner & EIP-712 Execution</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ReentrancyGuards & CEI</span>
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">Wallet Factory (CREATE2)</h2>
          <p className="text-xs text-slate-400">
            Deterministic address calculation allowing counterfactual pre-funding before on-chain deployment.
          </p>
          <div className="pt-2 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Salt-based Multi-Account Creation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>On-Chain Wallet Registry</span>
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-white">Non-Custodial Security</h2>
          <p className="text-xs text-slate-400">
            Zero secret storage, simulated transaction previews, and strict caller validation.
          </p>
          <div className="pt-2 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero localStorage Secrets</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simulation (eth_call) Previews</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
