/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatUnits } from 'viem';
import { ArrowRightLeft, ArrowDown, TrendingUp, Users, Percent, HelpCircle } from 'lucide-react';
import { useBlockchain } from '../hooks/useBlockchain';
import { SHORT_ADDRESS, getLogoForToken } from '../utils';
import { USDC_ADDRESS } from '../contracts';

export default function Home() {
  const navigate = useNavigate();
  const {
    poolInfo,
    balances,
    swapHistory,
    currentPrice,
  } = useBlockchain();

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-16 py-8"
    >
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-4xl mx-auto pt-6 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-[10px] font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FFD700] animate-pulse"></span>
          Live on Arc Testnet
        </div>
        <motion.h1 
          className="text-5xl sm:text-6xl md:text-7xl font-display font-black leading-[0.9] tracking-tighter uppercase"
          style={{ wordBreak: 'keep-all' }}
        >
          TRADE FREELY<br />
          <span className="bg-gradient-to-r from-[#0033CC] via-[#4D79FF] to-[#FFD700] bg-clip-text text-transparent italic">
            ON ARC
          </span>
        </motion.h1>
        
        <p className="text-[#8892A4] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          First decentralized exchange with liquidity pools on Arc Testnet. 
          Optimized for ultra-low slippage and high yields. Swap USDC and EURC and earn AZD protocol rewards.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={() => navigate('/swap')}
            className="px-8 py-4 bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#00010F] font-black font-display tracking-wider rounded-2xl shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.55)] transition-all duration-300 transform hover:-translate-y-0.5 hover:scale-[1.02] cursor-pointer text-lg uppercase"
          >
            Start Swapping
          </button>
          <button
            onClick={() => navigate('/liquidity')}
            className="px-8 py-4 bg-transparent hover:bg-brand-blue/10 text-white font-bold font-display tracking-wider border border-[#4D79FF]/50 hover:border-brand-gold rounded-2xl shadow-[0_0_20px_rgba(0,51,204,0.2)] hover:shadow-[0_0_25px_rgba(0,51,204,0.4)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer text-lg uppercase"
          >
            Add Liquidity
          </button>
        </div>
      </div>

      {/* Live Pool Stats - 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat 1: USDC Reserve */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/10 rounded-bl-full pointer-events-none -z-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-3">
            <span>USDC Reserve</span>
            <div className="flex items-center gap-1.5 p-1 rounded-md bg-brand-blue/20 text-brand-accent text-xs font-bold">
              {getLogoForToken('USDC')}
              <span>USDC</span>
            </div>
          </div>
          <div className="text-2xl font-black font-orbitron text-white glow-blue">
            {Number(formatUnits(poolInfo.usdcReserve, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-brand-success" />
            <span>Constant Product Pool</span>
          </div>
        </div>

        {/* Stat 2: EURC Reserve */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-gold/5 rounded-bl-full pointer-events-none -z-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-3">
            <span>EURC Reserve</span>
            <div className="flex items-center gap-1.5 p-1 rounded-md bg-brand-gold/10 text-brand-gold text-xs font-bold">
              {getLogoForToken('EURC')}
              <span>EURC</span>
            </div>
          </div>
          <div className="text-2xl font-black font-orbitron text-brand-gold glow-gold">
            {Number(formatUnits(poolInfo.eurcReserve, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <span>Pool Exchange Rate: 1.08 EURC</span>
          </div>
        </div>

        {/* Stat 3: Total LP Tokens */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none -z-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-3">
            <span>Total LP Tokens</span>
            <Users className="w-4 h-4 text-brand-success" />
          </div>
          <div className="text-2xl font-black font-orbitron text-white">
            {Number(formatUnits(poolInfo.totalLPTokens, 6)).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-brand-success" />
            <span>0.30% swap fee reward APY</span>
          </div>
        </div>

        {/* Stat 4: Total Swaps */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none -z-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-3">
            <span>Cumulative Swaps</span>
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black font-orbitron text-white">
            {poolInfo.swapCounter.toString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            <span>Swaps processed on Arc</span>
          </div>
        </div>
      </div>

      {/* Recent Swaps Row */}
      <div className="grid grid-cols-1 gap-8 items-start">
        {/* Recent Swaps (Full Width) */}
        <div className="glass-card p-6">
          <h3 className="font-display font-black text-xl text-white tracking-wide uppercase mb-6 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-brand-gold" />
            Recent Swaps Ticker
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-brand-blue/20 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="pb-3 pl-2">User</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3 text-right">Amount In</th>
                  <th className="pb-3 text-right pr-2">Amount Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-blue/10 text-sm font-sans">
                {swapHistory.slice(0, 5).map((tx, idx) => {
                  const isUSDCIn = tx.tokenIn.toLowerCase() === USDC_ADDRESS.toLowerCase();
                  return (
                    <tr key={idx} className="hover:bg-brand-blue/5 transition-colors">
                      <td className="py-4 pl-2 font-mono text-slate-400 text-xs">
                        {tx.txHash ? (
                          <a
                              href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-accent hover:text-brand-gold hover:underline flex items-center gap-1.5"
                          >
                            {SHORT_ADDRESS(tx.user)}
                          </a>
                        ) : (
                          SHORT_ADDRESS(tx.user)
                        )}
                      </td>
                      <td className="py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-brand-blue/15 text-brand-accent border border-brand-blue/25">
                          Swap {isUSDCIn ? 'USDC → EURC' : 'EURC → USDC'}
                        </span>
                      </td>
                      <td className="py-4 text-right font-mono text-slate-200">
                        {Number(formatUnits(tx.amountIn, 6)).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isUSDCIn ? 'USDC' : 'EURC'}
                      </td>
                      <td className="py-4 text-right pr-2 font-mono text-brand-gold">
                        +{Number(formatUnits(tx.amountOut, 6)).toLocaleString(undefined, { minimumFractionDigits: 2 })} {isUSDCIn ? 'EURC' : 'USDC'}
                      </td>
                    </tr>
                  );
                })}

                {swapHistory.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No swap history available. Execute a swap to start!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="glass-card p-8 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue via-brand-gold to-brand-blue" />
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="font-display font-black text-3xl text-white uppercase tracking-wider mb-2">How It Works</h2>
          <p className="text-slate-400 text-sm">
            ArcZode enables seamless stablecoin exchange and yield aggregation on the high-speed Arc Testnet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="space-y-3 p-5 rounded-2xl bg-brand-blue/5 border border-brand-blue/15">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-brand-accent font-mono font-bold text-lg">
              01
            </div>
            <h4 className="font-display font-bold text-white text-base">Connect Your Wallet</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Connect your Web3 browser wallet safely to Arc Testnet using the navigation bar. Receive instantly available testnet balances.
            </p>
          </div>

          {/* Step 2 */}
          <div className="space-y-3 p-5 rounded-2xl bg-brand-blue/5 border border-brand-blue/15">
            <div className="w-10 h-10 rounded-xl bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-brand-gold font-mono font-bold text-lg">
              02
            </div>
            <h4 className="font-display font-bold text-white text-base">Swap & Provide Liquidity</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Trade USDC/EURC stablecoins instantly. Add liquidity reserves into constant-product AMM pool to capture passive fee allocations.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-3 p-5 rounded-2xl bg-[#FFD700]/5 border border-[#FFD700]/15">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold font-mono font-bold text-lg">
              03
            </div>
            <h4 className="font-display font-bold text-white text-base">Stake & Accumulate Yield</h4>
            <p className="text-slate-400 text-xs leading-relaxed">
              Earn constant protocol rewards. Stake your AZD tokens securely into the liquid pool to gain 18.5% compounding yield rewards.
            </p>
          </div>
        </div>
      </div>

    </motion.div>
  );
}

