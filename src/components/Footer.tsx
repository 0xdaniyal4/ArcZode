/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';
import { ExternalLink, ShieldCheck, Heart, ArrowUpRight } from 'lucide-react';
import Logo from './Logo';
import { DEX_ADDRESS, AZD_ADDRESS } from '../contracts';

export default function Footer() {
  const shortAddress = (addr: string) => `${addr.slice(0, 9)}...${addr.slice(-4)}`;

  return (
    <footer className="w-full bg-[#000820]/90 border-t border-brand-blue/30 relative overflow-hidden mt-auto">
      {/* Glow Effect Line at top */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-brand-gold/60 to-transparent shadow-[0_-2px_12px_rgba(255,215,0,0.5)]" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          
          {/* Left Column: Brand & Tagline */}
          <div className="flex flex-col space-y-4">
            <Logo />
            <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
              First decentralized exchange with liquidity pools on Arc Testnet.
            </p>
            <p className="text-slate-400 text-xs">
              Swap USDC and EURC. Provide liquidity and earn AZD protocol rewards.
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-blue/20 text-brand-gold border border-brand-gold/30 shadow-[0_0_8px_rgba(255,215,0,0.1)]">
                <span className="h-2 w-2 rounded-full bg-brand-gold animate-ping" />
                Arc Testnet Active
              </span>
            </div>
          </div>

          {/* Center Column: Quick Links & Smart Contracts */}
          <div className="flex flex-col space-y-4">
            <h3 className="text-white font-display font-bold text-base tracking-wide">Protocol Architecture</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
              <div className="flex flex-col space-y-1.5">
                <Link to="/" className="hover:text-brand-gold transition-colors">Home</Link>
                <Link to="/swap" className="hover:text-brand-gold transition-colors">Swap Hub</Link>
                <Link to="/liquidity" className="hover:text-brand-gold transition-colors">Liquidity Pools</Link>
                <Link to="/stake" className="hover:text-brand-gold transition-colors">Staking Vault</Link>
                <Link to="/analytics" className="hover:text-brand-gold transition-colors">Analytics</Link>
              </div>
              <div className="flex flex-col space-y-1.5 font-mono text-[11px]">
                <span className="text-slate-500 font-sans">Network Specs:</span>
                <span className="text-slate-300">Chain ID: 5042002</span>
                <a 
                  href={`https://testnet.arcscan.app/address/${DEX_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-accent hover:text-brand-gold flex items-center gap-1 transition-colors"
                >
                  DEX: {shortAddress(DEX_ADDRESS)} <ExternalLink className="w-2.5 h-2.5" />
                </a>
                <a 
                  href={`https://testnet.arcscan.app/address/${AZD_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-accent hover:text-brand-gold flex items-center gap-1 transition-colors"
                >
                  AZD: {shortAddress(AZD_ADDRESS)} <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Social Links & Creator Info */}
          <div className="flex flex-col space-y-4 md:items-start lg:items-start">
            <h3 className="text-white font-display font-bold text-base tracking-wide">Developer & community</h3>
            <span className="text-slate-300 text-sm font-medium">Built by Daniyal Khan</span>

            {/* Social Icons Row */}
            <div className="flex items-center gap-3">
              {/* X / Twitter */}
              <a
                href="https://x.com/0xDaniyal4"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-[#00010F] border border-brand-blue/30 flex items-center justify-center text-slate-300 hover:text-brand-gold hover:border-brand-gold transition-all duration-300"
                aria-label="Twitter Profile"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/0xdaniyal4"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-[#00010F] border border-brand-blue/30 flex items-center justify-center text-slate-300 hover:text-brand-gold hover:border-brand-gold transition-all duration-300"
                aria-label="GitHub Profile"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.024A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.293 2.747-1.024 2.747-1.024.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/daniyal-khan-a226ab419"
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-full bg-[#00010F] border border-brand-blue/30 flex items-center justify-center text-slate-300 hover:text-brand-gold hover:border-brand-gold transition-all duration-300"
                aria-label="LinkedIn Profile"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>

            <a
              href="https://x.com/0xDaniyal4"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-transparent border border-brand-gold hover:bg-brand-gold/10 text-brand-gold text-xs font-semibold font-display tracking-wider uppercase transition-all duration-300 shadow-[0_0_12px_rgba(255,215,0,0.1)] hover:shadow-[0_0_15px_rgba(255,215,0,0.3)] cursor-pointer"
            >
              Follow Creator <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            <div className="text-slate-500 text-[11px] pt-1">
              Powered by Arc Testnet • © 2025 ArcZode
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-brand-blue/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2 text-brand-success/90">
            <ShieldCheck className="w-4.5 h-4.5" />
            <span>Security Audited & Protected</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-brand-danger fill-brand-danger animate-pulse" />
            <span>on Arc Network •</span>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              className="text-brand-gold hover:underline flex items-center gap-1 font-semibold"
            >
              Circle Faucet <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
