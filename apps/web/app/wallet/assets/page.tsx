'use client';

/**
 * @file apps/web/app/wallet/assets/page.tsx
 * Portfolio screen displaying Native ETH and dynamic ERC-20 token balances,
 * with real-time on-chain ERC-20 token import and metadata validation.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { formatEtherBalance, formatTokenBalance, truncateAddress } from '@scw/wallet-core';
import { useWallet } from '../../../hooks/useWallet';
import { useTokenBalances } from '../../../hooks/useTokenBalances';

export default function AssetsPage() {
  const { balance, smartWalletAddress } = useWallet();
  const { assets, trackedTokens, importToken, removeToken, isLoading, error, refreshBalances } =
    useTokenBalances();

  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [tokenAddressInput, setTokenAddressInput] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  const handleImportToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenAddressInput.trim()) return;

    setImportStatus('loading');
    setImportErrorMessage(null);

    try {
      await importToken(tokenAddressInput.trim());
      setImportStatus('success');
      setTokenAddressInput('');
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportStatus('idle');
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import ERC-20 token';
      setImportErrorMessage(msg);
      setImportStatus('error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <button
          onClick={() => refreshBalances()}
          className="text-xs text-slate-400 hover:text-white transition-colors font-mono"
        >
          {isLoading ? 'Refreshing balances...' : 'Refresh Portfolio'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Wallet Portfolio
          </h1>
          <p className="text-xs text-slate-400">
            View and manage all native and ERC-20 token assets custodied by your Smart Contract Account.
          </p>
        </div>

        <button
          onClick={() => setIsImportModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Import ERC-20 Token</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('tokens')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'tokens'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Tokens & Native Currencies ({assets.length})
        </button>
        <button
          onClick={() => setActiveTab('nfts')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'nfts'
              ? 'border-indigo-500 text-white'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Collectibles (NFTs)
        </button>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-400" />
                <span>Import ERC-20 Token</span>
              </h2>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportErrorMessage(null);
                  setImportStatus('idle');
                }}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter any standard ERC-20 contract address on this network. We will fetch its name, symbol, and decimals directly from the blockchain.
            </p>

            <form onSubmit={handleImportToken} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Contract Address</label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={tokenAddressInput}
                  onChange={(e) => setTokenAddressInput(e.target.value.trim())}
                  disabled={importStatus === 'loading'}
                  className="w-full bg-slate-900/90 text-white text-xs px-4 py-3 rounded-xl border border-slate-700/60 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {importErrorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span>{importErrorMessage}</span>
                </div>
              )}

              {importStatus === 'success' && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Token verified and added to portfolio!</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importStatus === 'loading' || !tokenAddressInput.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {importStatus === 'loading' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying On-Chain...</span>
                    </>
                  ) : (
                    <span>Add Token</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Asset Cards List */}
      {activeTab === 'tokens' ? (
        <div className="space-y-3">
          {/* Native ETH Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold font-mono text-sm border border-indigo-500/20">
                ETH
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Ethereum</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
                    Native
                  </span>
                </div>
                <div className="text-xs text-slate-400">Gas & Settlement Token</div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6">
              <div className="text-right">
                <div className="text-sm font-bold text-white font-mono">
                  {formatEtherBalance(balance)} ETH
                </div>
                <div className="text-[11px] text-slate-400">Available Balance</div>
              </div>

              <div className="flex gap-2">
                <Link
                  href="/wallet/send"
                  className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                  title="Send ETH"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/wallet/receive"
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/60 text-white text-xs font-semibold"
                  title="Receive ETH"
                >
                  <ArrowDownLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Tracked ERC-20 Tokens */}
          {trackedTokens.map((tok) => {
            const asset = assets.find((a) => a.token?.address === tok.address);
            const bal = asset?.balance ?? 0n;

            return (
              <div
                key={tok.address}
                className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold font-mono text-sm border border-purple-500/20">
                    {tok.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{tok.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-medium border border-purple-500/20 font-mono">
                        {tok.symbol}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Contract: {truncateAddress(tok.address, 6, 6)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6">
                  <div className="text-right">
                    <div className="text-sm font-bold text-white font-mono">
                      {formatTokenBalance(bal, tok.decimals)} {tok.symbol}
                    </div>
                    <div className="text-[11px] text-slate-400">ERC-20 Holdings</div>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href="/wallet/send"
                      className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                      title={`Send ${tok.symbol}`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => removeToken(tok.address)}
                      className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-900/30 border border-slate-700/60 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors"
                      title="Untrack Token"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {trackedTokens.length === 0 && (
            <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
              <Coins className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-xs font-semibold text-slate-300">No Custom ERC-20 Tokens Tracked</div>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed">
                Import any standard ERC-20 token contract address using the button above to track your balance and execute transfers.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-indigo-400 mx-auto" />
          <div className="text-xs font-semibold text-white">NFT Collectibles</div>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            ERC-721 and ERC-1155 visual gallery and transfer controls are scheduled for the NFT module phase.
          </p>
        </div>
      )}
    </div>
  );
}
