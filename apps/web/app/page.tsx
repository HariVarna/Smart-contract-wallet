import React from 'react';
import { ShieldCheck, Cpu, Database, Network, Terminal, CheckCircle2 } from 'lucide-react';
import { SUPPORTED_NETWORKS } from '@scw/contracts';

export default function HomePage() {
  const localNetwork = SUPPORTED_NETWORKS[31337];

  return (
    <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center">
      {/* Header Banner */}
      <div className="flex flex-col items-center text-center space-y-4 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs font-medium text-indigo-400 border border-indigo-500/20">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Phase 1 Architecture Initialized</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-indigo-300">
          Smart Contract Wallet
        </h1>
        <p className="max-w-2xl text-slate-400 text-sm sm:text-base leading-relaxed">
          Production-grade, non-custodial smart contract wallet architecture. Engineered with strict
          separation of concerns, checks-effects-interactions, and comprehensive threat modeling.
        </p>
      </div>

      {/* Grid: Architecture & Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card 1: Contracts Project */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Foundry Toolchain</h2>
          <p className="text-xs text-slate-400 mb-4">
            Solidity v0.8.28 with Cancun EVM target, OpenZeppelin v5, and sub-second Forge test runner.
          </p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Solidity ^0.8.28</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cancun EVM Target</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Forge & Anvil Orchestration</span>
            </div>
          </div>
        </div>

        {/* Card 2: Monorepo Packages */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4 border border-purple-500/20">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Decoupled Packages</h2>
          <p className="text-xs text-slate-400 mb-4">
            Strict boundaries separating contract ABIs, domain types, and framework-agnostic core logic.
          </p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>@scw/types</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>@scw/contracts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>@scw/wallet-core</span>
            </div>
          </div>
        </div>

        {/* Card 3: Security Principles */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4 border border-emerald-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Security Invariants</h2>
          <p className="text-xs text-slate-400 mb-4">
            Engineered with zero secret persistence, sanitized telemetry, and STRIDE threat mitigation.
          </p>
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Non-Custodial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Zero localStorage Keys</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>EIP-712 Replay Defense</span>
            </div>
          </div>
        </div>
      </div>

      {/* Network & Local Dev Status Bar */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 text-indigo-400 border border-slate-700/50">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Default Network:</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono border border-emerald-500/20">
                  {localNetwork?.name ?? 'Anvil Localnet'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Chain ID: <code className="font-mono text-indigo-300">{localNetwork?.chainId ?? 31337}</code> • RPC: <code className="font-mono text-indigo-300">{localNetwork?.rpcUrl ?? 'http://127.0.0.1:8545'}</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 font-mono">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>pnpm anvil</span>
          </div>
        </div>
      </div>
    </main>
  );
}
