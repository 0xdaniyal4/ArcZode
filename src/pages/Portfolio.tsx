/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatUnits } from 'viem';
import { Wallet, Landmark, Coins, Sparkles, ArrowRightLeft, Gift, CheckCircle, AlertCircle } from 'lucide-react';
import { useBlockchain } from '../hooks/useBlockchain';
import { SHORT_ADDRESS, getLogoForToken } from '../utils';
import { USDC_ADDRESS } from '../contracts';

export default function Portfolio() {
  const navigate = useNavigate();
  const {
    address,
    isConnected,
    multiPoolInfo,
    multiUserInfo,
    balances,
    swapHistory,
  } = useBlockchain();

  // Filter user swap transactions
  const userSwaps = useMemo(() => {
    if (!address) return [];
    return swapHistory.filter(
      (tx) => tx.user.toLowerCase() === address.toLowerCase()
    );
  }, [swapHistory, address]);

  // Calculations for Pool 1 (USDC/EURC)
  const totalLP1 = multiPoolInfo.pool1.totalLPTokens || 1n;
  const userLP1 = multiUserInfo.lpBalance1;
  const shareOfPool1 = totalLP1 > 0n ? (Number(userLP1) / Number(totalLP1)) * 100 : 0;
  const userOwnedUSDC1: bigint = totalLP1 > 0n ? (BigInt(multiPoolInfo.pool1.usdcReserve) * BigInt(userLP1)) / BigInt(totalLP1) : 0n;
  const userOwnedEURC1: bigint = totalLP1 > 0n ? (BigInt(multiPoolInfo.pool1.eurcReserve) * BigInt(userLP1)) / BigInt(totalLP1) : 0n;

  // Calculations for Pool 2 (USDC/AZD)
  const totalLP2 = multiPoolInfo.pool2.totalLPTokens || 1n;
  const userLP2 = multiUserInfo.lpBalance2;
  const shareOfPool2 = totalLP2 > 0n ? (Number(userLP2) / Number(totalLP2)) * 100 : 0;
  const userOwnedUSDC2: bigint = totalLP2 > 0n ? (BigInt(multiPoolInfo.pool2.usdcReserve) * BigInt(userLP2)) / BigInt(totalLP2) : 0n;
  const userOwnedAZD2: bigint = totalLP2 > 0n ? (BigInt(multiPoolInfo.pool2.azdReserve) * BigInt(userLP2)) / BigInt(totalLP2) : 0n;

  // Calculations for Pool 3 (EURC/AZD)
  const totalLP3 = multiPoolInfo.pool3.totalLPTokens || 1n;
  const userLP3 = multiUserInfo.lpBalance3;
  const shareOfPool3 = totalLP3 > 0n ? (Number(userLP3) / Number(totalLP3)) * 100 : 0;
  const userOwnedEURC3: bigint = totalLP3 > 0n ? (BigInt(multiPoolInfo.pool3.eurcReserve) * BigInt(userLP3)) / BigInt(totalLP3) : 0n;
  const userOwnedAZD3: bigint = totalLP3 > 0n ? (BigInt(multiPoolInfo.pool3.azdReserve) * BigInt(userLP3)) / BigInt(totalLP3) : 0n;

  if (!isConnected) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-md mx-auto text-center py-16 space-y-6"
      >
        <div className="w-16 h-16 bg-brand-blue/10 border border-brand-blue/30 rounded-full flex items-center justify-center mx-auto text-brand-gold animate-bounce">
          <Wallet className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-black text-2xl text-white uppercase tracking-wide">Connect Your Wallet</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Please connect your wallet using the top navigation bar to view your balances, LP positions, and swap history.
          </p>
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
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row items-baseline sm:items-center justify-between gap-2 border-b border-brand-blue/20 pb-4">
        <div>
          <h2 className="font-display font-black text-2xl text-white tracking-wide uppercase">My Portfolio</h2>
          <p className="text-xs text-slate-400">Account overview and asset positions</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs bg-brand-blue/20 px-3 py-1.5 rounded-lg border border-brand-blue/30 text-brand-accent">
          <Wallet className="w-4 h-4 text-brand-gold" />
          <span>{SHORT_ADDRESS(address)}</span>
        </div>
      </div>

      {/* Grid: Assets & Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Balances Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-display font-black text-lg text-white tracking-wide uppercase mb-6 flex items-center gap-2">
              <Coins className="w-5 h-5 text-brand-gold" />
              Wallet Assets
            </h3>

            <div className="space-y-4">
              {/* USDC */}
              <div className="flex items-center justify-between p-4 immersive-input-box hover:scale-[1.01] hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getLogoForToken('USDC')}</span>
                  <div>
                    <span className="font-bold text-white text-sm">USDC Stablecoin</span>
                    <span className="text-[10px] text-slate-500 block">USD Coin on Arc</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-white text-base">
                    {Number(formatUnits(balances.usdc, 6)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">$ {Number(formatUnits(balances.usdc, 6)).toFixed(2)}</span>
                </div>
              </div>

              {/* EURC */}
              <div className="flex items-center justify-between p-4 immersive-input-box hover:scale-[1.01] hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getLogoForToken('EURC')}</span>
                  <div>
                    <span className="font-bold text-white text-sm">EURC Stablecoin</span>
                    <span className="text-[10px] text-slate-500 block">Euro Coin on Arc</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-brand-gold text-base">
                    {Number(formatUnits(balances.eurc, 6)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">$ {(Number(formatUnits(balances.eurc, 6)) * 1.08).toFixed(2)}</span>
                </div>
              </div>

              {/* AZD */}
              <div className="flex items-center justify-between p-4 immersive-input-box hover:scale-[1.01] hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getLogoForToken('AZD')}</span>
                  <div>
                    <span className="font-bold text-white text-sm">ArcZode Protocol Token</span>
                    <span className="text-[10px] text-slate-500 block">AZD Reward Utility</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-white text-base">
                    {Number(formatUnits(balances.azd, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                  </span>
                  <span className="text-[10px] text-brand-success block font-semibold">Staking Yield Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* User History List */}
          <div className="glass-card p-6">
            <h3 className="font-display font-black text-lg text-white tracking-wide uppercase mb-6 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-brand-accent" />
              My Transactions
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-brand-blue/20 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="pb-3 pl-2">Action</th>
                    <th className="pb-3 text-right">Inflow</th>
                    <th className="pb-3 text-right pr-2">Outflow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-blue/10 text-sm font-sans">
                  {userSwaps.map((tx, idx) => {
                    const isUSDCIn = tx.tokenIn.toLowerCase() === USDC_ADDRESS.toLowerCase();
                    return (
                      <tr key={idx} className="hover:bg-brand-blue/5 transition-colors">
                        <td className="py-3 pl-2">
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-brand-blue/15 text-brand-accent border border-brand-blue/25">
                            Swap {isUSDCIn ? 'USDC → EURC' : 'EURC → USDC'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-mono text-slate-300">
                          {Number(formatUnits(tx.amountIn, 6)).toFixed(2)} {isUSDCIn ? 'USDC' : 'EURC'}
                        </td>
                        <td className="py-3 text-right pr-2 font-mono text-brand-gold">
                          +{Number(formatUnits(tx.amountOut, 6)).toFixed(2)} {isUSDCIn ? 'EURC' : 'USDC'}
                        </td>
                      </tr>
                    );
                  })}

                  {userSwaps.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500 text-xs">
                        No transactions found for this account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Positions Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-gold to-brand-blue" />
            <h3 className="font-display font-black text-lg text-white tracking-wide uppercase mb-6 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-brand-accent" />
              Liquidity & Yield Status
            </h3>

            <div className="space-y-5">
              {/* Pool 1 Share */}
              {userLP1 > 0n && (
                <div className="p-4 immersive-input-box space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-bold">USDC / EURC Pool Position</span>
                    <span className="font-mono text-brand-gold font-bold">
                      {shareOfPool1.toFixed(4)}%
                    </span>
                  </div>
                  <div className="border-t border-white/5 pt-2.5 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Underlying USDC</span>
                      <span className="font-mono text-white">{Number(formatUnits(userOwnedUSDC1, 6)).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Underlying EURC</span>
                      <span className="font-mono text-white">{Number(formatUnits(userOwnedEURC1, 6)).toFixed(2)} EURC</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pool 2 Share */}
              {userLP2 > 0n && (
                <div className="p-4 immersive-input-box space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-bold">USDC / AZD Pool Position</span>
                    <span className="font-mono text-brand-gold font-bold">
                      {shareOfPool2.toFixed(4)}%
                    </span>
                  </div>
                  <div className="border-t border-white/5 pt-2.5 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Underlying USDC</span>
                      <span className="font-mono text-white">{Number(formatUnits(userOwnedUSDC2, 6)).toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Underlying AZD</span>
                      <span className="font-mono text-white">{Number(formatUnits(userOwnedAZD2, 18)).toFixed(4)} AZD</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pool 3 Share */}
              {userLP3 > 0n && (
                <div className="p-4 immersive-input-box space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-200 font-bold">EURC / AZD Pool Position</span>
                    <span className="font-mono text-brand-gold font-bold">
                      {shareOfPool3.toFixed(4)}%
                    </span>
                  </div>
                  <div className="border-t border-white/5 pt-2.5 space-y-1.5 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Underlying EURC</span>
                      <span className="font-mono text-white">{Number(formatUnits(userOwnedEURC3, 6)).toFixed(2)} EURC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Underlying AZD</span>
                      <span className="font-mono text-white">{Number(formatUnits(userOwnedAZD3, 18)).toFixed(4)} AZD</span>
                    </div>
                  </div>
                </div>
              )}

              {userLP1 === 0n && userLP2 === 0n && userLP3 === 0n && (
                <div className="p-4 border border-dashed border-brand-blue/30 rounded-xl text-center py-6">
                  <p className="text-xs text-slate-500">No active Liquidity Pool positions.</p>
                  <button
                    onClick={() => navigate('/liquidity')}
                    className="mt-2.5 px-4 py-1.5 bg-brand-blue/15 hover:bg-brand-blue/25 text-brand-accent font-bold text-[10px] uppercase rounded-lg tracking-wider transition-colors cursor-pointer"
                  >
                    Provide Liquidity
                  </button>
                </div>
              )}

              {/* Staking Status */}
              <div className="p-4 immersive-input-box flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400">Compounding Staked AZD</span>
                  <span className="text-[10px] text-brand-success block font-semibold">18.5% Staking Yield</span>
                </div>
                <span className="font-mono font-bold text-brand-gold text-sm glow-gold">
                  {Number(formatUnits(multiUserInfo.stakedAZD, 18)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{' '}
                  AZD
                </span>
              </div>

              {/* Faucet Claim Status */}
              <div className="p-4 immersive-input-box flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 text-xs">AZD Protocol Faucet</span>
                  <span className="text-[10px] text-slate-500 block">10.00 AZD claim limits</span>
                </div>
                {multiUserInfo.hasClaimed ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-success bg-brand-success/10 px-2.5 py-1 rounded-md border border-brand-success/20 select-none">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Claimed
                  </span>
                ) : (
                  <button
                    onClick={() => navigate('/faucet')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-gold bg-brand-gold/15 hover:bg-brand-gold/25 px-2.5 py-1 rounded-md border border-brand-gold/30 transition-colors cursor-pointer"
                  >
                    <Gift className="w-3.5 h-3.5 animate-pulse" />
                    Claim Faucet
                  </button>
                )}
              </div>

              {/* Rewards Accumulator (Contract 1) */}
              <div className="p-4 bg-[#FFD700]/5 border border-[#FFD700]/25 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400">Total Unclaimed Rewards</span>
                  <span className="text-[10px] text-slate-500 block">Pending distribution</span>
                </div>
                <span className="font-mono font-bold text-brand-gold text-sm glow-gold">
                  {Number(formatUnits(multiUserInfo.azdRewards, 18)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })}{' '}
                  AZD
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
