'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Cpu,
  Key,
  Database,
  Radio,
} from 'lucide-react';
import { SUPPORTED_NETWORKS } from '@scw/contracts';
import { truncateAddress, formatEtherBalance } from '@scw/wallet-core';
import { useWallet } from '../../../hooks/useWallet';

export default function SettingsPage() {
  const {
    ownerAddress,
    smartWalletAddress,
    factoryAddress,
    chainId,
    isDeployed,
    nonce,
    ownerBalance,
  } = useWallet();

  const currentNetwork = SUPPORTED_NETWORKS[chainId];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">Configuration & Security</span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Wallet Settings</h1>
        <p className="text-xs text-slate-400">
          Inspect cryptographic keys, factory parameters, network nodes, and security invariants.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Authority Key Info */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Authorized Signer (EOA)</h2>
              <p className="text-[11px] text-slate-400">Owner key authorized to sign wallet executions</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Owner Address</span>
              <div className="font-mono text-slate-200 text-[11px] break-all select-all">{ownerAddress}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Owner EOA Gas Balance</span>
              <span className="font-mono text-white font-semibold">{formatEtherBalance(ownerBalance)} ETH</span>
            </div>
          </div>
        </div>

        {/* Section 2: Smart Contract Details */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Smart Account Parameters</h2>
              <p className="text-[11px] text-slate-400">On-chain contract instance attributes</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Smart Wallet Address</span>
              <div className="font-mono text-slate-200 text-[11px] break-all select-all">{smartWalletAddress}</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Current Transaction Nonce</span>
              <span className="font-mono text-white font-semibold">{nonce.toString()}</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Deployment Status</span>
              <span className={`font-semibold ${isDeployed ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isDeployed ? 'Active on Blockchain' : 'Counterfactual (Pre-deployment)'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Network & Factory Configuration */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Network & Factory Registry</h2>
              <p className="text-[11px] text-slate-400">Active RPC node and factory contracts</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Network Name</span>
              <span className="font-mono text-indigo-300 font-semibold">{currentNetwork?.name}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Chain ID</span>
              <span className="font-mono text-slate-200 font-semibold">{chainId}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Wallet Factory Address</span>
              <div className="font-mono text-slate-200 text-[11px] break-all">{factoryAddress || 'Unavailable'}</div>
            </div>
          </div>
        </div>

        {/* Section 4: Security Invariants Checklist */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Security & Cryptographic Audit</h2>
              <p className="text-[11px] text-slate-400">Non-custodial invariants verification</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300">No private keys in localStorage or server sinks</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300">EIP-712 structured hashing with chainid domain separators</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300">Monotonic nonce replay attack mitigation</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-300">Checks-Effects-Interactions (CEI) & Reentrancy Guards</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
