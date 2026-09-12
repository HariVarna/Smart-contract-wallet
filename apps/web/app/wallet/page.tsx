'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Coins,
  History,
} from 'lucide-react';
import { truncateAddress, formatEtherBalance } from '@scw/wallet-core';
import { useWallet } from '../../hooks/useWallet';
import { useActivity } from '../../hooks/useActivity';

export default function WalletDashboardPage() {
  const {
    smartWalletAddress,
    ownerAddress,
    balance,
    nonce,
    isDeployed,
    deployedWallets,
    selectSmartWallet,
    chainId,
  } = useWallet();
  const { activities, isLoading: activityLoading } = useActivity();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (smartWalletAddress) {
      navigator.clipboard.writeText(smartWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner if Counterfactual */}
      {!isDeployed && smartWalletAddress && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Counterfactual Smart Account</h2>
              <p className="text-xs text-slate-400">
                This smart wallet address is deterministically computed via CREATE2. You can deposit funds now, or deploy it on-chain.
              </p>
            </div>
          </div>
          <Link
            href="/onboarding/create"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-semibold text-xs whitespace-nowrap shadow-lg shadow-amber-500/20 hover:opacity-95 transition-opacity"
          >
            Deploy Contract Now
          </Link>
        </div>
      )}

      {/* Main Account Balance Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Smart Account Balance
              </span>
              {isDeployed ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <CheckCircle2 className="w-3 h-3" /> Active On-Chain
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  <AlertCircle className="w-3 h-3" /> Pre-Deployment
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-black text-white font-mono tracking-tight">
                {formatEtherBalance(balance)}
              </span>
              <span className="text-lg sm:text-xl font-bold text-indigo-400 font-mono">ETH</span>
            </div>

            {/* Smart Wallet Address Row */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-mono text-slate-300 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 truncate max-w-xs sm:max-w-md">
                {smartWalletAddress || 'No account generated'}
              </span>
              <button
                onClick={handleCopy}
                disabled={!smartWalletAddress}
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3">
            <Link
              href="/wallet/send"
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all duration-200"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Send</span>
            </Link>
            <Link
              href="/wallet/receive"
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700/60 transition-all duration-200"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Receive</span>
            </Link>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block text-[11px]">Transaction Nonce</span>
            <span className="font-mono text-slate-200 font-semibold">{nonce.toString()}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Signing Authority</span>
            <span className="font-mono text-slate-200 font-semibold">{truncateAddress(ownerAddress)}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Network</span>
            <span className="text-indigo-400 font-semibold font-mono">Chain ID: {chainId}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Factory Accounts</span>
            <span className="font-mono text-slate-200 font-semibold">{deployedWallets.length} Wallets</span>
          </div>
        </div>
      </div>

      {/* Multiple Accounts Switcher (if user has deployed multiple) */}
      {deployedWallets.length > 1 && (
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Switch Smart Account
            </h3>
            <Link href="/onboarding/create" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Deploy Another
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {deployedWallets.map((wAddr, idx) => {
              const isSelected = wAddr.toLowerCase() === smartWalletAddress?.toLowerCase();
              return (
                <button
                  key={wAddr}
                  onClick={() => selectSmartWallet(wAddr)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold">Account #{idx + 1}</div>
                  <div className="text-[10px] font-mono truncate">{wAddr}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid: Assets & Recent Activity Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Asset Breakdown */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Assets Breakdown</h3>
            </div>
            <Link href="/wallet/assets" className="text-xs text-indigo-400 hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-2">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold font-mono text-xs border border-indigo-500/20">
                  ETH
                </div>
                <div>
                  <div className="text-xs font-semibold text-white">Ethereum</div>
                  <div className="text-[10px] text-slate-400">Native Currency</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-white font-mono">{formatEtherBalance(balance)} ETH</div>
                <div className="text-[10px] text-emerald-400">Available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Recent Activity Preview */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
            </div>
            <Link href="/wallet/activity" className="text-xs text-indigo-400 hover:underline">
              View History
            </Link>
          </div>

          {activityLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">Scanning blockchain logs...</div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs text-slate-400">No transactions recorded yet.</p>
              <p className="text-[11px] text-slate-500">Inbound deposits and executions will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.slice(0, 3).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        act.type === 'INCOMING_ETH'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}
                    >
                      {act.type === 'INCOMING_ETH' ? (
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-white">
                        {act.type === 'INCOMING_ETH' ? 'Received ETH' : 'Executed Transaction'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {truncateAddress(act.targetOrSender)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-semibold text-white">{formatEtherBalance(act.value)} ETH</div>
                    <div className="text-[10px] text-slate-400 font-mono">Block #{act.blockNumber.toString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
