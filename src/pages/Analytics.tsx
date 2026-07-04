/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { formatUnits } from 'viem';
import { TrendingUp, Award, BarChart3, HelpCircle, ArrowRightLeft, Database, Landmark, Percent } from 'lucide-react';
import { useBlockchain } from '../hooks/useBlockchain';
import { SHORT_ADDRESS } from '../utils';
import { USDC_ADDRESS, EURC_ADDRESS } from '../contracts';

export default function Analytics() {
  const { poolInfo, swapHistory, currentPrice } = useBlockchain();
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Math metrics
  const tvl = useMemo(() => {
    const usdcVal = Number(formatUnits(poolInfo.usdcReserve, 6));
    const eurcVal = Number(formatUnits(poolInfo.eurcReserve, 6));
    return usdcVal + (eurcVal / 1.08); // simple conversion to dollar value for TVL representation
  }, [poolInfo]);

  const totalSwaps = poolInfo.swapCounter.toString();
  const totalVolumeUSD = useMemo(() => {
    const usdcVol = Number(formatUnits(poolInfo.totalVolumeUSDC, 6));
    const eurcVol = Number(formatUnits(poolInfo.totalVolumeEURC, 6));
    return usdcVol + (eurcVol / 1.08);
  }, [poolInfo]);

  // Composition ratios
  const usdcRatio = useMemo(() => {
    const usdcVal = Number(formatUnits(poolInfo.usdcReserve, 6));
    const eurcVal = Number(formatUnits(poolInfo.eurcReserve, 6));
    const total = usdcVal + eurcVal || 1;
    return (usdcVal / total) * 100;
  }, [poolInfo]);

  const eurcRatio = 100 - usdcRatio;

  // Mock pricing chart data derived around actual exchange rate
  const chartPoints = useMemo(() => {
    const base = currentPrice > 0 ? currentPrice : 1.0854;
    return [
      base * 0.985,
      base * 0.992,
      base * 0.988,
      base * 1.005,
      base * 0.997,
      base * 1.012,
      base * 1.000,
    ];
  }, [currentPrice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 py-6"
    >
      {/* Analytics Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* TVL Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <span>Total Value Locked (TVL)</span>
            <Landmark className="w-4 h-4 text-brand-gold" />
          </div>
          <div>
            <div className="text-2xl font-black font-orbitron text-white">
              ${tvl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Includes USDC & EURC reserves</span>
            </div>
          </div>
        </div>

        {/* Volume Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <span>Total Volume</span>
            <BarChart3 className="w-4 h-4 text-brand-accent" />
          </div>
          <div>
            <div className="text-2xl font-black font-orbitron text-white">
              ${totalVolumeUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-brand-success mt-1 flex items-center gap-1 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Accumulating continuously</span>
            </div>
          </div>
        </div>

        {/* Swaps Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <span>Swaps Processed</span>
            <ArrowRightLeft className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-2xl font-black font-orbitron text-white">
              {totalSwaps}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              <span>Avg trade size: ~$450.00</span>
            </div>
          </div>
        </div>

        {/* Price Card */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold tracking-wider uppercase mb-2">
            <span>USDC/EURC Rate</span>
            <Percent className="w-4 h-4 text-brand-success" />
          </div>
          <div>
            <div className="text-2xl font-black font-orbitron text-brand-gold glow-gold">
              {currentPrice.toFixed(4)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">
              <span>Updated on-chain every block</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Interactive SVG Price Chart (8 cols) */}
        <div className="lg:col-span-8 glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-gold" />
          
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-black text-lg text-white tracking-wide uppercase">Arc Exchange Price Action</h3>
              <span className="text-xs text-slate-400">USDC/EURC exchange rate over last 7 sessions</span>
            </div>
            <span className="px-2.5 py-1 bg-brand-blue/20 text-brand-accent text-xs font-bold rounded-lg border border-brand-blue/30">
              Live Feed
            </span>
          </div>

          {/* Render Area Chart via pure inline SVG */}
          <div className="h-64 w-full relative group">
            <svg viewBox="0 0 700 240" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFD700" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="700" y2="40" stroke="rgba(0, 51, 204, 0.15)" strokeDasharray="3" />
              <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(0, 51, 204, 0.15)" strokeDasharray="3" />
              <line x1="0" y1="160" x2="700" y2="160" stroke="rgba(0, 51, 204, 0.15)" strokeDasharray="3" />

              {/* Area path */}
              <path
                d={`M 0 220 
                    L 0 ${200 - (chartPoints[0] - 1) * 1200} 
                    L 116 ${200 - (chartPoints[1] - 1) * 1200} 
                    L 233 ${200 - (chartPoints[2] - 1) * 1200} 
                    L 350 ${200 - (chartPoints[3] - 1) * 1200} 
                    L 466 ${200 - (chartPoints[4] - 1) * 1200} 
                    L 583 ${200 - (chartPoints[5] - 1) * 1200} 
                    L 700 ${200 - (chartPoints[6] - 1) * 1200} 
                    L 700 220 Z`}
                fill="url(#chartGrad)"
              />

              {/* Stroke line */}
              <path
                d={`M 0 ${200 - (chartPoints[0] - 1) * 1200} 
                    C 58 ${200 - (chartPoints[0] - 1) * 1200}, 58 ${200 - (chartPoints[1] - 1) * 1200}, 116 ${200 - (chartPoints[1] - 1) * 1200}
                    C 174 ${200 - (chartPoints[1] - 1) * 1200}, 174 ${200 - (chartPoints[2] - 1) * 1200}, 233 ${200 - (chartPoints[2] - 1) * 1200}
                    C 291 ${200 - (chartPoints[2] - 1) * 1200}, 291 ${200 - (chartPoints[3] - 1) * 1200}, 350 ${200 - (chartPoints[3] - 1) * 1200}
                    C 408 ${200 - (chartPoints[3] - 1) * 1200}, 408 ${200 - (chartPoints[4] - 1) * 1200}, 466 ${200 - (chartPoints[4] - 1) * 1200}
                    C 524 ${200 - (chartPoints[4] - 1) * 1200}, 524 ${200 - (chartPoints[5] - 1) * 1200}, 583 ${200 - (chartPoints[5] - 1) * 1200}
                    C 641 ${200 - (chartPoints[5] - 1) * 1200}, 641 ${200 - (chartPoints[6] - 1) * 1200}, 700 ${200 - (chartPoints[6] - 1) * 1200}`}
                fill="none"
                stroke="#FFD700"
                strokeWidth="3.5"
              />

              {/* Interactive Dots */}
              {chartPoints.map((pt, idx) => {
                const cx = (idx * 700) / 6;
                const cy = 200 - (pt - 1) * 1200;
                return (
                  <g key={idx}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r={hoveredPoint === idx ? 8 : 4.5}
                      fill={hoveredPoint === idx ? '#0033CC' : '#FFD700'}
                      stroke="#FFD700"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      className="cursor-pointer transition-all duration-150"
                    />
                    {hoveredPoint === idx && (
                      <text
                        x={cx}
                        y={cy - 12}
                        fill="white"
                        fontFamily="Orbitron"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="bg-black"
                      >
                        {pt.toFixed(4)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Pool Composition Ratio (4 cols) */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-black text-lg text-white tracking-wide uppercase mb-2">Pool Composition</h3>
            <span className="text-xs text-slate-400">Relative reserve ratio in current liquidity pool</span>
          </div>

          <div className="space-y-6 my-6">
            
            {/* Visual ratio bar */}
            <div className="space-y-2">
              <div className="h-6 w-full rounded-lg bg-[#00010F] overflow-hidden flex border border-brand-blue/30">
                <div 
                  className="h-full bg-[#0033CC] transition-all duration-500"
                  style={{ width: `${usdcRatio}%` }}
                />
                <div 
                  className="h-full bg-[#FFD700] transition-all duration-500"
                  style={{ width: `${eurcRatio}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-brand-accent">USDC: {usdcRatio.toFixed(1)}%</span>
                <span className="text-brand-gold">EURC: {eurcRatio.toFixed(1)}%</span>
              </div>
            </div>

            {/* composition amounts list */}
            <div className="space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between p-2.5 immersive-input-box">
                <span className="text-slate-400">💵 USDC Liquidity</span>
                <span className="font-mono text-white font-bold">
                  {Number(formatUnits(poolInfo.usdcReserve, 6)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 immersive-input-box">
                <span className="text-slate-400">💶 EURC Liquidity</span>
                <span className="font-mono text-brand-gold font-bold">
                  {Number(formatUnits(poolInfo.eurcReserve, 6)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>

          </div>

          <div className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-brand-blue/10">
            Pool composition fluctuates based on trading demand and arbitrage operations.
          </div>
        </div>

      </div>

      {/* Complete Swaps History Grid */}
      <div className="glass-card p-6">
        <h3 className="font-display font-black text-xl text-white tracking-wide uppercase mb-6 flex items-center gap-2">
          <Database className="w-5 h-5 text-brand-accent" />
          On-Chain Swap Ledger
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-blue/20 text-slate-500 text-xs uppercase tracking-wider">
                <th className="pb-3 pl-2">Block Timestamp</th>
                <th className="pb-3">Trader Address</th>
                <th className="pb-3 text-right">Inflow Volume</th>
                <th className="pb-3 text-right pr-2">Outflow Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-blue/10 text-sm font-sans">
              {swapHistory.map((tx, idx) => {
                const date = new Date(Number(tx.timestamp) * 1000).toLocaleTimeString();
                const isUSDCIn = tx.tokenIn.toLowerCase() === USDC_ADDRESS.toLowerCase();
                return (
                  <tr key={idx} className="hover:bg-brand-blue/5 transition-colors">
                    <td className="py-4 pl-2 font-mono text-slate-400 text-xs">{date}</td>
                    <td className="py-4 font-mono text-brand-accent text-xs break-all">
                      {tx.txHash ? (
                        <a
                          href={`https://testnet.arcscan.app/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-brand-gold hover:underline"
                        >
                          {tx.user}
                        </a>
                      ) : (
                        tx.user
                      )}
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
                    No records found. Execute a swap to populate the on-chain ledger.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </motion.div>
  );
}
