'use client';

/**
 * @file apps/web/app/wallet/activity/page.tsx
 * Chronological activity feed showing Native deposits, ETH transfers,
 * and decoded ERC-20 transfers with block details.
 */

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  Coins,
  Cpu,
} from 'lucide-react';
import { truncateAddress, formatEtherBalance } from '@scw/wallet-core';
import { useWallet } from '../../../hooks/useWallet';
import { useActivity } from '../../../hooks/useActivity';

export default function ActivityPage() {
  const { isDeployed } = useWallet();
  const { activities, isLoading, error, refetch } = useActivity();

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
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/60 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Activity & Event Logs
        </h1>
        <p className="text-xs text-slate-400">
          Chronological audit of verified on-chain deposits, native transfers, and ERC-20 execution calls.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Scanning event logs from RPC node...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="glass-panel p-12 rounded-3xl border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 mx-auto border border-slate-800">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">No Activity Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {!isDeployed
                ? 'Your smart wallet has not been deployed on-chain yet.'
                : 'No transaction logs have been recorded for this wallet address.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => {
            const isDeposit = act.type === 'INCOMING_ETH';
            const isERC20 = act.type === 'OUTGOING_ERC20';
            const isEthTransfer = act.type === 'OUTGOING_ETH';

            return (
              <div
                key={act.id}
                className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-700/80 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      isDeposit
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isERC20
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {isDeposit ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : isERC20 ? (
                      <Coins className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        {isDeposit
                          ? 'Received Native Deposit'
                          : isERC20
                          ? 'ERC-20 Token Transfer'
                          : isEthTransfer
                          ? 'Sent Native ETH'
                          : 'Executed Contract Call'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 font-mono">
                      {isDeposit ? (
                        <>
                          <span>From:</span>
                          <span className="text-slate-300 font-semibold">
                            {truncateAddress(act.targetOrSender, 8, 6)}
                          </span>
                        </>
                      ) : isERC20 ? (
                        <>
                          <span>To:</span>
                          <span className="text-slate-300 font-semibold">
                            {truncateAddress(act.tokenRecipient, 8, 6)}
                          </span>
                          <span className="text-slate-500">
                            (Token: {truncateAddress(act.targetOrSender, 6, 4)})
                          </span>
                        </>
                      ) : (
                        <>
                          <span>Target:</span>
                          <span className="text-slate-300 font-semibold">
                            {truncateAddress(act.targetOrSender, 8, 6)}
                          </span>
                        </>
                      )}
                      {act.nonce !== undefined && (
                        <span className="text-slate-500">• Nonce #{act.nonce.toString()}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1 pl-12 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                  <div className="text-xs font-bold text-white font-mono">
                    {isDeposit || isEthTransfer
                      ? `${formatEtherBalance(act.value)} ETH`
                      : isERC20 && act.tokenAmount !== undefined
                      ? `${act.tokenAmount.toString()} base units`
                      : 'Call Execution'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Block #{act.blockNumber.toString()} • Tx: {truncateAddress(act.txHash, 6, 4)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
