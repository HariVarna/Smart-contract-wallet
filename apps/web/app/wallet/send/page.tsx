'use client';

/**
 * @file apps/web/app/wallet/send/page.tsx
 * Send screen supporting Native ETH and ERC-20 transfers with simulation,
 * gas estimation, explicit state machine transitions, and confirmed receipt review.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Sparkles,
  Zap,
  Coins,
  ChevronDown,
  Layers,
  Fuel,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import type { Address, TokenMetadata } from '@scw/types';
import {
  formatEtherBalance,
  formatTokenBalance,
  isValidEthereumAddress,
  truncateAddress,
} from '@scw/wallet-core';
import { useWallet } from '../../../hooks/useWallet';
import { useTokenBalances } from '../../../hooks/useTokenBalances';
import { useSendTransaction } from '../../../hooks/useSendTransaction';

export default function SendTransactionPage() {
  const { balance, isDeployed, chainId } = useWallet();
  const { assets, trackedTokens } = useTokenBalances();
  const {
    state,
    simulation,
    txHash,
    receipt,
    errorMessage,
    prepareAndSimulate,
    executeTransfer,
    reset,
  } = useSendTransaction();

  // Selected asset: 'NATIVE' or token address
  const [selectedAssetKey, setSelectedAssetKey] = useState<string>('NATIVE');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [customCalldata, setCustomCalldata] = useState('');
  const [clientValidationError, setClientValidationError] = useState<string | null>(null);

  // Active selected asset info
  const selectedAsset = assets.find((a) =>
    selectedAssetKey === 'NATIVE' ? a.isNative : a.token?.address === selectedAssetKey,
  );

  const activeToken: TokenMetadata | undefined = selectedAsset?.token;
  const activeBalance = selectedAsset?.balance ?? (selectedAssetKey === 'NATIVE' ? balance : 0n);
  const activeDecimals = activeToken?.decimals ?? 18;
  const activeSymbol = activeToken?.symbol ?? 'ETH';

  const handleMax = () => {
    if (activeDecimals === 18) {
      const full = formatEtherBalance(activeBalance, 6);
      setAmount(full);
    } else {
      const full = formatTokenBalance(activeBalance, activeDecimals, 6);
      setAmount(full);
    }
  };

  const handlePrepareAndSimulate = async () => {
    setClientValidationError(null);

    if (!isValidEthereumAddress(recipient)) {
      setClientValidationError('Please enter a valid destination address (0x followed by 40 hex chars).');
      return;
    }

    const num = parseFloat(amount || '0');
    if (isNaN(num) || num <= 0) {
      setClientValidationError('Please enter an amount greater than zero.');
      return;
    }

    await prepareAndSimulate({
      assetType: selectedAssetKey === 'NATIVE' ? 'NATIVE' : 'ERC20',
      recipient,
      amount,
      token: activeToken,
      customCalldata,
      availableBalance: activeBalance,
    });
  };

  const handleExecute = async () => {
    await executeTransfer();
  };

  const handleResetForm = () => {
    reset();
    setAmount('');
    setRecipient('');
    setCustomCalldata('');
    setClientValidationError(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
        <div className="text-xs text-slate-400 font-mono">
          Available:{' '}
          <span className="text-white font-semibold">
            {selectedAssetKey === 'NATIVE'
              ? `${formatEtherBalance(balance)} ETH`
              : `${formatTokenBalance(activeBalance, activeDecimals)} ${activeSymbol}`}
          </span>
        </div>
      </div>

      <div className="text-center space-y-2 mb-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Transfer Assets
        </h1>
        <p className="text-xs text-slate-400">
          Execute simulated and verified transfers for Native ETH or standard ERC-20 tokens.
        </p>
      </div>

      {!isDeployed && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-xs text-amber-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div>
            <div className="font-semibold text-white">Smart Wallet Not Yet Deployed</div>
            <div>Transfers cannot be dispatched until your smart wallet is deployed on this network.</div>
          </div>
        </div>
      )}

      {/* Transaction Progress Tracker Bar */}
      <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-[11px] text-center font-medium">
        <div
          className={`py-1.5 px-1 rounded-xl transition-colors ${
            state === 'idle'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-500'
          }`}
        >
          1. Input
        </div>
        <div
          className={`py-1.5 px-1 rounded-xl transition-colors ${
            state === 'preparing'
              ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30 animate-pulse'
              : state === 'awaiting_authorization' || state === 'submitted' || state === 'confirming' || state === 'confirmed'
              ? 'text-indigo-400'
              : 'text-slate-500'
          }`}
        >
          2. Simulate
        </div>
        <div
          className={`py-1.5 px-1 rounded-xl transition-colors ${
            state === 'awaiting_authorization'
              ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
              : state === 'submitted' || state === 'confirming' || state === 'confirmed'
              ? 'text-emerald-400'
              : 'text-slate-500'
          }`}
        >
          3. Authorize
        </div>
        <div
          className={`py-1.5 px-1 rounded-xl transition-colors ${
            state === 'submitted' || state === 'confirming'
              ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30 animate-pulse'
              : state === 'confirmed'
              ? 'text-emerald-400'
              : 'text-slate-500'
          }`}
        >
          4. Confirming
        </div>
        <div
          className={`py-1.5 px-1 rounded-xl transition-colors ${
            state === 'confirmed'
              ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
              : state === 'failed'
              ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
              : 'text-slate-500'
          }`}
        >
          5. Finalized
        </div>
      </div>

      {/* Main Interactive Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        {state === 'confirmed' && receipt ? (
          /* Success Receipt View */
          <div className="text-center space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Transaction Confirmed!</h2>
              <p className="text-xs text-slate-400">
                Your transfer was executed by your smart contract account and confirmed on-chain.
              </p>
            </div>

            {/* Receipt Summary Grid */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 text-left space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800">
                <span className="text-slate-400">Transaction Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Block Included (Success)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800 font-mono">
                <span className="text-slate-400">Tx Hash</span>
                <span className="text-indigo-300">{truncateAddress(receipt.transactionHash, 8, 8)}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800 font-mono">
                <span className="text-slate-400">Block Number</span>
                <span className="text-white">#{receipt.blockNumber.toString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-800 font-mono">
                <span className="text-slate-400">Gas Used</span>
                <span className="text-slate-300">{receipt.gasUsed.toString()} units</span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">Confirmations</span>
                <span className="text-emerald-400 font-semibold">{receipt.confirmations.toString()} block(s)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleResetForm}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
              >
                Send Another Transfer
              </button>
              <Link
                href="/wallet"
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold text-center transition-colors shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-1.5"
              >
                <span>Wallet Dashboard</span>
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Asset Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Select Asset</span>
                <Link
                  href="/wallet/assets"
                  className="text-[11px] text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  <Coins className="w-3 h-3" />
                  <span>Manage Tokens</span>
                </Link>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Native ETH Option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAssetKey('NATIVE');
                    reset();
                  }}
                  disabled={state === 'confirming' || state === 'submitted'}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    selectedAssetKey === 'NATIVE'
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/20'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold font-mono text-xs flex items-center justify-center border border-indigo-500/30">
                      ETH
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">Ethereum</div>
                      <div className="text-[10px] text-slate-400">Native Asset</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white font-mono">{formatEtherBalance(balance)}</div>
                    <div className="text-[10px] text-slate-500">ETH</div>
                  </div>
                </button>

                {/* Tracked Tokens */}
                {trackedTokens.map((tok) => {
                  const matchingAsset = assets.find((a) => a.token?.address === tok.address);
                  const bal = matchingAsset?.balance ?? 0n;
                  return (
                    <button
                      key={tok.address}
                      type="button"
                      onClick={() => {
                        setSelectedAssetKey(tok.address);
                        reset();
                      }}
                      disabled={state === 'confirming' || state === 'submitted'}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        selectedAssetKey === tok.address
                          ? 'border-indigo-500 bg-indigo-500/10 shadow-sm shadow-indigo-500/20'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 font-bold font-mono text-xs flex items-center justify-center border border-purple-500/30">
                          {tok.symbol.slice(0, 3)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{tok.name}</div>
                          <div className="text-[10px] text-slate-400">{tok.symbol} (ERC-20)</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white font-mono">
                          {formatTokenBalance(bal, tok.decimals)}
                        </div>
                        <div className="text-[10px] text-slate-500">{tok.symbol}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recipient Address Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Destination Address (Recipient)</span>
                <span className="text-[11px] text-slate-500 font-normal">Valid Ethereum Address (0x...)</span>
              </label>
              <input
                type="text"
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value.trim());
                  if (state !== 'idle') reset();
                }}
                disabled={state === 'confirming' || state === 'submitted' || state === 'preparing'}
                className="w-full bg-slate-900/90 text-white text-xs px-4 py-3 rounded-xl border border-slate-700/60 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Amount Input with Max Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-300">Amount to Send</label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-indigo-400 hover:underline font-mono text-[11px]"
                >
                  Use Max ({activeSymbol})
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="0.0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value.trim());
                    if (state !== 'idle') reset();
                  }}
                  disabled={state === 'confirming' || state === 'submitted' || state === 'preparing'}
                  className="w-full bg-slate-900/90 text-white text-xs px-4 py-3 pr-20 rounded-xl border border-slate-700/60 font-mono focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 font-mono">
                  {activeSymbol}
                </span>
              </div>
            </div>

            {/* Optional Calldata for Native Transfers */}
            {selectedAssetKey === 'NATIVE' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Contract Calldata (Optional)</span>
                  <span className="text-[11px] text-slate-500 font-normal">Hex bytes payload</span>
                </label>
                <input
                  type="text"
                  placeholder="0x"
                  value={customCalldata}
                  onChange={(e) => {
                    setCustomCalldata(e.target.value.trim());
                    if (state !== 'idle') reset();
                  }}
                  disabled={state === 'confirming' || state === 'submitted' || state === 'preparing'}
                  className="w-full bg-slate-900/90 text-white text-xs px-4 py-3 rounded-xl border border-slate-700/60 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}

            {/* Error Display */}
            {(clientValidationError || errorMessage) && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-rose-200">Validation / Execution Error</div>
                  <div>{clientValidationError || errorMessage}</div>
                </div>
              </div>
            )}

            {/* Simulation Preview Card */}
            {simulation && simulation.success && (
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Pre-Flight Simulation Verified (eth_call)</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">Simulated OK</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Execution Target</span>
                    <span className="font-mono text-slate-200">{truncateAddress(simulation.target)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Estimated Gas Limit</span>
                    <span className="font-mono text-slate-200 flex items-center gap-1">
                      <Fuel className="w-3.5 h-3.5 text-indigo-400" />
                      {simulation.estimatedGas.toString()} gas
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons with Multi-Step Flow */}
            <div className="pt-2 space-y-2">
              {state === 'awaiting_authorization' ? (
                <button
                  type="button"
                  onClick={handleExecute}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all duration-200"
                >
                  <Zap className="w-4 h-4" />
                  <span>Authorize & Dispatch Transaction</span>
                </button>
              ) : state === 'submitted' || state === 'confirming' ? (
                <button
                  disabled
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600/50 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>
                    {state === 'submitted'
                      ? 'Broadcasting to Network...'
                      : 'Waiting for 1+ Block Confirmations...'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePrepareAndSimulate}
                  disabled={state === 'preparing' || !isDeployed}
                  className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all duration-200 disabled:opacity-50"
                >
                  {state === 'preparing' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Simulating Contract Call...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      Simulate & Review Transaction
                    </span>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
