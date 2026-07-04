/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SwapTx {
  user: string;
  tokenIn: string;
  amountIn: bigint;
  amountOut: bigint;
  timestamp: bigint;
  txHash?: string;
}

export interface PoolInfo {
  usdcReserve: bigint;
  eurcReserve: bigint;
  totalLPTokens: bigint;
  totalVolumeUSDC: bigint;
  totalVolumeEURC: bigint;
  swapCounter: bigint;
}

export interface UserInfo {
  lpBalance: bigint;
  azdRewards: bigint;
  stakedAZD: bigint;
}

export interface MultiPoolInfo {
  pool1: { // USDC/EURC (Contract 1)
    usdcReserve: bigint;
    eurcReserve: bigint;
    totalLPTokens: bigint;
    totalVolumeUSDC: bigint;
    totalVolumeEURC: bigint;
    swapCounter: bigint;
  };
  pool2: { // USDC/AZD (Contract 2)
    usdcReserve: bigint;
    azdReserve: bigint;
    totalLPTokens: bigint;
  };
  pool3: { // EURC/AZD (Contract 2)
    eurcReserve: bigint;
    azdReserve: bigint;
    totalLPTokens: bigint;
  };
  totalStakedAZD: bigint;
}

export interface MultiUserInfo {
  lpBalance1: bigint; // USDC/EURC (Contract 1)
  lpBalance2: bigint; // USDC/AZD (Contract 2)
  lpBalance3: bigint; // EURC/AZD (Contract 2)
  azdRewards: bigint; // Rewards (Contract 1)
  stakedAZD: bigint;  // Staked AZD (Contract 2)
  hasClaimed: boolean; // Faucet status (Contract 2)
}

export interface UserBalances {
  usdc: bigint;
  eurc: bigint;
  azd: bigint;
}

export type TokenSymbol = 'USDC' | 'EURC' | 'AZD';

export interface TokenConfig {
  symbol: TokenSymbol;
  name: string;
  address: string;
  decimals: number;
}
