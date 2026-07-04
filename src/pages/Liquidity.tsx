/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { formatUnits, parseUnits } from 'viem';
import { Plus, Minus, Coins, Percent, RefreshCw, HelpCircle, Wallet } from 'lucide-react';
import { useAccount, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBlockchain } from '../hooks/useBlockchain';
import { getLogoForToken } from '../utils';
import { useToast } from '../components/Toast';
import { DEX_ADDRESS, DEX2_ADDRESS, DEX_ABI, DEX2_ABI } from '../contracts';

export default function Liquidity() {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const {
    multiPoolInfo,
    multiUserInfo,
    balances,
    addLiquidityMulti,
    removeLiquidityMulti,
    claimRewards,
    isLoading,
    localMode,
    refreshData,
  } = useBlockchain();

  const [selectedPool, setSelectedPool] = useState<'pool1' | 'pool2' | 'pool3'>('pool1');
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');

  // Input states
  const [tokenAAddAmount, setTokenAAddAmount] = useState<string>('');
  const [tokenBAddAmount, setTokenBAddAmount] = useState<string>('');
  const [lpRemoveAmount, setLpRemoveAmount] = useState<string>('');
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(undefined);

  // Fetch real-time user info from DEX 1 (Pool 1)
  const { data: dex1UserInfo, refetch: refetchDex1Info, isFetching: isFetchingDex1 } = useReadContract({
    address: DEX_ADDRESS,
    abi: DEX_ABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !localMode && !!address,
    },
  });

  // Fetch real-time user info from DEX 2 (Pool 2 & 3)
  const { data: dex2UserInfo, refetch: refetchDex2Info, isFetching: isFetchingDex2 } = useReadContract({
    address: DEX2_ADDRESS,
    abi: DEX2_ABI,
    functionName: 'getUserInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !localMode && !!address,
    },
  });

  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  });

  useEffect(() => {
    if (isTxConfirmed) {
      refetchDex1Info();
      refetchDex2Info();
      refreshData();
    }
  }, [isTxConfirmed, refetchDex1Info, refetchDex2Info, refreshData]);

  // Refetch positions on mount or wallet address changes
  useEffect(() => {
    if (isConnected && !localMode && address) {
      refetchDex1Info();
      refetchDex2Info();
    }
  }, [isConnected, localMode, address, refetchDex1Info, refetchDex2Info]);

  const realTimeLpBalance1 = (dex1UserInfo && !localMode)
    ? (dex1UserInfo as any)[0] as bigint
    : multiUserInfo.lpBalance1;

  const realTimeLpBalance2 = (dex2UserInfo && !localMode)
    ? (dex2UserInfo as any)[0] as bigint
    : multiUserInfo.lpBalance2;

  const realTimeLpBalance3 = (dex2UserInfo && !localMode)
    ? (dex2UserInfo as any)[1] as bigint
    : multiUserInfo.lpBalance3;

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
            Please connect your wallet to view pool shares, LP positions, and add or remove liquidity on Arc.
          </p>
        </div>
        <div className="flex justify-center pt-2">
          <ConnectButton />
        </div>
      </motion.div>
    );
  }

  // Pool details extraction
  const getPoolConfig = (pool: 'pool1' | 'pool2' | 'pool3') => {
    switch (pool) {
      case 'pool1':
        return {
          name: 'USDC / EURC Pool',
          tokenA: 'USDC' as const,
          tokenB: 'EURC' as const,
          decA: 6,
          decB: 6,
          decLP: 6,
          reserveA: multiPoolInfo.pool1.usdcReserve,
          reserveB: multiPoolInfo.pool1.eurcReserve,
          totalLP: multiPoolInfo.pool1.totalLPTokens,
          userLP: realTimeLpBalance1,
        };
      case 'pool2':
        return {
          name: 'USDC / AZD Pool',
          tokenA: 'USDC' as const,
          tokenB: 'AZD' as const,
          decA: 6,
          decB: 18,
          decLP: 18,
          reserveA: multiPoolInfo.pool2.usdcReserve,
          reserveB: multiPoolInfo.pool2.azdReserve,
          totalLP: multiPoolInfo.pool2.totalLPTokens,
          userLP: realTimeLpBalance2,
        };
      case 'pool3':
        return {
          name: 'EURC / AZD Pool',
          tokenA: 'EURC' as const,
          tokenB: 'AZD' as const,
          decA: 6,
          decB: 18,
          decLP: 18,
          reserveA: multiPoolInfo.pool3.eurcReserve,
          reserveB: multiPoolInfo.pool3.azdReserve,
          totalLP: multiPoolInfo.pool3.totalLPTokens,
          userLP: realTimeLpBalance3,
        };
    }
  };

  const pool = getPoolConfig(selectedPool);

  // Position Calculations
  const poolSharePercent = pool.totalLP > 0n ? (Number(pool.userLP) / Number(pool.totalLP)) * 100 : 0;

  const userOwnedA = pool.totalLP > 0n ? (BigInt(pool.reserveA) * BigInt(pool.userLP)) / BigInt(pool.totalLP) : 0n;
  const userOwnedB = pool.totalLP > 0n ? (BigInt(pool.reserveB) * BigInt(pool.userLP)) / BigInt(pool.totalLP) : 0n;

  // Balance of user wallets
  const balanceA = pool.tokenA === 'USDC' ? balances.usdc : balances.eurc;
  const balanceB = pool.tokenB === 'EURC' ? balances.eurc : balances.azd;

  // Add estimation helper
  const expectedLPMint = (() => {
    const a = Number(tokenAAddAmount) || 0;
    const b = Number(tokenBAddAmount) || 0;
    if (a === 0 && b === 0) return 0;
    return (a + b) / 2; // Linear estimate
  })();

  const newPoolShare = (() => {
    const currentLP = Number(formatUnits(pool.totalLP, pool.decLP));
    const addedLP = expectedLPMint;
    if (addedLP === 0) return poolSharePercent;
    const userLPFormatted = Number(formatUnits(pool.userLP, pool.decLP));
    return ((userLPFormatted + addedLP) / (currentLP + addedLP)) * 100;
  })();

  // Remove estimation helper
  const expectedAWithdrawn = (() => {
    const amt = Number(lpRemoveAmount) || 0;
    if (amt <= 0) return 0;
    const totalLPFormatted = Number(formatUnits(pool.totalLP, pool.decLP));
    const ratio = amt / totalLPFormatted;
    return Number(formatUnits(pool.reserveA, pool.decA)) * ratio;
  })();

  const expectedBWithdrawn = (() => {
    const amt = Number(lpRemoveAmount) || 0;
    if (amt <= 0) return 0;
    const totalLPFormatted = Number(formatUnits(pool.totalLP, pool.decLP));
    const ratio = amt / totalLPFormatted;
    return Number(formatUnits(pool.reserveB, pool.decB)) * ratio;
  })();

  const handleAddLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenAAddAmount || !tokenBAddAmount) return;
    const txHash = await addLiquidityMulti(selectedPool, tokenAAddAmount, tokenBAddAmount);
    if (txHash) {
      setLastTxHash(txHash);
    }
    setTokenAAddAmount('');
    setTokenBAddAmount('');
  };

  const handleRemoveLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpRemoveAmount) return;
    const txHash = await removeLiquidityMulti(selectedPool, lpRemoveAmount);
    if (txHash) {
      setLastTxHash(txHash);
    }
    setLpRemoveAmount('');
  };

  const handleClaimRewards = async () => {
    await claimRewards();
  };

  const changePool = (newPool: 'pool1' | 'pool2' | 'pool3') => {
    setSelectedPool(newPool);
    setTokenAAddAmount('');
    setTokenBAddAmount('');
    setLpRemoveAmount('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 py-6"
    >
      {/* Pool Navigation Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-1 rounded-2xl bg-brand-blue/5 border border-brand-blue/15">
        <button
          onClick={() => changePool('pool1')}
          className={`py-3.5 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
            selectedPool === 'pool1'
              ? 'bg-gradient-to-r from-brand-gold/15 to-brand-accent/15 border border-brand-gold/45 text-brand-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className="flex -space-x-1.5">
            {getLogoForToken('USDC')}
            {getLogoForToken('EURC')}
          </div>
          <span>USDC / EURC Pool</span>
        </button>
        <button
          onClick={() => changePool('pool2')}
          className={`py-3.5 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
            selectedPool === 'pool2'
              ? 'bg-gradient-to-r from-brand-gold/15 to-brand-accent/15 border border-brand-gold/45 text-brand-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className="flex -space-x-1.5">
            {getLogoForToken('USDC')}
            {getLogoForToken('AZD')}
          </div>
          <span>USDC / AZD Pool</span>
        </button>
        <button
          onClick={() => changePool('pool3')}
          className={`py-3.5 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${
            selectedPool === 'pool3'
              ? 'bg-gradient-to-r from-brand-gold/15 to-brand-accent/15 border border-brand-gold/45 text-brand-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <div className="flex -space-x-1.5">
            {getLogoForToken('EURC')}
            {getLogoForToken('AZD')}
          </div>
          <span>EURC / AZD Pool</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Hub (Add/Remove) */}
        <div className="lg:col-span-7 glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-gold" />

          {/* Form Tabs */}
          <div className="flex border-b border-brand-blue/20 mb-6 gap-2">
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-3 text-sm font-bold font-display uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'add'
                  ? 'border-brand-gold text-brand-gold glow-gold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Add Liquidity
            </button>
            <button
              onClick={() => setActiveTab('remove')}
              className={`pb-3 text-sm font-bold font-display uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'remove'
                  ? 'border-brand-gold text-brand-gold glow-gold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Remove Liquidity
            </button>
          </div>

          {/* ADD LIQUIDITY TAB */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddLiquidity} className="space-y-4">
              {/* Asset A Input Box */}
              <div className="immersive-input-box p-4 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Deposit Amount</span>
                  <span>
                    Balance:{' '}
                    {Number(formatUnits(balanceA, pool.decA)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {pool.tokenA}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="any"
                    value={tokenAAddAmount}
                    onChange={(e) => setTokenAAddAmount(e.target.value)}
                    className="w-full bg-transparent text-white text-2xl font-black font-orbitron focus:outline-none placeholder:text-slate-700"
                  />
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 text-xs font-bold rounded-lg uppercase tracking-wider text-white select-none">
                    {getLogoForToken(pool.tokenA)}
                    <span>{pool.tokenA}</span>
                  </div>
                </div>
              </div>

              {/* Plus icon divider */}
              <div className="flex justify-center -my-3.5 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-brand-blue border-4 border-dark-bg flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all">
                  <Plus className="w-5 h-5 stroke-[3]" />
                </div>
              </div>

              {/* Asset B Input Box */}
              <div className="immersive-input-box p-4 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Deposit Amount</span>
                  <span>
                    Balance:{' '}
                    {Number(formatUnits(balanceB, pool.decB)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}{' '}
                    {pool.tokenB}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="any"
                    value={tokenBAddAmount}
                    onChange={(e) => setTokenBAddAmount(e.target.value)}
                    className="w-full bg-transparent text-white text-2xl font-black font-orbitron focus:outline-none placeholder:text-slate-700"
                  />
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 text-xs font-bold rounded-lg uppercase tracking-wider text-slate-300 select-none">
                    {getLogoForToken(pool.tokenB)}
                    <span>{pool.tokenB}</span>
                  </div>
                </div>
              </div>

              {/* Added Details Preview */}
              {expectedLPMint > 0 && (
                <div className="bg-[#000820]/60 border border-brand-blue/20 backdrop-blur-xl rounded-xl p-4 space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Expected LP Tokens</span>
                    <span className="font-mono text-white font-bold">{expectedLPMint.toFixed(4)} LP</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New Pool Share %</span>
                    <span className="font-mono text-brand-gold font-bold">{newPoolShare.toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Weekly AZD Rewards Bonus</span>
                    <span className="font-mono text-brand-success font-semibold">
                      +({(expectedLPMint * 0.14).toFixed(4)} AZD)
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !tokenAAddAmount || !tokenBAddAmount}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-accent text-[#00010F] font-black text-lg shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Adding Liquidity...
                  </span>
                ) : localMode ? (
                  <span>Approve + Deposit</span>
                ) : (
                  <span>Approve & Add Liquidity</span>
                )}
              </button>
            </form>
          )}

          {/* REMOVE LIQUIDITY TAB */}
          {activeTab === 'remove' && (
            <form onSubmit={handleRemoveLiquidity} className="space-y-4">
              <div className="immersive-input-box p-4 space-y-2">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Burn LP Tokens</span>
                  <span>
                    Available:{' '}
                    {Number(formatUnits(pool.userLP, pool.decLP)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{' '}
                    LP
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.0"
                    step="any"
                    value={lpRemoveAmount}
                    onChange={(e) => setLpRemoveAmount(e.target.value)}
                    className="w-full bg-transparent text-white text-2xl font-black font-orbitron focus:outline-none placeholder:text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setLpRemoveAmount(formatUnits(pool.userLP, pool.decLP))}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Remove Details Preview */}
              {expectedAWithdrawn > 0 && (
                <div className="bg-[#000820]/60 border border-brand-blue/20 backdrop-blur-xl rounded-xl p-4 space-y-2 text-xs text-slate-400">
                  <div className="font-semibold text-white uppercase font-display text-[10px] tracking-wider mb-1">
                    Estimated Returns
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">💸 {pool.tokenA} Out</span>
                    <span className="font-mono text-white font-bold">
                      {expectedAWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
                      {pool.tokenA}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-1">💵 {pool.tokenB} Out</span>
                    <span className="font-mono text-white font-bold">
                      {expectedBWithdrawn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
                      {pool.tokenB}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !lpRemoveAmount || Number(lpRemoveAmount) <= 0}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black font-display tracking-wider uppercase rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.2)] hover:shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Removing...
                  </span>
                ) : (
                  <span>Remove Liquidity</span>
                )}
              </button>
            </form>
          )}

          {/* Your Positions Section */}
          <div className="mt-8 pt-6 border-t border-brand-blue/20">
            <h4 className="font-display font-black text-xs text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-brand-gold" />
              Your Liquidity Position
            </h4>

            {(isFetchingDex1 || isFetchingDex2) && pool.userLP === 0n ? (
              <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" />
                <span>Fetching LP balance...</span>
              </div>
            ) : pool.userLP > 0n ? (
              <div className="space-y-3 animate-fadeIn">
                <div className="bg-[#000820]/40 border border-[#0033CC]/15 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5 bg-brand-gold/5 p-1 rounded-full border border-brand-gold/10">
                      {getLogoForToken(pool.tokenA)}
                      {getLogoForToken(pool.tokenB)}
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-200">{pool.name}</div>
                      <div className="text-[10px] text-brand-gold font-semibold">
                        Pool Share: {poolSharePercent.toFixed(4)}%
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono font-bold text-slate-200">
                      {Number(formatUnits(pool.userLP, pool.decLP)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}{' '}
                      LP
                    </div>
                  </div>
                </div>

                {/* Underlying Assets */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      {getLogoForToken(pool.tokenA)}
                      <span>{pool.tokenA} Deposited</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-white">
                      {Number(formatUnits(userOwnedA, pool.decA)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      {getLogoForToken(pool.tokenB)}
                      <span>{pool.tokenB} Deposited</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-white">
                      {Number(formatUnits(userOwnedB, pool.decB)).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center text-xs text-slate-500 py-6">
                No liquidity added yet
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Your Position card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-gold to-brand-blue" />

            <h3 className="font-display font-black text-xl text-white tracking-wide uppercase mb-6 flex items-center gap-2">
              <Coins className="w-5 h-5 text-brand-gold" />
              Your Position ({pool.name})
            </h3>

            {/* Position details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-brand-blue/10 pb-3">
                <span className="text-slate-400 text-xs">LP Tokens Balance</span>
                <span className="font-mono font-bold text-white text-base">
                  {Number(formatUnits(pool.userLP, pool.decLP)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{' '}
                  LP
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-brand-blue/10 pb-3">
                <span className="text-slate-400 text-xs">Pool Share</span>
                <span className="font-mono font-bold text-brand-gold text-base">
                  {poolSharePercent.toFixed(4)}%
                </span>
              </div>

              {/* Equivalent Reserves */}
              <div className="immersive-input-box p-3.5 space-y-2 text-xs">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Underlying Assets Value
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{pool.tokenA} Value</span>
                  <span className="font-mono text-slate-200">
                    {Number(formatUnits(userOwnedA, pool.decA)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{' '}
                    {pool.tokenA}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{pool.tokenB} Value</span>
                  <span className="font-mono text-slate-200">
                    {Number(formatUnits(userOwnedB, pool.decB)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{' '}
                    {pool.tokenB}
                  </span>
                </div>
              </div>

              {/* Pending Rewards (General for LPs staking Contract 1) */}
              <div className="bg-[#FFD700]/5 border border-[#FFD700]/30 backdrop-blur-xl rounded-2xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 bg-[#FFD700]/15 text-[#FFD700] text-[9px] font-bold tracking-widest uppercase rounded-bl">
                  LPs Staking Bonus
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block uppercase tracking-wider">Unclaimed rewards</span>
                  <div className="text-2xl font-black font-orbitron text-brand-gold glow-gold mt-1">
                    {Number(formatUnits(multiUserInfo.azdRewards, 18)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{' '}
                    AZD
                  </div>
                </div>

                <button
                  onClick={handleClaimRewards}
                  disabled={isLoading || multiUserInfo.azdRewards === 0n}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#00010F] font-black font-display text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(255,215,0,0.2)] hover:shadow-[0_0_20px_rgba(255,215,0,0.4)] transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                >
                  Claim AZD Rewards
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
