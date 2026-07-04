/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

// Formats a hex address to 0x1234...abcd
export function SHORT_ADDRESS(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Renders an inline visual marker for USDC, EURC, and AZD tokens
export function getLogoForToken(symbol: string): React.ReactNode {
  switch (symbol.toUpperCase()) {
    case 'USDC':
      return React.createElement('img', {
        src: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
        width: '24',
        height: '24',
        style: { borderRadius: '50%' },
        referrerPolicy: 'no-referrer',
        alt: 'USDC'
      });
    case 'EURC':
      return React.createElement('img', {
        src: 'https://assets.coingecko.com/coins/images/26045/small/euro-coin.png',
        width: '24',
        height: '24',
        style: { borderRadius: '50%' },
        referrerPolicy: 'no-referrer',
        alt: 'EURC'
      });
    case 'AZD':
      return React.createElement('div', {
        className: 'flex items-center justify-center rounded-full text-white font-bold select-none border-2 border-[#FFD700]',
        style: {
          width: '24px',
          height: '24px',
          background: 'linear-gradient(135deg, #0033CC, #FFD700)',
          fontSize: '8px',
          boxShadow: '0 0 10px rgba(255, 215, 0, 0.6)',
        }
      }, 'AZD');
    default:
      return null;
  }
}

// Helper to parse blockchain and viem errors into clean, user-friendly messages
export function parseBlockchainError(err: any): { title: string; description: string } {
  // Always log the full error to console so developers can inspect the raw RPC response/cause
  console.error("FULL BLOCKCHAIN ERROR:", err);
  if (err && typeof err === 'object') {
    try {
      console.error("FULL ERROR DETAILS:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } catch (_) {}
  }

  // Extract all possible message fields from Viem/Wagmi/Contract error objects
  const errMsg = (
    err?.shortMessage || 
    err?.message || 
    err?.details || 
    (err?.cause && (err.cause.message || err.cause.shortMessage || '')) || 
    String(err || '')
  );
  
  const errStr = errMsg.toLowerCase();
  
  if (
    errStr.includes('user rejected') || 
    errStr.includes('userrejectedrequesterror') || 
    errStr.includes('rejected') || 
    errStr.includes('denied') || 
    errStr.includes('cancelled') || 
    errStr.includes('canceled')
  ) {
    return {
      title: 'Transaction Cancelled',
      description: 'You declined the signature or transaction request in your wallet.'
    };
  }

  if (errStr.includes('faucet empty') || errStr.includes('faucet is empty')) {
    return {
      title: 'On-Chain Faucet Empty',
      description: 'The on-chain faucet is out of AZD tokens. Please try again later!'
    };
  }

  if (
    errStr.includes('insufficient funds') || 
    errStr.includes('insufficientfundserror') || 
    errStr.includes('exceeds the balance') ||
    errStr.includes('exceeds balance') ||
    errStr.includes('gas limit')
  ) {
    return {
      title: 'Insufficient Gas Funds',
      description: 'Your wallet does not have enough native tokens to cover the network transaction gas fee.'
    };
  }

  if (errStr.includes('transfer amount exceeds balance')) {
    return {
      title: 'Balance Exceeded',
      description: 'The requested transfer amount exceeds your current wallet balance.'
    };
  }

  // General parsing for clean error details
  const match = errMsg.match(/details: (.*)/i) || errMsg.match(/reason: (.*)/i);
  const cleanDesc = match ? match[1].split('\n')[0].trim() : (errMsg.length > 80 ? errMsg.slice(0, 80) + '...' : errMsg);

  return {
    title: 'Transaction Failed',
    description: cleanDesc || 'The transaction was reverted on-chain.'
  };
}
