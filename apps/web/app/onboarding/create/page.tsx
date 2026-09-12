'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Plus, Sparkles, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { truncateAddress } from '@scw/wallet-core';
import { useWallet } from '../../../hooks/useWallet';
import { useDeployWallet } from '../../../hooks/useDeployWallet';

export default function CreateWalletPage() {
  const router = useRouter();
  const { ownerAddress, factoryAddress, refresh } = useWallet();
  const { deploy, isDeploying, error, txHash } = useDeployWallet();
  const [salt, setSalt] = useState<string>('0');
  const [deployedAddress, setDeployedAddress] = useState<string | null>(null);

  const handleDeploy = async () => {
    try {
      const saltBigInt = BigInt(salt || '0');
      const result = await deploy(saltBigInt);
      if (result) {
        setDeployedAddress(result);
        await refresh();
      }
    } catch {
      // Handled in hook
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
      <Link
        href="/wallet"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Wallet</span>
      </Link>

      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass-panel text-xs text-indigo-400 border border-indigo-500/20">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Deterministic Factory Deployment</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Deploy Smart Contract Wallet</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          Deploy an on-chain smart contract account using CREATE2 with your connected authority.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {deployedAddress ? (
        <div className="glass-panel p-6 rounded-2xl border border-emerald-500/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Smart Wallet Deployed!</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your wallet contract is active on-chain and ready to execute transactions.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/90 font-mono text-xs text-indigo-300 break-all border border-slate-800">
            {deployedAddress}
          </div>
          {txHash && (
            <div className="text-[11px] text-slate-400 font-mono">
              Tx Hash: <span className="text-slate-200">{truncateAddress(txHash, 10, 8)}</span>
            </div>
          )}
          <button
            onClick={() => router.push('/wallet')}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all duration-200"
          >
            Open Dashboard
          </button>
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          {/* Owner Details */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
              Owner Signing Authority
            </span>
            <div className="p-3 rounded-xl bg-slate-900/80 font-mono text-xs text-slate-200 border border-slate-800 break-all">
              {ownerAddress || 'Not Connected'}
            </div>
          </div>

          {/* Salt Configuration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                Deployment Salt
              </label>
              <span className="text-[11px] text-slate-500">Default: 0</span>
            </div>
            <input
              type="number"
              min="0"
              value={salt}
              onChange={(e) => setSalt(e.target.value)}
              placeholder="0"
              className="w-full bg-slate-900/90 text-white text-xs px-3.5 py-2.5 rounded-xl border border-slate-700/60 font-mono focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-400">
              Different salts generate distinct, independent smart contract wallet accounts for the same owner.
            </p>
          </div>

          {/* Factory Info */}
          <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Factory Contract:</span>
            <span className="font-mono text-indigo-300 font-medium">
              {factoryAddress ? truncateAddress(factoryAddress, 8, 6) : 'Unavailable'}
            </span>
          </div>

          {/* Deploy Action */}
          <button
            onClick={handleDeploy}
            disabled={isDeploying || !ownerAddress || !factoryAddress}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all duration-200 disabled:opacity-50"
          >
            {isDeploying ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deploying Contract On-Chain...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Deploy Smart Contract Wallet
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
