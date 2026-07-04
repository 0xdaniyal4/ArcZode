/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Coins, CheckCircle2, AlertTriangle, Copy, ExternalLink, HelpCircle } from 'lucide-react';
import { useBlockchain } from '../hooks/useBlockchain';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { DEX2_ADDRESS, AZD_ADDRESS } from '../contracts';
import { SHORT_ADDRESS } from '../utils';
import { useToast } from '../components/Toast';

export default function Faucet() {
  const { isConnected, multiUserInfo, claimAZDFaucet, isLoading } = useBlockchain();
  const { openConnectModal } = useConnectModal();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(DEX2_ADDRESS);
    setCopied(true);
    addToast('success', 'Address Copied', 'Faucet contract address copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="max-w-2xl mx-auto py-12 px-4"
    >
      <div className="text-center space-y-4 mb-10">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-[0_0_20px_rgba(255,215,0,0.15)]">
          <Coins className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-display font-black tracking-tight text-white uppercase">
          AZD PROTOCOL FAUCET
        </h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          Claim free testnet AZD tokens once per wallet address. These tokens can be used to participate in swaps, provide liquidity, and stake inside ArcZode.
        </p>
      </div>

      <div className="glass-card p-8 space-y-8 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 rounded-bl-full pointer-events-none -z-10" />

        {/* Claim Status and Main UI */}
        {!isConnected ? (
          <div className="text-center py-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gold/5 border border-brand-gold/20 text-brand-gold text-xs font-semibold">
              <AlertTriangle className="w-4 h-4" />
              <span>Wallet Disconnected</span>
            </div>
            <p className="text-slate-400 text-sm">
              Please connect your browser Web3 wallet to check eligibility and claim your 10 AZD tokens.
            </p>
            <button
              onClick={openConnectModal}
              className="px-8 py-3.5 bg-gradient-to-r from-brand-gold to-brand-accent text-[#00010F] font-black tracking-wider rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 uppercase text-sm"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Panel */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-brand-blue/10 border border-brand-blue/20">
              <div className="flex items-center gap-4">
                {multiUserInfo.hasClaimed ? (
                  <div className="w-10 h-10 rounded-xl bg-brand-success/10 border border-brand-success/30 flex items-center justify-center text-brand-success">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold animate-pulse">
                    <Coins className="w-6 h-6" />
                  </div>
                )}
                <div className="text-left">
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Your Faucet Eligibility</p>
                  <p className="text-lg font-bold text-white">
                    {multiUserInfo.hasClaimed ? 'Already Claimed' : 'Eligible for 10.00 AZD'}
                  </p>
                </div>
              </div>

              <div>
                {multiUserInfo.hasClaimed ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-success/15 text-brand-success border border-brand-success/25">
                    Claimed
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-gold/15 text-brand-gold border border-brand-gold/25">
                    Active
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 text-center">
              <button
                onClick={claimAZDFaucet}
                disabled={multiUserInfo.hasClaimed || isLoading}
                className={`w-full py-4 rounded-xl font-display font-black tracking-wider transition-all duration-300 uppercase text-base cursor-pointer ${
                  multiUserInfo.hasClaimed
                    ? 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-brand-gold to-brand-accent text-[#00010F] shadow-[0_0_20px_rgba(255,215,0,0.2)] hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transform hover:-translate-y-0.5'
                }`}
              >
                {isLoading ? 'Processing Claim...' : multiUserInfo.hasClaimed ? 'Faucet Already Claimed' : 'Claim 10.00 AZD Tokens'}
              </button>
            </div>
          </div>
        )}

        {/* Contract Info */}
        <div className="pt-6 border-t border-brand-blue/10 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Faucet Contract:</span>
            <div className="flex items-center gap-2">
              <code className="text-slate-300 font-mono bg-brand-blue/20 px-2 py-1 rounded">
                {SHORT_ADDRESS(DEX2_ADDRESS)}
              </code>
              <button
                onClick={copyToClipboard}
                className="p-1 hover:bg-brand-blue/30 text-slate-400 hover:text-white rounded transition-colors"
                title="Copy Address"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={`https://testnet.arcscan.app/address/${DEX2_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:bg-brand-blue/30 text-slate-400 hover:text-white rounded transition-colors"
                title="View on ArcScan"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">AZD Token Contract:</span>
            <div className="flex items-center gap-2">
              <code className="text-slate-300 font-mono bg-brand-blue/20 px-2 py-1 rounded">
                {SHORT_ADDRESS(AZD_ADDRESS)}
              </code>
              <a
                href={`https://testnet.arcscan.app/address/${AZD_ADDRESS}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 hover:bg-brand-blue/30 text-slate-400 hover:text-white rounded transition-colors"
                title="View on ArcScan"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Info FAQ */}
      <div className="mt-8 p-5 bg-brand-blue/5 border border-brand-blue/15 rounded-2xl space-y-3">
        <h4 className="font-display font-bold text-white text-sm flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-brand-gold" />
          Faucet Guidelines
        </h4>
        <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
          <li>One claim is permitted per wallet on the Arc Testnet.</li>
          <li>AZD tokens have 18 decimals precision and are used for trading/liquidity on our pools.</li>
          <li>Faucet claims are immediately added to your wallet balance once confirmed.</li>
        </ul>
      </div>
    </motion.div>
  );
}
