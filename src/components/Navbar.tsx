/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { Menu, X, ShieldAlert, Award, Copy, LogOut, Wallet, Check } from 'lucide-react';
import Logo from './Logo';
import { OWNER_ADDRESS } from '../contracts';
import { useBlockchain } from '../hooks/useBlockchain';
import { formatUnits } from 'viem';
import { motion, AnimatePresence } from 'motion/react';
import { SHORT_ADDRESS } from '../utils';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { address, isConnected, balances } = useBlockchain();
  const { disconnect } = useDisconnect();

  const isOwner = isConnected && address?.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Swap', path: '/swap' },
    { name: 'Liquidity', path: '/liquidity' },
    { name: 'Stake', path: '/stake' },
    { name: 'Faucet', path: '/faucet' },
    { name: 'Analytics', path: '/analytics' },
    { name: 'Portfolio', path: '/portfolio' },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-brand-blue/30 bg-[#00010F]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center">
              <Logo />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                className={({ isActive }) =>
                  `relative px-3 py-2 text-sm font-medium font-display transition-all duration-300 rounded-md hover:text-white ${
                    isActive
                      ? 'text-brand-gold glow-gold font-bold'
                      : 'text-slate-300 hover:bg-brand-blue/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.name}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-gold to-transparent shadow-[0_2px_10px_rgba(255,215,0,0.8)]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}

            {/* Show Admin option if owner */}
            {isOwner && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `relative px-3 py-2 text-sm font-medium font-display transition-all duration-300 rounded-md flex items-center gap-1 ${
                    isActive
                      ? 'text-brand-gold glow-gold font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-brand-blue/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <ShieldAlert className="w-4 h-4" />
                    Admin
                    <span className="inline-flex h-2 w-2 rounded-full bg-brand-success animate-pulse" />
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-gold to-transparent shadow-[0_2px_10px_rgba(255,215,0,0.8)]" />
                    )}
                  </>
                )}
              </NavLink>
            )}
          </div>

          {/* Connect Wallet & Hamburger */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:block">
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;

                  if (!ready) {
                    return (
                      <div className="w-32 h-10 bg-white/5 rounded-xl animate-pulse" />
                    );
                  }

                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-accent hover:from-brand-accent hover:to-brand-blue text-white font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_0_15px_rgba(0,51,204,0.2)] hover:shadow-[0_0_20px_rgba(0,51,204,0.4)] cursor-pointer"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => setIsWalletModalOpen(true)}
                      type="button"
                      className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all cursor-pointer shadow-md hover:border-brand-gold/30"
                    >
                      <div className="w-5.5 h-5.5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-[0_0_10px_var(--accent-glow)]">
                        <Wallet className="w-3 h-3" />
                      </div>
                      <span className="font-mono text-xs text-slate-200">
                        {account.displayName}
                      </span>
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </div>
            
            {/* Mobile menu button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:text-white focus:outline-none min-h-[48px] min-w-[48px]"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-brand-blue/20 bg-[#000820]/95 backdrop-blur-2xl">
          <div className="space-y-1 px-2 pb-4 pt-3">
            <div className="px-3 pb-3 sm:hidden">
              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openConnectModal,
                  mounted,
                }) => {
                  const ready = mounted;
                  const connected = ready && account && chain;

                  if (!ready) {
                    return <div className="w-full h-12 bg-white/5 rounded-xl animate-pulse" />;
                  }

                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-blue to-brand-accent hover:from-brand-accent hover:to-brand-blue text-white font-bold text-sm tracking-wider uppercase transition-all duration-300 shadow-[0_0_15px_rgba(0,51,204,0.2)]"
                      >
                        Connect Wallet
                      </button>
                    );
                  }

                  return (
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setIsWalletModalOpen(true);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-5.5 h-5.5 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
                          <Wallet className="w-3 h-3" />
                        </div>
                        <span className="font-mono text-xs text-slate-200">
                          {account.displayName}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {Number(formatUnits(balances.usdc, 6)).toFixed(2)} USDC
                      </span>
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </div>

            {navLinks.map((link) => (
              <NavLink
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `block px-3 py-3 rounded-md text-base font-medium transition-all min-h-[48px] ${
                    isActive
                      ? 'bg-brand-blue/20 text-brand-gold border-l-4 border-brand-gold font-bold glow-gold'
                      : 'text-slate-300 hover:bg-brand-blue/10 hover:text-white'
                  }`
                }
              >
                {link.name}
              </NavLink>
            ))}

            {isOwner && (
              <NavLink
                to="/admin"
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-3 rounded-md text-base font-medium transition-all flex items-center gap-2 min-h-[48px] ${
                    isActive
                      ? 'bg-brand-blue/20 text-brand-gold border-l-4 border-brand-gold font-bold glow-gold'
                      : 'text-slate-400 hover:text-white hover:bg-brand-blue/10'
                  }`
                }
              >
                <ShieldAlert className="w-5 h-5" />
                Admin (Authorized)
              </NavLink>
            )}
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      <AnimatePresence>
        {isWalletModalOpen && isConnected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsWalletModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Popup dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="relative w-full max-w-sm overflow-hidden p-6 text-left shadow-2xl transition-all border border-white/10"
              style={{
                background: 'rgba(15, 20, 30, 0.7)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 15px var(--accent-glow)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Inside the popup */}
              <div className="flex flex-col items-center text-center mt-4 space-y-4">
                
                {/* Wallet Icon with subtle glow ring */}
                <div className="relative p-4 rounded-full bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold shadow-[0_0_25px_var(--accent-glow)]">
                  <div className="absolute inset-0 rounded-full border border-brand-gold/40 animate-ping opacity-25" />
                  <Wallet className="w-8 h-8" />
                </div>

                {/* Address Info */}
                <div className="space-y-1 w-full px-2">
                  <h4 className="text-xl font-bold text-white tracking-wide font-display break-all">
                    {SHORT_ADDRESS(address)}
                  </h4>
                  {/* Balance / USDC info */}
                  <p className="text-xs text-slate-400 font-mono">
                    {Number(formatUnits(balances.usdc, 6)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="w-full pt-4 space-y-2.5">
                  {/* Copy Address */}
                  <button
                    onClick={handleCopy}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-transparent hover:bg-white/5 text-slate-200 hover:text-white text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-brand-success" />
                        <span>Address Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Address</span>
                      </>
                    )}
                  </button>

                  {/* Disconnect Button */}
                  <button
                    onClick={() => {
                      disconnect();
                      setIsWalletModalOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-slate-200 hover:text-red-400 text-xs font-semibold tracking-wider uppercase transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Disconnect</span>
                  </button>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
}
