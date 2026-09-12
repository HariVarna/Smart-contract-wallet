'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { truncateAddress } from '@scw/wallet-core';
import { useWallet } from '../../../hooks/useWallet';

export default function ReceiveAssetsPage() {
  const { smartWalletAddress, isDeployed, chainId } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (smartWalletAddress) {
      navigator.clipboard.writeText(smartWalletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">Chain ID: {chainId}</span>
      </div>

      <div className="text-center space-y-2 mb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Receive Assets
        </h1>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Deposit native ETH or tokens directly to your Smart Contract Wallet address.
        </p>
      </div>

      {/* Main QR / Address Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 text-center space-y-6">
        {/* QR Visual Box */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto rounded-2xl bg-white p-4 flex flex-col items-center justify-center shadow-xl shadow-indigo-500/10">
          <div className="w-full h-full border-4 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-800 gap-2">
            <QrCode className="w-16 h-16 text-indigo-600" />
            <span className="text-[10px] font-mono text-slate-500 text-center px-2">
              {smartWalletAddress ? truncateAddress(smartWalletAddress, 6, 4) : 'Scan Address'}
            </span>
          </div>
        </div>

        {/* Address Display Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Smart Account Address
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
          <div className="p-3.5 rounded-2xl bg-slate-900/90 font-mono text-xs text-slate-200 border border-slate-800 break-all select-all">
            {smartWalletAddress || 'No account generated'}
          </div>
          <button
            onClick={handleCopy}
            disabled={!smartWalletAddress}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Address Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Copy Full Address</span>
              </>
            )}
          </button>
        </div>

        {/* Counterfactual Guarantee Notice */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-left space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Counterfactual Deposit Safety</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Funds sent to this CREATE2 address are securely held by the blockchain. Once the wallet contract is deployed on-chain, all accumulated balances are immediately accessible by your signing authority.
          </p>
        </div>
      </div>
    </div>
  );
}
