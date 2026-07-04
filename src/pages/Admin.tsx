/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { formatUnits } from 'viem';
import { ShieldAlert, Terminal, Settings, AlertTriangle, Play, RefreshCw, Key, ShieldCheck, Database } from 'lucide-react';
import { useBlockchain } from '../hooks/useBlockchain';
import { OWNER_ADDRESS } from '../contracts';
import { SHORT_ADDRESS } from '../utils';

export default function Admin() {
  const { address, isConnected, poolInfo, swapHistory, isLoading } = useBlockchain();

  const isOwner = isConnected && address?.toLowerCase() === '0x13b3216c71bc6a75b9dd87017dde2e8867d8999f'.toLowerCase();

  const [gasThreshold, setGasThreshold] = useState<string>('250');
  const [swapFee, setSwapFee] = useState<string>('0.30');

  const handleUpdateProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Administrative action dispatched to the Arc Testnet multisig contract!');
  };

  if (!isOwner) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto py-12"
      >
        <div className="glass-card p-6 border-brand-danger/30 shadow-[0_0_25px_rgba(255,59,59,0.15)] relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-brand-danger" />

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 bg-brand-danger/10 border border-brand-danger/30 rounded-full flex items-center justify-center text-brand-danger animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="font-display font-black text-2xl text-white uppercase tracking-wide">Access Denied</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              This panel is cryptographically restricted to the ArcZode Protocol Owner wallet address:
            </p>

            <div className="bg-black/40 border border-brand-blue/20 rounded-lg p-2.5 w-full select-all font-mono text-[10px] text-brand-accent break-all">
              0x13b3216c71bc6a75b9dd87017dde2e8867d8999f
            </div>

            {isConnected && (
              <p className="text-xs text-slate-500">
                Connected address: <span className="font-mono text-slate-300">{address}</span>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 py-6"
    >
      {/* Authorized Alert banner */}
      <div className="bg-brand-success/10 border border-brand-success/35 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(0,255,136,0.06)]">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-brand-success" />
          <div>
            <p className="text-sm font-semibold text-white">Administrative Portal Unlocked</p>
            <p className="text-xs text-slate-300">
              Owner wallet authenticated: {SHORT_ADDRESS(address)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Management & Configuration (7 cols) */}
        <div className="lg:col-span-7 glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-gold" />
          
          <h3 className="font-display font-black text-xl text-white tracking-wide uppercase mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-brand-gold" />
            Exchange Parameter Settings
          </h3>

          <form onSubmit={handleUpdateProtocol} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">Liquidity Pool Fee (%)</label>
                <input
                  type="text"
                  value={swapFee}
                  onChange={(e) => setSwapFee(e.target.value)}
                  className="w-full bg-[#00010F] border border-brand-blue/30 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold block">Gas Limit Threshold (Gwei)</label>
                <input
                  type="text"
                  value={gasThreshold}
                  onChange={(e) => setGasThreshold(e.target.value)}
                  className="w-full bg-[#00010F] border border-brand-blue/30 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-brand-gold hover:bg-yellow-400 text-black font-black font-display tracking-wider uppercase rounded-xl transition-all cursor-pointer"
            >
              Commit Parameters
            </button>
          </form>
        </div>

        {/* Right Column: Platform stats overview (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-display font-black text-lg text-white tracking-wide uppercase mb-4 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-brand-accent" />
              Contract State Vectors
            </h3>

            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="flex justify-between border-b border-brand-blue/10 pb-2">
                <span>Total Liquidity Supply</span>
                <span className="font-mono text-white">{Number(formatUnits(poolInfo.totalLPTokens, 6)).toLocaleString()} LP</span>
              </div>
              <div className="flex justify-between border-b border-brand-blue/10 pb-2">
                <span>Swaps Count Vector</span>
                <span className="font-mono text-white">{poolInfo.swapCounter.toString()} swaps</span>
              </div>
              <div className="flex justify-between border-b border-brand-blue/10 pb-2">
                <span>USDC Vault Reserve</span>
                <span className="font-mono text-white">{Number(formatUnits(poolInfo.usdcReserve, 6)).toLocaleString()} USDC</span>
              </div>
              <div className="flex justify-between">
                <span>EURC Vault Reserve</span>
                <span className="font-mono text-white">{Number(formatUnits(poolInfo.eurcReserve, 6)).toLocaleString()} EURC</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Ledger Stream Card */}
      <div className="glass-card p-6">
        <h3 className="font-display font-black text-xl text-white tracking-wide uppercase mb-6 flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-accent" />
          Complete Protocol Transaction Stream
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-blue/20 text-slate-500 text-xs uppercase tracking-wider">
                <th className="pb-3 pl-2">Time</th>
                <th className="pb-3">Trader Address</th>
                <th className="pb-3">Action Type</th>
                <th className="pb-3 text-right">Inflow</th>
                <th className="pb-3 text-right pr-2">Outflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-blue/10 text-sm font-sans">
              {swapHistory.map((tx, idx) => {
                const date = new Date(Number(tx.timestamp) * 1000).toLocaleTimeString();
                return (
                  <tr key={idx} className="hover:bg-brand-blue/5 transition-colors">
                    <td className="py-4 pl-2 font-mono text-slate-400 text-xs">{date}</td>
                    <td className="py-4 font-mono text-slate-300 text-xs select-all">{tx.user}</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-blue/10 text-brand-accent border border-brand-blue/20">
                        SWAP
                      </span>
                    </td>
                    <td className="py-4 text-right font-mono text-slate-300">
                      {Number(formatUnits(tx.amountIn, 6)).toLocaleString()}
                    </td>
                    <td className="py-4 text-right pr-2 font-mono text-brand-gold">
                      +{Number(formatUnits(tx.amountOut, 6)).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </motion.div>
  );
}
