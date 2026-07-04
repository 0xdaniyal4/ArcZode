/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { formatUnits, parseUnits } from 'viem';
import { ShieldCheck, Coins, Sparkles, RefreshCw, Layers, Copy, Check, Wallet } from 'lucide-react';
import { useAccount, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBlockchain } from '../hooks/useBlockchain';
import { AZD_ADDRESS, DEX2_ADDRESS, DEX2_ABI } from '../contracts';
import { getLogoForToken } from '../utils';
import { useToast } from '../components/Toast';

export default function Stake() {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const {
    userInfo,
    balances,
    multiPoolInfo,
    stakeAZD,
    unstakeAZD,
    claimRewards,
    isLoading,
    localMode,
    refreshData,
  } = useBlockchain();

  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(undefined);

  // Read real-time staked balance from DEX2
  const { data: user2Data, refetch: refetchStakeInfo, isLoading: isReadingStake } = useReadContract({
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
      refetchStakeInfo();
      refreshData();
    }
  }, [isTxConfirmed, refetchStakeInfo, refreshData]);

  // Fetch stakes on mount or address change
  useEffect(() => {
    if (isConnected && !localMode && address) {
      refetchStakeInfo();
    }
  }, [isConnected, localMode, address, refetchStakeInfo]);

  const displayStakedBalance = (user2Data && !localMode)
    ? (user2Data as any)[2] as bigint
    : userInfo.stakedAZD;

  const getAZDPrice = () => {
    try {
      const pool2 = multiPoolInfo?.pool2;
      if (!pool2) return 2.0;
      const usdc = Number(pool2.usdcReserve) / 1e6;
      const azd = Number(pool2.azdReserve) / 1e18;
      return azd > 0 ? usdc / azd : 2.0;
    } catch {
      return 2.0;
    }
  };

  const azdPrice = getAZDPrice();
  const stakedAmountNum = Number(formatUnits(displayStakedBalance, 18));
  const stakedValueUSD = stakedAmountNum * azdPrice;

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
            Please connect your wallet to view balances, staking rewards, and stake AZD tokens on Arc.
          </p>
        </div>
        <div className="flex justify-center pt-2">
          <ConnectButton />
        </div>
      </motion.div>
    );
  }

  const azdBalance = balances.azd;
  const stakedBalance = displayStakedBalance;

  const handleCopy = () => {
    navigator.clipboard.writeText(AZD_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stakeAmount || Number(stakeAmount) <= 0) return;
    const txHash = await stakeAZD(stakeAmount);
    if (txHash) {
      setLastTxHash(txHash);
    }
    setStakeAmount('');
  };

  const getUnstakeButtonState = () => {
    if (isLoading) {
      return {
        disabled: true,
        text: (
          <span className="flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Unstaking...
          </span>
        ),
      };
    }

    if (stakedBalance === 0n) {
      return {
        disabled: true,
        text: 'You have no staked AZD',
      };
    }

    if (!unstakeAmount) {
      return {
        disabled: true,
        text: 'Enter Unstake Amount',
      };
    }

    try {
      const parsedAmount = parseUnits(unstakeAmount, 18);
      if (parsedAmount <= 0n) {
        return {
          disabled: true,
          text: 'Enter Valid Amount',
        };
      }
      if (parsedAmount > stakedBalance) {
        return {
          disabled: true,
          text: 'Amount exceeds staked balance',
        };
      }
    } catch {
      return {
        disabled: true,
        text: 'Invalid Amount',
      };
    }

    return {
      disabled: false,
      text: 'Unstake AZD',
    };
  };

  const { disabled: unstakeDisabled, text: unstakeButtonText } = getUnstakeButtonState();

  const handleUnstakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unstakeAmount) return;

    // 1. Before allowing unstake, read current staked amount using getUserInfo(address)
    let currentStaked = stakedBalance;
    if (!localMode) {
      try {
        const freshData = await refetchStakeInfo();
        if (freshData && freshData.data) {
          currentStaked = (freshData.data as any)[2] as bigint;
        }
      } catch (err) {
        console.error('Error refetching staked balance:', err);
      }
    }

    // 2. Validate amount against fresh staked balance
    if (currentStaked === 0n) {
      addToast('error', 'No staked AZD', 'You have no staked AZD.');
      return;
    }

    let amount: bigint;
    try {
      amount = parseUnits(unstakeAmount, 18);
    } catch {
      addToast('error', 'Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    if (amount <= 0n) {
      addToast('error', 'Invalid Amount', 'Unstake amount must be greater than zero.');
      return;
    }

    if (amount > currentStaked) {
      addToast('error', 'Amount exceeds staked balance', 'You cannot unstake more than your current staked balance.');
      return;
    }

    // 3. Only send transaction if amount is valid and within staked balance
    const txHash = await unstakeAZD(unstakeAmount);
    if (txHash) {
      setLastTxHash(txHash);
      if (localMode) {
        refreshData();
      } else {
        // Refetch immediately to update displayed staked balance after successful transaction
        await refetchStakeInfo();
        await refreshData();
      }
    }
    setUnstakeAmount('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 py-6"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Staking Interface Form (7 cols) */}
        <div className="lg:col-span-7 glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-gold" />

          {/* Tab selectors */}
          <div className="flex border-b border-brand-blue/20 mb-6 gap-2">
            <button
              onClick={() => setActiveTab('stake')}
              className={`pb-3 text-sm font-bold font-display uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'stake'
                  ? 'border-brand-gold text-brand-gold glow-gold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Stake AZD
            </button>
            <button
              onClick={() => setActiveTab('unstake')}
              className={`pb-3 text-sm font-bold font-display uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === 'unstake'
                  ? 'border-brand-gold text-brand-gold glow-gold'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Unstake AZD
            </button>
          </div>

          {/* STAKE FORM */}
          {activeTab === 'stake' && (
            <form onSubmit={handleStakeSubmit} className="space-y-4">
              <div className="immersive-input-box p-4 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Lock Amount</span>
                  <span>Balance: {Number(formatUnits(azdBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} AZD</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="any"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="w-full bg-transparent text-white text-2xl font-black font-orbitron focus:outline-none placeholder:text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setStakeAmount(formatUnits(azdBalance, 18))}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Lock details */}
              <div className="bg-[#000820]/60 border border-[#0033CC]/20 backdrop-blur-xl rounded-xl p-4 space-y-2 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>Current Staking Yield APY</span>
                  <span className="font-mono text-brand-success font-bold">18.50%</span>
                </div>
                <div className="flex justify-between">
                  <span>Lockup Period</span>
                  <span className="text-white">None (Liquid staking)</span>
                </div>
                <div className="flex justify-between">
                  <span>Compounding Interval</span>
                  <span className="text-white">Continuous (Block-by-Block)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !stakeAmount || Number(stakeAmount) <= 0}
                className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-[#00010F] font-black text-lg shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Staking AZD...
                  </span>
                ) : localMode ? (
                  <span>Approve + Stake</span>
                ) : (
                  <span>Approve & Stake On Arc</span>
                )}
              </button>
            </form>
          )}

          {/* UNSTAKE FORM */}
          {activeTab === 'unstake' && (
            <form onSubmit={handleUnstakeSubmit} className="space-y-4">
              <div className="immersive-input-box p-4 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Unstake Amount</span>
                  <span>Staked: {Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 })} AZD</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0.00"
                    step="any"
                    value={unstakeAmount}
                    onChange={(e) => setUnstakeAmount(e.target.value)}
                    className="w-full bg-transparent text-white text-2xl font-black font-orbitron focus:outline-none placeholder:text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setUnstakeAmount(formatUnits(stakedBalance, 18))}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 p-2 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-wider text-slate-300 transition-all cursor-pointer"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={unstakeDisabled}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black font-display tracking-wider uppercase rounded-2xl shadow-[0_0_20px_rgba(225,29,72,0.2)] hover:shadow-[0_0_30px_rgba(225,29,72,0.4)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {unstakeButtonText}
              </button>
            </form>
          )}

          {/* Active Stakes Section */}
          <div className="mt-8 pt-6 border-t border-brand-blue/20">
            <h4 className="font-display font-black text-xs text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-brand-gold" />
              Active Stakes
            </h4>

            {isReadingStake && displayStakedBalance === 0n ? (
              <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-brand-gold" />
                <span>Fetching active stakes...</span>
              </div>
            ) : displayStakedBalance > 0n ? (
              <div className="bg-[#000820]/40 border border-[#0033CC]/15 p-4 rounded-xl flex items-center justify-between animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-gold/10 rounded-full flex items-center justify-center border border-brand-gold/25">
                    {getLogoForToken('AZD')}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-200">AZD Vault</div>
                    <div className="text-[10px] text-brand-success font-semibold">18.50% APY Compounding</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-brand-gold">
                    {Number(formatUnits(displayStakedBalance, 18)).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}{' '}
                    AZD
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ≈ ${stakedValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center text-xs text-slate-500 py-6">
                No active stakes yet
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AZD Token Info & Staking Metrics (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* My Stake Card */}
          <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-gold to-brand-blue" />
            <h3 className="font-display font-black text-xl text-white tracking-wide uppercase mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-gold" />
              Staking Summary
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-brand-blue/10 pb-3">
                <span className="text-slate-400 text-xs">Your Staked AZD</span>
                <span className="font-mono font-bold text-brand-gold text-lg glow-gold">
                  {Number(formatUnits(stakedBalance, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} AZD
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-brand-blue/10 pb-3">
                <span className="text-slate-400 text-xs">Your Wallet Balance</span>
                <span className="font-mono font-semibold text-white">
                  {Number(formatUnits(azdBalance, 18)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZD
                </span>
              </div>
            </div>
          </div>

          {/* Token Info Card */}
          <div className="glass-card p-6 relative overflow-hidden">
            <h3 className="font-display font-black text-lg text-white tracking-wide uppercase mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-accent" />
              AZD Protocol Asset Specs
            </h3>

            <div className="space-y-3.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Total Fixed Supply</span>
                <span className="font-mono text-white">10,000,000 AZD</span>
              </div>
              <div className="flex justify-between">
                <span>Standard</span>
                <span className="font-mono text-white">ERC-20 (Arc EVM Compatible)</span>
              </div>
              <div className="space-y-1">
                <span>Token Address</span>
                <div className="flex items-center gap-1 bg-[#00010F]/60 px-2.5 py-1.5 rounded-xl border border-white/5">
                  <span className="font-mono text-[10px] text-brand-accent select-all break-all">{AZD_ADDRESS}</span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-white/5 rounded transition-colors text-slate-400 hover:text-brand-gold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-brand-success" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
