/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { formatUnits, parseUnits } from 'viem';
import { ArrowDown, Info, RefreshCw, Settings, HelpCircle, Wallet } from 'lucide-react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useBlockchain } from '../hooks/useBlockchain';
import { getLogoForToken, parseBlockchainError } from '../utils';
import { useToast } from '../components/Toast';
import {
  DEX_ADDRESS,
  DEX2_ADDRESS,
  USDC_ADDRESS,
  EURC_ADDRESS,
  AZD_ADDRESS,
  DEX_ABI,
  ERC20_ABI,
} from '../contracts';

export default function Swap() {
  const { address, isConnected } = useAccount();
  const { addToast } = useToast();
  const {
    balances,
    currentPrice,
    multiPoolInfo,
    getSwapOutputPreviewMulti,
    swapTokensMulti,
    isLoading,
    localMode,
  } = useBlockchain();

  const [selectedPair, setSelectedPair] = useState<'USDC/EURC' | 'USDC/AZD' | 'EURC/AZD'>('USDC/EURC');
  const [fromToken, setFromToken] = useState<'USDC' | 'EURC' | 'AZD'>('USDC');
  const [toToken, setToToken] = useState<'USDC' | 'EURC' | 'AZD'>('EURC');
  const [amountIn, setAmountIn] = useState<string>('');
  const [slippage, setSlippage] = useState<string>('0.5');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);

  // Update token direction when changing pair
  useEffect(() => {
    if (selectedPair === 'USDC/EURC') {
      setFromToken('USDC');
      setToToken('EURC');
    } else if (selectedPair === 'USDC/AZD') {
      setFromToken('USDC');
      setToToken('AZD');
    } else if (selectedPair === 'EURC/AZD') {
      setFromToken('EURC');
      setToToken('AZD');
    }
    setAmountIn('');
  }, [selectedPair]);

  // Decimals helper
  const getDecimals = (symbol: 'USDC' | 'EURC' | 'AZD') => (symbol === 'AZD' ? 18 : 6);

  // Debounce the amountIn input to avoid excessive RPC requests
  const [debouncedAmountIn, setDebouncedAmountIn] = useState<string>('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedAmountIn(amountIn);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [amountIn]);

  const parsedDebouncedAmountIn = (() => {
    if (!debouncedAmountIn || isNaN(Number(debouncedAmountIn)) || Number(debouncedAmountIn) <= 0) {
      return 0n;
    }
    const decIn = getDecimals(fromToken);
    try {
      return parseUnits(debouncedAmountIn, decIn);
    } catch {
      return 0n;
    }
  })();

  const tokenAddress = fromToken === 'USDC' ? USDC_ADDRESS : fromToken === 'EURC' ? EURC_ADDRESS : AZD_ADDRESS;
  const spenderAddress = DEX2_ADDRESS;

  // On-chain allowance query (Contract 2)
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address && spenderAddress ? [address, spenderAddress] : undefined,
    query: {
      enabled: isConnected && !localMode && !!address && !!spenderAddress,
    },
  });

  // Routing calculation for USDC <-> EURC via AZD using live reserves from Pool 2 and Pool 3
  const routePreview = (() => {
    if (selectedPair !== 'USDC/EURC') {
      return { output: '0.00', intermediateAZD: '0.00', priceImpact: 0, spotPrice: 0 };
    }
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
      return { output: '0.00', intermediateAZD: '0.00', priceImpact: 0, spotPrice: 0 };
    }

    try {
      if (fromToken === 'USDC' && toToken === 'EURC') {
        // Step 1: USDC -> AZD
        const amountInUSDC = parseUnits(amountIn, 6);
        const fee1 = (amountInUSDC * 3n) / 1000n;
        const afterFee1 = amountInUSDC - fee1;

        const usdcReserve2 = multiPoolInfo.pool2.usdcReserve;
        const azdReserve2 = multiPoolInfo.pool2.azdReserve;

        if (usdcReserve2 === 0n || azdReserve2 === 0n) {
          return { output: '0.00', intermediateAZD: '0.00', priceImpact: 0, spotPrice: 0 };
        }

        const outputAZD = (afterFee1 * azdReserve2) / (usdcReserve2 + afterFee1);

        // Step 2: AZD -> EURC
        const fee2 = (outputAZD * 3n) / 1000n;
        const afterFee2 = outputAZD - fee2;

        const eurcReserve3 = multiPoolInfo.pool3.eurcReserve;
        const azdReserve3 = multiPoolInfo.pool3.azdReserve;

        if (eurcReserve3 === 0n || azdReserve3 === 0n) {
          return { output: '0.00', intermediateAZD: '0.00', priceImpact: 0, spotPrice: 0 };
        }

        const outputEURC = (afterFee2 * eurcReserve3) / (azdReserve3 + afterFee2);

        // Calculations in JS numbers
        const spotRateUSDC_AZD = (Number(azdReserve2) / 1e18) / (Number(usdcReserve2) / 1e6);
        const spotRateAZD_EURC = (Number(eurcReserve3) / 1e6) / (Number(azdReserve3) / 1e18);
        const spotPrice = spotRateUSDC_AZD * spotRateAZD_EURC;

        const actualRate = Number(outputEURC) / Number(amountInUSDC);
        const priceImpact = Math.max(0, ((spotPrice - actualRate) / spotPrice) * 100);

        return {
          output: formatUnits(outputEURC, 6),
          intermediateAZD: formatUnits(outputAZD, 18),
          priceImpact,
          spotPrice,
        };
      } else {
        // Step 1: EURC -> AZD
        const amountInEURC = parseUnits(amountIn, 6);
        const fee1 = (amountInEURC * 3n) / 1000n;
        const afterFee1 = amountInEURC - fee1;

        const eurcReserve3 = multiPoolInfo.pool3.eurcReserve;
        const azdReserve3 = multiPoolInfo.pool3.azdReserve;

        if (eurcReserve3 === 0n || azdReserve3 === 0n) {
          return { output: '0.00', intermediateAZD: '0.00', priceImpact: 0, spotPrice: 0 };
        }

        const outputAZD = (afterFee1 * azdReserve3) / (eurcReserve3 + afterFee1);

        // Step 2: AZD -> USDC
        const fee2 = (outputAZD * 3n) / 1000n;
        const afterFee2 = outputAZD - fee2;

        const usdcReserve2 = multiPoolInfo.pool2.usdcReserve;
        const azdReserve2 = multiPoolInfo.pool2.azdReserve;

        if (usdcReserve2 === 0n || azdReserve2 === 0n) {
          return { output: '0.00', intermediateAZD: '0.00', priceImpact: 0, spotPrice: 0 };
        }

        const outputUSDC = (afterFee2 * usdcReserve2) / (azdReserve2 + afterFee2);

        // Spot price calculation
        const spotRateEURC_AZD = (Number(azdReserve3) / 1e18) / (Number(eurcReserve3) / 1e6);
        const spotRateAZD_USDC = (Number(usdcReserve2) / 1e6) / (Number(azdReserve2) / 1e18);
        const spotPrice = spotRateEURC_AZD * spotRateAZD_USDC;

        const actualRate = Number(outputUSDC) / Number(amountInEURC);
        const priceImpact = Math.max(0, ((spotPrice - actualRate) / spotPrice) * 100);

        return {
          output: formatUnits(outputUSDC, 6),
          intermediateAZD: formatUnits(outputAZD, 18),
          priceImpact,
          spotPrice,
        };
      }
    } catch (e) {
      console.error('Error calculating route preview:', e);
      return { output: '0.00', intermediateAZD: '0.00', priceImpact: 0, spotPrice: 0 };
    }
  })();

  // Manage estimated output state in real-time
  const [estimatedOutput, setEstimatedOutput] = useState<string>('0.00');

  useEffect(() => {
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) {
      setEstimatedOutput('0.00');
      return;
    }

    if (selectedPair === 'USDC/EURC') {
      setEstimatedOutput(routePreview.output);
    } else {
      // Contract 2 pairs (USDC/AZD, EURC/AZD)
      const localPreview = getSwapOutputPreviewMulti(fromToken, toToken, amountIn);
      setEstimatedOutput(localPreview.output);
    }
  }, [
    amountIn,
    selectedPair,
    fromToken,
    toToken,
    routePreview.output,
    getSwapOutputPreviewMulti,
  ]);

  // Sync allowance periodically or on user transition
  useEffect(() => {
    if (isConnected && !localMode) {
      refetchAllowance();
    }
  }, [isConnected, localMode, selectedPair, fromToken, refetchAllowance, amountIn]);

  // Standard allowance & approval transactions
  const { writeContractAsync: writeApproveContractAsync, data: approveTxHash } = useWriteContract();

  const { isSuccess: isApprovalConfirmed, isLoading: isWaitingForApprovalReceipt } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const [isApproveSubmitting, setIsApproveSubmitting] = useState(false);

  const handleApprove = async () => {
    if (!isConnected) return;
    setIsApproveSubmitting(true);
    try {
      addToast('info', 'Approving Token', `Requesting wallet approval for ${fromToken}...`);
      
      const hash = await writeApproveContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, parsedDebouncedAmountIn],
      } as any);

      addToast('info', 'Approval Pending', 'Confirming approval on-chain...', hash);
    } catch (err: any) {
      console.error('Approval failed:', err);
      setIsApproveSubmitting(false);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
    }
  };

  useEffect(() => {
    if (isApprovalConfirmed) {
      setIsApproveSubmitting(false);
      addToast('success', 'Approval Confirmed!', `${fromToken} is now approved for trading.`);
      refetchAllowance();
    }
  }, [isApprovalConfirmed, fromToken, refetchAllowance, addToast]);

  // Determine if approval is required on-chain
  const needsApproval = 
    isConnected && 
    !localMode && 
    amountIn && 
    Number(amountIn) > 0 && 
    !isApprovalConfirmed && 
    (allowance === undefined || (allowance as bigint) < parsedDebouncedAmountIn);

  const preview = getSwapOutputPreviewMulti(fromToken, toToken, amountIn);
  const activePreview = selectedPair === 'USDC/EURC' ? routePreview : preview;

  const fromBalance = isConnected
    ? (fromToken === 'USDC' ? balances.usdc : fromToken === 'EURC' ? balances.eurc : balances.azd)
    : 0n;

  const toBalance = isConnected
    ? (toToken === 'USDC' ? balances.usdc : toToken === 'EURC' ? balances.eurc : balances.azd)
    : 0n;

  const handleMax = () => {
    if (!isConnected) {
      addToast('warning', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    const dec = getDecimals(fromToken);
    const formattedBal = formatUnits(fromBalance, dec);
    setAmountIn(formattedBal);
  };

  const handleSwitch = () => {
    if (!isConnected) {
      addToast('warning', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    setIsRotating(true);
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setAmountIn('');
    setTimeout(() => setIsRotating(false), 500);
  };

  const handleSwapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      addToast('warning', 'Wallet Not Connected', 'Please connect your wallet first.');
      return;
    }
    if (!amountIn || Number(amountIn) <= 0) return;

    if (selectedPair === 'USDC/EURC') {
      const success1 = await swapTokensMulti(fromToken, 'AZD', amountIn);
      if (!success1) {
        addToast('error', 'Trade Cancelled', 'Step 1 (Swap to AZD) failed or was cancelled.');
        return;
      }

      const success2 = await swapTokensMulti('AZD', toToken, routePreview.intermediateAZD);
      if (!success2) {
        addToast('error', 'Trade Cancelled', `Step 2 (Swap AZD to ${toToken}) failed or was cancelled.`);
        return;
      }

      setAmountIn('');
    } else {
      await swapTokensMulti(fromToken, toToken, amountIn);
      setAmountIn('');
    }
  };

  // Get dynamic spot price
  const getSpotPrice = () => {
    if (fromToken === 'USDC' && toToken === 'EURC') {
      const usdcReserve2 = multiPoolInfo.pool2.usdcReserve;
      const azdReserve2 = multiPoolInfo.pool2.azdReserve;
      const eurcReserve3 = multiPoolInfo.pool3.eurcReserve;
      const azdReserve3 = multiPoolInfo.pool3.azdReserve;

      if (usdcReserve2 === 0n || azdReserve2 === 0n || eurcReserve3 === 0n || azdReserve3 === 0n) {
        return currentPrice > 0 ? currentPrice : 1.05;
      }

      const spotRateUSDC_AZD = (Number(azdReserve2) / 1e18) / (Number(usdcReserve2) / 1e6);
      const spotRateAZD_EURC = (Number(eurcReserve3) / 1e6) / (Number(azdReserve3) / 1e18);
      return spotRateUSDC_AZD * spotRateAZD_EURC;
    }
    if (fromToken === 'EURC' && toToken === 'USDC') {
      const usdcReserve2 = multiPoolInfo.pool2.usdcReserve;
      const azdReserve2 = multiPoolInfo.pool2.azdReserve;
      const eurcReserve3 = multiPoolInfo.pool3.eurcReserve;
      const azdReserve3 = multiPoolInfo.pool3.azdReserve;

      if (usdcReserve2 === 0n || azdReserve2 === 0n || eurcReserve3 === 0n || azdReserve3 === 0n) {
        return currentPrice > 0 ? 1 / currentPrice : 0.95;
      }

      const spotRateUSDC_AZD = (Number(azdReserve2) / 1e18) / (Number(usdcReserve2) / 1e6);
      const spotRateAZD_EURC = (Number(eurcReserve3) / 1e6) / (Number(azdReserve3) / 1e18);
      const spotPrice = spotRateUSDC_AZD * spotRateAZD_EURC;
      return spotPrice > 0 ? 1 / spotPrice : 0;
    }

    if (fromToken === 'USDC' && toToken === 'AZD') {
      const usdc = Number(multiPoolInfo.pool2.usdcReserve) / 1e6;
      const azd = Number(multiPoolInfo.pool2.azdReserve) / 1e18;
      return usdc > 0 ? azd / usdc : 0.5;
    }
    if (fromToken === 'AZD' && toToken === 'USDC') {
      const usdc = Number(multiPoolInfo.pool2.usdcReserve) / 1e6;
      const azd = Number(multiPoolInfo.pool2.azdReserve) / 1e18;
      return azd > 0 ? usdc / azd : 2.0;
    }

    if (fromToken === 'EURC' && toToken === 'AZD') {
      const eurc = Number(multiPoolInfo.pool3.eurcReserve) / 1e6;
      const azd = Number(multiPoolInfo.pool3.azdReserve) / 1e18;
      return eurc > 0 ? azd / eurc : 0.5;
    }
    if (fromToken === 'AZD' && toToken === 'EURC') {
      const eurc = Number(multiPoolInfo.pool3.eurcReserve) / 1e6;
      const azd = Number(multiPoolInfo.pool3.azdReserve) / 1e18;
      return azd > 0 ? eurc / azd : 2.0;
    }

    return 0;
  };

  const spotPrice = getSpotPrice();

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
            Please connect your wallet to view balances and swap stablecoins on Arc.
          </p>
        </div>
        <div className="flex justify-center pt-2">
          <ConnectButton />
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
      className="max-w-md mx-auto py-6"
    >
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-blue to-brand-gold" />

        {/* Swap Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-black text-2xl tracking-wide text-white uppercase">Swap</h2>
            <span className="text-[10px] bg-brand-gold/15 text-brand-gold font-bold font-mono px-2 py-0.5 rounded border border-brand-gold/25">
              Arc DEX
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-brand-blue/10 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Token Pair Selectors */}
        <div className="grid grid-cols-3 gap-2 mb-6 p-1 rounded-xl bg-brand-blue/5 border border-brand-blue/15">
          {(['USDC/EURC', 'USDC/AZD', 'EURC/AZD'] as const).map((pair) => (
            <button
              key={pair}
              type="button"
              onClick={() => setSelectedPair(pair)}
              className={`py-2 text-[11px] font-bold tracking-wider rounded-lg uppercase transition-all duration-300 ${
                selectedPair === pair
                  ? 'bg-gradient-to-r from-brand-gold/20 to-brand-accent/20 border border-brand-gold/40 text-brand-gold shadow-[0_0_15px_rgba(255,215,0,0.1)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {pair}
            </button>
          ))}
        </div>

        {/* Settings Box */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-4 p-3 bg-[#00010F] border border-brand-blue/30 rounded-xl space-y-2.5 text-xs text-slate-400"
          >
            <div className="font-semibold text-white font-display uppercase tracking-wider">Transaction Settings</div>
            <div className="flex items-center justify-between">
              <span>Slippage Tolerance</span>
              <div className="flex gap-1.5">
                {['0.1', '0.5', '1.0'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSlippage(val)}
                    className={`px-2 py-1 rounded font-mono ${
                      slippage === val
                        ? 'bg-brand-gold text-black font-bold'
                        : 'bg-brand-blue/10 hover:bg-brand-blue/25 text-slate-300'
                    }`}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500">
              <span>Your transaction will revert if the price changes unfavorably.</span>
            </div>
          </motion.div>
        )}

        {/* Swap Form */}
        <form onSubmit={handleSwapSubmit} className="space-y-4">
          
          {/* From Input Section */}
          <div className="immersive-input-box p-4 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>From</span>
              <span className="flex items-center gap-1">
                Balance:{' '}
                <span className="font-mono text-white font-semibold">
                  {Number(formatUnits(fromBalance, getDecimals(fromToken))).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
                <button
                  type="button"
                  onClick={handleMax}
                  className="ml-1 text-[10px] text-brand-gold hover:underline font-bold font-mono cursor-pointer"
                >
                  MAX
                </button>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="0.00"
                step="any"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="w-full bg-transparent text-white text-3xl font-black font-orbitron focus:outline-none placeholder:text-slate-700"
              />
              <button
                type="button"
                className="flex items-center gap-2 px-3.5 py-2 bg-white/5 border border-white/10 text-sm font-black rounded-xl uppercase tracking-wider text-white select-none"
              >
                {getLogoForToken(fromToken)}
                <span>{fromToken}</span>
              </button>
            </div>
          </div>

          {/* Switch Button */}
          <div className="flex justify-center -my-3.5 relative z-10">
            <motion.button
              type="button"
              onClick={handleSwitch}
              animate={{ rotate: isRotating ? 180 : 0 }}
              transition={{ duration: 0.4 }}
              className="w-10 h-10 rounded-xl bg-brand-blue border-4 border-dark-bg flex items-center justify-center text-white shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
              </svg>
            </motion.button>
          </div>

          {/* To Input Section */}
          <div className="immersive-input-box p-4 space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>To (Estimated)</span>
              <span>
                Balance:{' '}
                <span className="font-mono">
                  {Number(formatUnits(toBalance, getDecimals(toToken))).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-3xl font-black font-orbitron text-slate-200">
                {estimatedOutput === '—'
                  ? '—'
                  : estimatedOutput === '0.00' || !amountIn
                  ? '0.00'
                  : isNaN(Number(estimatedOutput))
                  ? '—'
                  : Number(estimatedOutput).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 4,
                    })}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 bg-white/5 border border-white/10 text-sm font-black rounded-xl uppercase tracking-wider text-slate-300">
                {getLogoForToken(toToken)}
                <span>{toToken}</span>
              </div>
            </div>
          </div>

          {/* Auto-routing Path explanation */}
          {selectedPair === 'USDC/EURC' && amountIn && Number(amountIn) > 0 && (
            <div className="bg-brand-blue/10 border border-brand-blue/30 rounded-xl p-3 text-xs space-y-2">
              <div className="font-semibold text-white uppercase tracking-wider text-[10px]">
                Auto-Routing Path (via AZD)
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{amountIn} {fromToken}</span>
                </div>
                <span className="text-slate-500">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">
                    {Number(routePreview.intermediateAZD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} AZD
                  </span>
                </div>
                <span className="text-slate-500">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-brand-gold">
                    {Number(estimatedOutput).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {toToken}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 leading-normal">
                This contract does not have a direct {fromToken}/{toToken} pool. The trade is automatically routed through the {fromToken}/AZD and {toToken}/AZD pools in two steps.
              </div>
            </div>
          )}

          {/* Exchange Rate details */}
          <div className="bg-[#000820]/60 border border-brand-blue/20 backdrop-blur-xl rounded-xl p-3 text-xs space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Exchange Rate</span>
              <span className="font-mono text-slate-200">
                1 {fromToken} = {spotPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
                {toToken}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Slippage Tolerance</span>
              <span className="font-mono text-slate-200">{slippage}%</span>
            </div>
            <div className="flex justify-between">
              <span>Network Fee</span>
              <span className="text-brand-success font-semibold">Free (Gas covered)</span>
            </div>
            <div className="flex justify-between">
              <span>Price Impact</span>
              <span className={`${activePreview.priceImpact > 2 ? 'text-brand-danger' : 'text-brand-success'} font-semibold font-mono`}>
                {activePreview.priceImpact.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Action Button */}
          {needsApproval ? (
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproveSubmitting || isWaitingForApprovalReceipt || !amountIn || Number(amountIn) <= 0}
              className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-accent text-[#00010F] font-black text-lg shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isApproveSubmitting || isWaitingForApprovalReceipt ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Approving {fromToken}...</span>
                </>
              ) : (
                <span>Approve {fromToken}</span>
              )}
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !amountIn || Number(amountIn) <= 0}
              className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-brand-gold to-brand-accent text-[#00010F] font-black text-lg shadow-[0_0_30px_rgba(255,215,0,0.3)] hover:shadow-[0_0_40px_rgba(255,215,0,0.5)] transition-all duration-300 transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Processing Swap...</span>
                </>
              ) : localMode ? (
                <span>Approve + Swap</span>
              ) : (
                <span>Swap On Arc</span>
              )}
            </button>
          )}
        </form>

        {/* Transaction guide info */}
        <div className="mt-4 text-center">
          <p className="text-[10px] text-slate-500 leading-normal">
            Transactions are routing directly through the Arc Testnet router contracts.<br />
            Make sure you have configured your Metamask with Arc Testnet RPC.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
