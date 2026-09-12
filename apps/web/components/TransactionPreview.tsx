import React from 'react';
import type { Address, Hex } from '@scw/types';
import { SimulationResult } from '../hooks/useSimulateTransaction';

interface TransactionPreviewProps {
  target: Address;
  value: bigint;
  calldata: Hex;
  simulation: SimulationResult | null;
  onConfirm: () => void;
  onCancel: () => void;
  isExecuting: boolean;
}

export function TransactionPreview({
  target,
  value,
  calldata,
  simulation,
  onConfirm,
  onCancel,
  isExecuting,
}: TransactionPreviewProps) {
  // Extract function selector (first 4 bytes / 8 hex chars + '0x')
  const selector = calldata.length >= 10 ? calldata.slice(0, 10) : '0x';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        <h2 className="mb-4 text-xl font-bold text-white">Review Transaction</h2>

        {/* Security Warning */}
        <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/20 p-4">
          <h3 className="font-semibold text-red-500">Arbitrary Call Warning</h3>
          <p className="mt-1 text-sm text-red-200">
            You are about to execute an arbitrary contract interaction. Ensure you trust the target contract.
          </p>
          {simulation?.warning && (
            <p className="mt-2 font-bold text-red-400">{simulation.warning}</p>
          )}
        </div>

        {/* Transaction Details */}
        <div className="space-y-3 rounded-lg bg-gray-950 p-4 text-sm font-mono text-gray-300">
          <div>
            <span className="text-gray-500">Target:</span>
            <div className="break-all text-blue-400">{target}</div>
          </div>
          <div>
            <span className="text-gray-500">Value (Wei):</span>
            <div>{value.toString()}</div>
          </div>
          <div>
            <span className="text-gray-500">Function Selector:</span>
            <div className="text-yellow-400">{selector || 'Native Transfer'}</div>
          </div>
          <div>
            <span className="text-gray-500">Raw Calldata:</span>
            <div className="max-h-24 overflow-y-auto break-all rounded bg-black p-2 text-xs text-gray-400">
              {calldata}
            </div>
          </div>
        </div>

        {/* Simulation Results */}
        <div className="mt-4 border-t border-gray-800 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-400">Simulation Status</h3>
          {simulation ? (
            simulation.success ? (
              <div className="flex flex-col space-y-1">
                <span className="text-green-400">✓ Simulation Succeeded</span>
                <span className="text-xs text-gray-500">
                  Est. Gas: {simulation.estimatedGas?.toString()}
                </span>
              </div>
            ) : (
              <div className="flex flex-col space-y-1">
                <span className="text-red-400">✗ Simulation Reverted</span>
                <span className="text-xs text-red-300">{simulation.error}</span>
              </div>
            )
          ) : (
            <span className="text-yellow-400">Simulating...</span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isExecuting}
            className="flex-1 rounded-lg border border-gray-700 py-2 text-gray-300 hover:bg-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isExecuting || (simulation && !simulation.success)}
            className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isExecuting ? 'Executing...' : 'Confirm & Sign'}
          </button>
        </div>
      </div>
    </div>
  );
}
