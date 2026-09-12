'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  History,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { truncateAddress, formatEtherBalance } from '@scw/wallet-core';
import { useWallet } from '../../hooks/useWallet';

export function Sidebar() {
  const pathname = usePathname();
  const { smartWalletAddress, isDeployed, balance } = useWallet();

  const navItems = [
    { label: 'Dashboard', href: '/wallet', icon: LayoutDashboard },
    { label: 'Send Transaction', href: '/wallet/send', icon: ArrowUpRight },
    { label: 'Receive Assets', href: '/wallet/receive', icon: ArrowDownLeft },
    { label: 'Token Assets', href: '/wallet/assets', icon: Coins },
    { label: 'Activity & Logs', href: '/wallet/activity', icon: History },
    { label: 'Wallet Settings', href: '/wallet/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/40 p-4 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      {/* Navigation links */}
      <div className="space-y-6">
        {/* Active Smart Wallet Summary */}
        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/90 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Smart Account
            </span>
            {isDeployed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Deployed
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <AlertCircle className="w-3 h-3" /> Counterfactual
              </span>
            )}
          </div>
          <div className="text-xs font-mono text-slate-200 font-semibold truncate" title={smartWalletAddress || ''}>
            {smartWalletAddress ? truncateAddress(smartWalletAddress, 8, 6) : 'Not Generated'}
          </div>
          <div className="pt-1 text-xs text-slate-400 flex items-center justify-between border-t border-slate-800">
            <span>Balance:</span>
            <span className="font-semibold text-white font-mono">{formatEtherBalance(balance)} ETH</span>
          </div>
        </div>

        {/* Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Security Status Box */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Non-Custodial Enclave</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Private keys never leave client memory. Replay defended with monotonic nonces.
        </p>
      </div>
    </aside>
  );
}
