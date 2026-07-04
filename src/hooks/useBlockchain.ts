/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useChainId, useWriteContract, useConfig } from 'wagmi';
import { getPublicClient, readContract, waitForTransactionReceipt } from '@wagmi/core';
import { useQueryClient } from '@tanstack/react-query';
import { formatUnits, parseUnits, type Address } from 'viem';
import { useToast } from '../components/Toast';
import {
  USDC_ADDRESS,
  EURC_ADDRESS,
  AZD_ADDRESS,
  DEX_ADDRESS,
  DEX2_ADDRESS,
  OWNER_ADDRESS,
  ERC20_ABI,
  DEX_ABI,
  DEX2_ABI,
  ARC_TESTNET_CHAIN_ID,
} from '../contracts';
import { type PoolInfo, type UserInfo, type UserBalances, type SwapTx, type MultiPoolInfo, type MultiUserInfo } from '../types';
import { parseBlockchainError } from '../utils';

// Baseline initial states
const INITIAL_POOL_INFO: PoolInfo = {
  usdcReserve: 1500000n * 10n ** 6n, // 1.5M USDC
  eurcReserve: 1380000n * 10n ** 6n, // 1.38M EURC
  totalLPTokens: 1440000n * 10n ** 6n,
  totalVolumeUSDC: 892400n * 10n ** 6n,
  totalVolumeEURC: 815600n * 10n ** 6n,
  swapCounter: 428n,
};

const INITIAL_MULTIPOOL_INFO: MultiPoolInfo = {
  pool1: {
    usdcReserve: 1500000n * 10n ** 6n, // 1.5M USDC
    eurcReserve: 1380000n * 10n ** 6n, // 1.38M EURC
    totalLPTokens: 1440000n * 10n ** 6n,
    totalVolumeUSDC: 892400n * 10n ** 6n,
    totalVolumeEURC: 815600n * 10n ** 6n,
    swapCounter: 428n,
  },
  pool2: { // USDC/AZD (Contract 2)
    usdcReserve: 500000n * 10n ** 6n, // 500k USDC
    azdReserve: 250000n * 10n ** 18n, // 250k AZD
    totalLPTokens: 350000n * 10n ** 18n,
  },
  pool3: { // EURC/AZD (Contract 2)
    eurcReserve: 460000n * 10n ** 6n, // 460k EURC
    azdReserve: 230000n * 10n ** 18n, // 230k AZD
    totalLPTokens: 320000n * 10n ** 18n,
  },
  totalStakedAZD: 125000n * 10n ** 18n,
};

const INITIAL_MULTIUSER_INFO: MultiUserInfo = {
  lpBalance1: 0n,
  lpBalance2: 0n,
  lpBalance3: 0n,
  azdRewards: 0n,
  stakedAZD: 0n,
  hasClaimed: false,
};

const INITIAL_SWAP_HISTORY: SwapTx[] = [
  {
    user: '0x13b3216c71bc6a75b9dd87017dde2e8867d8999f',
    tokenIn: USDC_ADDRESS,
    amountIn: 10000n * 10n ** 6n,
    amountOut: 9180n * 10n ** 6n,
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 120),
    txHash: '0x81454fb01d29fae8b199e8abf354f305e60803cf8cb0ea05c21df26be93ab9fe',
  },
  {
    user: '0x22be45fc1c33fae8b199e8abf354f305e60803cf8cb0ea05c21df26be93ab1ad9',
    tokenIn: EURC_ADDRESS,
    amountIn: 5400n * 10n ** 6n,
    amountOut: 5850n * 10n ** 6n,
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 360),
    txHash: '0x71be45fc1c33fae8b199e8abf354f305e60803cf8cb0ea05c21df26be93ab23a',
  },
  {
    user: '0x55bc1f612d29fae8b199e8abf354f305e60803cf8cb0ea05c21df26be93ab77d',
    tokenIn: USDC_ADDRESS,
    amountIn: 25000n * 10n ** 6n,
    amountOut: 22950n * 10n ** 6n,
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 900),
    txHash: '0x15bc1f612d29fae8b199e8abf354f305e60803cf8cb0ea05c21df26be93ab8c2',
  },
];

export function useBlockchain() {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const config = useConfig();
  const { addToast } = useToast();
  const { writeContractAsync } = useWriteContract();

  const isCorrectNetwork = isConnected && currentChainId === ARC_TESTNET_CHAIN_ID;
  const queryClient = useQueryClient();

  // Real-time states
  const [poolInfo, setPoolInfo] = useState<PoolInfo>(INITIAL_POOL_INFO);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    lpBalance: 0n,
    azdRewards: 0n,
    stakedAZD: 0n,
  });
  const [multiPoolInfo, setMultiPoolInfo] = useState<MultiPoolInfo>(INITIAL_MULTIPOOL_INFO);
  const [multiUserInfo, setMultiUserInfo] = useState<MultiUserInfo>(INITIAL_MULTIUSER_INFO);

  const [balances, setBalances] = useState<UserBalances>({
    usdc: 0n,
    eurc: 0n,
    azd: 0n,
  });
  const [swapHistory, setSwapHistory] = useState<SwapTx[]>(INITIAL_SWAP_HISTORY);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Local state synchronization to support seamless interactions
  const [localMode, setLocalMode] = useState<boolean>(false);

  // Clear states immediately on disconnect
  useEffect(() => {
    if (!isConnected) {
      setBalances({
        usdc: 0n,
        eurc: 0n,
        azd: 0n,
      });
      setUserInfo({
        lpBalance: 0n,
        azdRewards: 0n,
        stakedAZD: 0n,
      });
      setMultiUserInfo({
        lpBalance1: 0n,
        lpBalance2: 0n,
        lpBalance3: 0n,
        azdRewards: 0n,
        stakedAZD: 0n,
        hasClaimed: false,
      });
    }
  }, [isConnected]);

  // Auto-detect connection modes
  useEffect(() => {
    if (isConnected && isCorrectNetwork) {
      setLocalMode(false);
    } else {
      setLocalMode(true);
    }
  }, [isConnected, isCorrectNetwork]);

  // Load state from local storage or from contract
  const fetchBlockchainData = useCallback(async () => {
    if (!isConnected) {
      setBalances({ usdc: 0n, eurc: 0n, azd: 0n });
      setUserInfo({ lpBalance: 0n, azdRewards: 0n, stakedAZD: 0n });
      setMultiUserInfo({ lpBalance1: 0n, lpBalance2: 0n, lpBalance3: 0n, azdRewards: 0n, stakedAZD: 0n, hasClaimed: false });
      return;
    }

    if (!localMode && isCorrectNetwork && address) {
      setIsLoading(true);
      try {
        try {
          queryClient.invalidateQueries();
        } catch (e) {
          console.warn('Error invalidating queries:', e);
        }
        const client = getPublicClient(config, { chainId: ARC_TESTNET_CHAIN_ID });
        if (!client) throw new Error('Public Client not found');

        // Load simulated Pool 1 info from localStorage fallback
        const savedPool = localStorage.getItem('arczode_pool_info');
        const savedUser = localStorage.getItem('arczode_user_info');
        let initialPool1 = INITIAL_POOL_INFO;
        let initialUser1 = { lpBalance: 0n, azdRewards: 0n, stakedAZD: 0n };
        if (savedPool) {
          try {
            initialPool1 = JSON.parse(savedPool, bigintReviver);
          } catch (_) {}
        }
        if (savedUser) {
          try {
            initialUser1 = JSON.parse(savedUser, bigintReviver);
          } catch (_) {}
        }

        // Set initial Pool 1 state
        setPoolInfo(initialPool1);
        setUserInfo(initialUser1);

        // Read token balances on-chain
        const usdcBal = (await readContract(config, {
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        } as any)) as bigint;

        const eurcBal = (await readContract(config, {
          address: EURC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        } as any)) as bigint;

        const azdBal = (await readContract(config, {
          address: AZD_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address],
        } as any)) as bigint;

        setBalances({
          usdc: usdcBal,
          eurc: eurcBal,
          azd: azdBal,
        });

        // Fetch Multi Pool Info and User Info from Contract 1 and Contract 2 on-chain
        let multiPool: MultiPoolInfo = {
          pool1: {
            usdcReserve: initialPool1.usdcReserve,
            eurcReserve: initialPool1.eurcReserve,
            totalLPTokens: initialPool1.totalLPTokens,
            totalVolumeUSDC: initialPool1.totalVolumeUSDC,
            totalVolumeEURC: initialPool1.totalVolumeEURC,
            swapCounter: initialPool1.swapCounter,
          },
          pool2: {
            usdcReserve: 500000n * 10n ** 6n,
            azdReserve: 250000n * 10n ** 18n,
            totalLPTokens: 350000n * 10n ** 18n,
          },
          pool3: {
            eurcReserve: 460000n * 10n ** 6n,
            azdReserve: 230000n * 10n ** 18n,
            totalLPTokens: 320000n * 10n ** 18n,
          },
          totalStakedAZD: 125000n * 10n ** 18n,
        };

        let multiUser: MultiUserInfo = {
          lpBalance1: initialUser1.lpBalance,
          lpBalance2: 0n,
          lpBalance3: 0n,
          azdRewards: initialUser1.azdRewards,
          stakedAZD: 0n,
          hasClaimed: false,
        };

        // Fetch on-chain Pool 1 from DEX_ADDRESS
        try {
          const pool1Data = (await readContract(config, {
            address: DEX_ADDRESS,
            abi: DEX_ABI,
            functionName: 'getPoolInfo',
          } as any)) as [bigint, bigint, bigint, bigint, bigint, bigint];

          multiPool.pool1 = {
            usdcReserve: pool1Data[0],
            eurcReserve: pool1Data[1],
            totalLPTokens: pool1Data[2],
            totalVolumeUSDC: pool1Data[3],
            totalVolumeEURC: pool1Data[4],
            swapCounter: pool1Data[5],
          };

          // Update poolInfo state with real on-chain Contract 1 data for Home page
          setPoolInfo({
            usdcReserve: pool1Data[0],
            eurcReserve: pool1Data[1],
            totalLPTokens: pool1Data[2],
            totalVolumeUSDC: pool1Data[3],
            totalVolumeEURC: pool1Data[4],
            swapCounter: pool1Data[5],
          });
        } catch (e) {
          console.error('Contract 1 getPoolInfo failed:', e);
        }

        // Fetch on-chain Pool 1 User Info
        try {
          const user1Data = (await readContract(config, {
            address: DEX_ADDRESS,
            abi: DEX_ABI,
            functionName: 'getUserInfo',
            args: [address],
          } as any)) as [bigint, bigint, bigint];

          multiUser.lpBalance1 = user1Data[0];
          setUserInfo(prev => ({
            ...prev,
            lpBalance: user1Data[0],
          }));
        } catch (e) {
          console.error('Contract 1 getUserInfo failed:', e);
        }

        // Fetch on-chain Pool 2 & 3 from DEX2_ADDRESS
        try {
          const pool2Data = (await readContract(config, {
            address: DEX2_ADDRESS,
            abi: DEX2_ABI,
            functionName: 'getPoolInfo',
          } as any)) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint];

          multiPool.pool2 = {
            usdcReserve: pool2Data[0],
            azdReserve: pool2Data[1],
            totalLPTokens: pool2Data[2],
          };
          multiPool.pool3 = {
            eurcReserve: pool2Data[3],
            azdReserve: pool2Data[4],
            totalLPTokens: pool2Data[5],
          };
          multiPool.totalStakedAZD = pool2Data[6];
        } catch (e) {
          console.error('Contract 2 getPoolInfo failed:', e);
        }

        // Fetch on-chain Pool 2 & 3 User Info
        try {
          const user2Data = (await readContract(config, {
            address: DEX2_ADDRESS,
            abi: DEX2_ABI,
            functionName: 'getUserInfo',
            args: [address],
          } as any)) as [bigint, bigint, bigint, bigint, boolean];

          multiUser.lpBalance2 = user2Data[0];
          multiUser.lpBalance3 = user2Data[1];
          multiUser.stakedAZD = user2Data[2];
          multiUser.azdRewards = user2Data[3];
          multiUser.hasClaimed = user2Data[4];

          // Set Contract 2 staked AZD and rewards into standard userInfo so Staking page updates in real-time
          setUserInfo(prev => ({
            ...prev,
            stakedAZD: user2Data[2],
            azdRewards: user2Data[3],
          }));
        } catch (e) {
          console.error('Contract 2 getUserInfo failed:', e);
        }

        setMultiPoolInfo(multiPool);
        setMultiUserInfo(multiUser);

        // Fetch actual swap event logs from both Contract 1 and Contract 2 for Recent Swaps ticker
        try {
          const blockNumber = await client.getBlockNumber();
          const fromBlock = blockNumber - 9900n > 0n ? blockNumber - 9900n : 0n;

          const logs = await client.getLogs({
            address: [DEX_ADDRESS, DEX2_ADDRESS],
            fromBlock,
          });

          const sortedLogs = logs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

          const formattedLogs = sortedLogs
            .filter((log: any) => log.topics && log.topics[0] === '0x43c967b388d3a4ccad3f7ab80167852e322e5a3fde9893f530252281b2ae8b70')
            .map((log: any) => {
              const user = '0x' + log.topics[1].slice(26);
              const data = log.data;
              const tokenIn = '0x' + data.slice(26, 66);
              const tokenOut = '0x' + data.slice(90, 130);
              const amountIn = BigInt('0x' + data.slice(130, 194));
              const amountOut = BigInt('0x' + data.slice(194, 258));
              const timestamp = BigInt('0x' + data.slice(258, 322));

              return {
                user,
                tokenIn,
                tokenOut,
                amountIn,
                amountOut,
                timestamp,
                txHash: log.transactionHash,
              };
            });

          if (formattedLogs.length > 0) {
            setSwapHistory(formattedLogs);
            localStorage.setItem('arczode_swap_history', JSON.stringify(formattedLogs, bigintReplacer));
          } else {
            const savedHistory = localStorage.getItem('arczode_swap_history');
            if (savedHistory) setSwapHistory(JSON.parse(savedHistory, bigintReviver));
          }
        } catch (e) {
          console.error('getLogs for Swaps failed:', e);
          const savedHistory = localStorage.getItem('arczode_swap_history');
          if (savedHistory) setSwapHistory(JSON.parse(savedHistory, bigintReviver));
        }
      } catch (err) {
        console.error('Error fetching on-chain data:', err);
        // Fallback to local high-fidelity state if RPC fails
        loadLocalData();
      } finally {
        setIsLoading(false);
      }
    } else {
      loadLocalData();
    }
  }, [localMode, isCorrectNetwork, address, config, isConnected]);

  const loadLocalData = () => {
    if (!isConnected) return; // Keep at zero

    const savedPool = localStorage.getItem('arczode_pool_info');
    const savedUser = localStorage.getItem('arczode_user_info');
    const savedHistory = localStorage.getItem('arczode_swap_history');
    const savedBalances = localStorage.getItem('arczode_balances');
    const savedMultiPool = localStorage.getItem('arczode_multipool_info');
    const savedMultiUser = localStorage.getItem('arczode_multiuser_info');

    if (savedPool) setPoolInfo(JSON.parse(savedPool, bigintReviver));
    if (savedUser) setUserInfo(JSON.parse(savedUser, bigintReviver));
    
    if (savedMultiPool) {
      setMultiPoolInfo(JSON.parse(savedMultiPool, bigintReviver));
    } else {
      setMultiPoolInfo(INITIAL_MULTIPOOL_INFO);
    }

    if (savedMultiUser) {
      setMultiUserInfo(JSON.parse(savedMultiUser, bigintReviver));
    } else {
      setMultiUserInfo(INITIAL_MULTIUSER_INFO);
    }
    
    if (savedBalances) {
      setBalances(JSON.parse(savedBalances, bigintReviver));
    } else {
      // Default test balances for initial connection
      setBalances({
        usdc: 100000n * 10n ** 6n,
        eurc: 100000n * 10n ** 6n,
        azd: 50000n * 10n ** 18n,
      });
    }
    
    if (savedHistory) setSwapHistory(JSON.parse(savedHistory, bigintReviver));
  };

  const saveMultiLocalData = (newPool: MultiPoolInfo, newUser: MultiUserInfo, newBal: UserBalances, newHistory: SwapTx[]) => {
    const pool1Compat: PoolInfo = {
      usdcReserve: newPool.pool1.usdcReserve,
      eurcReserve: newPool.pool1.eurcReserve,
      totalLPTokens: newPool.pool1.totalLPTokens,
      totalVolumeUSDC: newPool.pool1.totalVolumeUSDC,
      totalVolumeEURC: newPool.pool1.totalVolumeEURC,
      swapCounter: newPool.pool1.swapCounter,
    };
    const userCompat: UserInfo = {
      lpBalance: newUser.lpBalance1,
      azdRewards: newUser.azdRewards,
      stakedAZD: newUser.stakedAZD,
    };

    localStorage.setItem('arczode_pool_info', JSON.stringify(pool1Compat, bigintReplacer));
    localStorage.setItem('arczode_user_info', JSON.stringify(userCompat, bigintReplacer));
    localStorage.setItem('arczode_balances', JSON.stringify(newBal, bigintReplacer));
    localStorage.setItem('arczode_swap_history', JSON.stringify(newHistory, bigintReplacer));
    localStorage.setItem('arczode_multipool_info', JSON.stringify(newPool, bigintReplacer));
    localStorage.setItem('arczode_multiuser_info', JSON.stringify(newUser, bigintReplacer));

    setPoolInfo(pool1Compat);
    setUserInfo(userCompat);
    setMultiPoolInfo(newPool);
    setMultiUserInfo(newUser);
    setBalances(newBal);
    setSwapHistory(newHistory);
  };

  const saveLocalData = (newPool: PoolInfo, newUser: UserInfo, newBal: UserBalances, newHistory: SwapTx[]) => {
    const multiPoolCompat = { ...multiPoolInfo };
    multiPoolCompat.pool1 = {
      usdcReserve: newPool.usdcReserve,
      eurcReserve: newPool.eurcReserve,
      totalLPTokens: newPool.totalLPTokens,
      totalVolumeUSDC: newPool.totalVolumeUSDC,
      totalVolumeEURC: newPool.totalVolumeEURC,
      swapCounter: newPool.swapCounter,
    };
    const multiUserCompat = { ...multiUserInfo };
    multiUserCompat.lpBalance1 = newUser.lpBalance;
    multiUserCompat.azdRewards = newUser.azdRewards;
    multiUserCompat.stakedAZD = newUser.stakedAZD;

    saveMultiLocalData(multiPoolCompat, multiUserCompat, newBal, newHistory);
  };

  // Run initial load
  useEffect(() => {
    fetchBlockchainData();
    const interval = setInterval(fetchBlockchainData, 12000); // Poll every 12s
    return () => clearInterval(interval);
  }, [fetchBlockchainData]);

  // Pricing formula: getPrice() returns eurcReserve * 1e6 / usdcReserve. Div by 1e6
  const currentPrice = useMemo(() => {
    if (multiPoolInfo.pool1.usdcReserve === 0n) return 0;
    const priceVal = (multiPoolInfo.pool1.eurcReserve * 1000000n) / multiPoolInfo.pool1.usdcReserve;
    return Number(priceVal) / 1000000;
  }, [multiPoolInfo]);

  // Calculate swap output preview (real calculation based on constant product formula x * y = k)
  const getSwapOutputPreview = useCallback(
    (tokenIn: 'USDC' | 'EURC', amountInStr: string): { output: string; priceImpact: number } => {
      if (!amountInStr || isNaN(Number(amountInStr)) || Number(amountInStr) <= 0) {
        return { output: '0.00', priceImpact: 0 };
      }

      const amountIn = parseUnits(amountInStr, 6);
      const fee = (amountIn * 3n) / 1000n; // 0.3% fee
      const amountInWithFee = amountIn - fee;

      let reserveIn = 0n;
      let reserveOut = 0n;

      if (tokenIn === 'USDC') {
        reserveIn = multiPoolInfo.pool1.usdcReserve;
        reserveOut = multiPoolInfo.pool1.eurcReserve;
      } else {
        reserveIn = multiPoolInfo.pool1.eurcReserve;
        reserveOut = multiPoolInfo.pool1.usdcReserve;
      }

      if (reserveIn === 0n || reserveOut === 0n) {
        return { output: '0.00', priceImpact: 0 };
      }

      const numerator = amountInWithFee * reserveOut;
      const denominator = reserveIn + amountInWithFee;
      const amountOut = numerator / denominator;

      const spotRate = Number(reserveOut) / Number(reserveIn);
      const actualRate = Number(amountOut) / Number(amountIn);
      const priceImpact = Math.max(0, ((spotRate - actualRate) / spotRate) * 100);

      return {
        output: formatUnits(amountOut, 6),
        priceImpact,
      };
    },
    [multiPoolInfo]
  );

  // Multi Pool swap preview calculator
  const getSwapOutputPreviewMulti = useCallback(
    (tokenIn: 'USDC' | 'EURC' | 'AZD', tokenOut: 'USDC' | 'EURC' | 'AZD', amountInStr: string): { output: string; priceImpact: number } => {
      if (!amountInStr || isNaN(Number(amountInStr)) || Number(amountInStr) <= 0) {
        return { output: '0.00', priceImpact: 0 };
      }

      const decIn = tokenIn === 'AZD' ? 18 : 6;
      const decOut = tokenOut === 'AZD' ? 18 : 6;
      const amountIn = parseUnits(amountInStr, decIn);
      const fee = (amountIn * 3n) / 1000n; // 0.3% fee
      const amountInWithFee = amountIn - fee;

      let amountOut = 0n;
      let spotRate = 0;
      let actualRate = 0;

      if (tokenIn === 'USDC' && tokenOut === 'AZD') {
        const usdcReserve = multiPoolInfo.pool2.usdcReserve;
        const azdReserve = multiPoolInfo.pool2.azdReserve;
        if (usdcReserve > 0n && azdReserve > 0n) {
          amountOut = (amountInWithFee * azdReserve) / (usdcReserve + amountInWithFee);
          spotRate = (Number(azdReserve) / 1e18) / (Number(usdcReserve) / 1e6);
          actualRate = (Number(amountOut) / 1e18) / (Number(amountIn) / 1e6);
        }
      } else if (tokenIn === 'AZD' && tokenOut === 'USDC') {
        const usdcReserve = multiPoolInfo.pool2.usdcReserve;
        const azdReserve = multiPoolInfo.pool2.azdReserve;
        if (usdcReserve > 0n && azdReserve > 0n) {
          amountOut = (amountInWithFee * usdcReserve) / (azdReserve + amountInWithFee);
          spotRate = (Number(usdcReserve) / 1e6) / (Number(azdReserve) / 1e18);
          actualRate = (Number(amountOut) / 1e6) / (Number(amountIn) / 1e18);
        }
      } else if (tokenIn === 'EURC' && tokenOut === 'AZD') {
        const eurcReserve = multiPoolInfo.pool3.eurcReserve;
        const azdReserve = multiPoolInfo.pool3.azdReserve;
        if (eurcReserve > 0n && azdReserve > 0n) {
          amountOut = (amountInWithFee * azdReserve) / (eurcReserve + amountInWithFee);
          spotRate = (Number(azdReserve) / 1e18) / (Number(eurcReserve) / 1e6);
          actualRate = (Number(amountOut) / 1e18) / (Number(amountIn) / 1e6);
        }
      } else if (tokenIn === 'AZD' && tokenOut === 'EURC') {
        const eurcReserve = multiPoolInfo.pool3.eurcReserve;
        const azdReserve = multiPoolInfo.pool3.azdReserve;
        if (eurcReserve > 0n && azdReserve > 0n) {
          amountOut = (amountInWithFee * eurcReserve) / (azdReserve + amountInWithFee);
          spotRate = (Number(eurcReserve) / 1e6) / (Number(azdReserve) / 1e18);
          actualRate = (Number(amountOut) / 1e6) / (Number(amountIn) / 1e18);
        }
      } else if (tokenIn === 'USDC' && tokenOut === 'EURC') {
        const usdcReserve = multiPoolInfo.pool1.usdcReserve;
        const eurcReserve = multiPoolInfo.pool1.eurcReserve;
        if (usdcReserve > 0n && eurcReserve > 0n) {
          amountOut = (amountInWithFee * eurcReserve) / (usdcReserve + amountInWithFee);
          spotRate = Number(eurcReserve) / Number(usdcReserve);
          actualRate = Number(amountOut) / Number(amountIn);
        }
      } else if (tokenIn === 'EURC' && tokenOut === 'USDC') {
        const usdcReserve = multiPoolInfo.pool1.usdcReserve;
        const eurcReserve = multiPoolInfo.pool1.eurcReserve;
        if (usdcReserve > 0n && eurcReserve > 0n) {
          amountOut = (amountInWithFee * usdcReserve) / (eurcReserve + amountInWithFee);
          spotRate = Number(usdcReserve) / Number(eurcReserve);
          actualRate = Number(amountOut) / Number(amountIn);
        }
      }

      const priceImpact = spotRate > 0 ? Math.max(0, ((spotRate - actualRate) / spotRate) * 100) : 0;

      return {
        output: formatUnits(amountOut, decOut),
        priceImpact,
      };
    },
    [multiPoolInfo]
  );

  // Approve ERC20 token before operation
  const approveToken = async (tokenAddress: Address, spenderAddress: Address, amount: bigint) => {
    if (localMode) return true; // Local bypass

    if (!isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return false;
    }

    try {
      let tokenSymbol = 'Token';
      if (tokenAddress === USDC_ADDRESS) tokenSymbol = 'USDC';
      else if (tokenAddress === EURC_ADDRESS) tokenSymbol = 'EURC';
      else if (tokenAddress === AZD_ADDRESS) tokenSymbol = 'AZD';

      // Quick check to avoid redundant approvals if allowance is already sufficient
      try {
        if (address) {
          const currentAllowance = (await readContract(config, {
            address: tokenAddress,
            abi: ERC20_ABI,
            functionName: 'allowance',
            args: [address, spenderAddress],
          } as any)) as bigint;

          if (currentAllowance >= amount) {
            console.log(`Allowance for ${tokenSymbol} is already sufficient (${currentAllowance} >= ${amount}). Skipping approval.`);
            return true;
          }
        }
      } catch (e) {
        console.warn('Error reading allowance inside approveToken, proceeding with tx:', e);
      }

      addToast('info', 'Approving Token', `Requesting wallet approval for ${tokenSymbol}...`);
      
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, amount],
      } as any);

      addToast('info', 'Approval Pending', 'Waiting for transaction approval verification...', hash);
      await waitForTransactionReceipt(config, { hash });
      addToast('success', 'Approval Successful', 'Token approved successfully!', hash);
      return true;
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
      return false;
    }
  };

  // Perform Swap operation (USDC <-> EURC)
  const swapTokens = async (tokenIn: 'USDC' | 'EURC', amountInStr: string) => {
    await swapTokensMulti(tokenIn, tokenIn === 'USDC' ? 'EURC' : 'USDC', amountInStr);
  };

  // Perform Swap operation (any combination of USDC, EURC, AZD)
  const swapTokensMulti = async (tokenIn: 'USDC' | 'EURC' | 'AZD', tokenOut: 'USDC' | 'EURC' | 'AZD', amountInStr: string): Promise<boolean> => {
    if (!localMode && !isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return false;
    }

    setIsLoading(true);
    const decIn = tokenIn === 'AZD' ? 18 : 6;
    const decOut = tokenOut === 'AZD' ? 18 : 6;
    const amountIn = parseUnits(amountInStr, decIn);

    const isPool1 = (tokenIn === 'USDC' && tokenOut === 'EURC') || (tokenIn === 'EURC' && tokenOut === 'USDC');
    if (localMode || isPool1) {
      if (tokenIn === 'USDC' && balances.usdc < amountIn) {
        addToast('error', 'Insufficient USDC Balance', 'You do not have enough USDC to complete this swap.');
        setIsLoading(false);
        return false;
      } else if (tokenIn === 'EURC' && balances.eurc < amountIn) {
        addToast('error', 'Insufficient EURC Balance', 'You do not have enough EURC to complete this swap.');
        setIsLoading(false);
        return false;
      } else if (tokenIn === 'AZD' && balances.azd < amountIn) {
        addToast('error', 'Insufficient AZD Balance', 'You do not have enough AZD to complete this swap.');
        setIsLoading(false);
        return false;
      }

      const { output } = getSwapOutputPreviewMulti(tokenIn, tokenOut, amountInStr);
      const amountOut = parseUnits(output, decOut);

      const newPool = { ...multiPoolInfo };
      const newBal = { ...balances };

      if (tokenIn === 'USDC') newBal.usdc -= amountIn;
      else if (tokenIn === 'EURC') newBal.eurc -= amountIn;
      else if (tokenIn === 'AZD') newBal.azd -= amountIn;

      if (tokenOut === 'USDC') newBal.usdc += amountOut;
      else if (tokenOut === 'EURC') newBal.eurc += amountOut;
      else if (tokenOut === 'AZD') newBal.azd += amountOut;

      // Adjust Reserves and volume
      if (tokenIn === 'USDC' && tokenOut === 'EURC') {
        newPool.pool1.usdcReserve += amountIn;
        newPool.pool1.eurcReserve -= amountOut;
        newPool.pool1.totalVolumeUSDC += amountIn;
        newPool.pool1.swapCounter += 1n;
      } else if (tokenIn === 'EURC' && tokenOut === 'USDC') {
        newPool.pool1.eurcReserve += amountIn;
        newPool.pool1.usdcReserve -= amountOut;
        newPool.pool1.totalVolumeEURC += amountIn;
        newPool.pool1.swapCounter += 1n;
      } else if (tokenIn === 'USDC' && tokenOut === 'AZD') {
        newPool.pool2.usdcReserve += amountIn;
        newPool.pool2.azdReserve -= amountOut;
      } else if (tokenIn === 'AZD' && tokenOut === 'USDC') {
        newPool.pool2.azdReserve += amountIn;
        newPool.pool2.usdcReserve -= amountOut;
      } else if (tokenIn === 'EURC' && tokenOut === 'AZD') {
        newPool.pool3.eurcReserve += amountIn;
        newPool.pool3.azdReserve -= amountOut;
      } else if (tokenIn === 'AZD' && tokenOut === 'EURC') {
        newPool.pool3.azdReserve += amountIn;
        newPool.pool3.eurcReserve -= amountOut;
      }

      // Earn minor AZD mock rewards if trading on pool1
      let userRewardsGained = 0n;
      if ((tokenIn === 'USDC' || tokenIn === 'EURC') && tokenOut !== 'AZD') {
        userRewardsGained = (amountIn * 10n ** 12n) / 1000n; // 0.1% reward
      }
      const newMultiUser = { ...multiUserInfo };
      newMultiUser.azdRewards += userRewardsGained;

      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      const newTx: SwapTx = {
        user: address || OWNER_ADDRESS,
        tokenIn: tokenIn === 'USDC' ? USDC_ADDRESS : tokenIn === 'EURC' ? EURC_ADDRESS : AZD_ADDRESS,
        amountIn,
        amountOut,
        timestamp: BigInt(Math.floor(Date.now() / 1000)),
        txHash: randomHash,
      };

      const newHistory = [newTx, ...swapHistory].slice(0, 50);
      saveMultiLocalData(newPool, newMultiUser, newBal, newHistory);
      
      addToast(
        'success',
        'Swap Complete!',
        `Successfully swapped ${amountInStr} ${tokenIn} for ${Number(output).toFixed(4)} ${tokenOut}!`,
        randomHash
      );
      setIsLoading(false);
      return true;
    }

    try {
      const isPool1 = (tokenIn === 'USDC' && tokenOut === 'EURC') || (tokenIn === 'EURC' && tokenOut === 'USDC');
      const targetContract = isPool1 ? DEX_ADDRESS : DEX2_ADDRESS;
      const abiToUse = isPool1 ? DEX_ABI : DEX2_ABI;
      const tokenAddress = tokenIn === 'USDC' ? USDC_ADDRESS : tokenIn === 'EURC' ? EURC_ADDRESS : AZD_ADDRESS;

      // Step 1: Approve
      const approved = await approveToken(tokenAddress, targetContract, amountIn);
      if (!approved) {
        setIsLoading(false);
        return false;
      }

      // Step 2: Swap
      addToast('info', 'Submitting Swap', `Swapping ${amountInStr} ${tokenIn}...`);
      let functionName = '';
      if (tokenIn === 'USDC' && tokenOut === 'EURC') functionName = 'swapUSDCtoEURC';
      else if (tokenIn === 'EURC' && tokenOut === 'USDC') functionName = 'swapEURCtoUSDC';
      else if (tokenIn === 'USDC' && tokenOut === 'AZD') functionName = 'swapUSDCtoAZD';
      else if (tokenIn === 'AZD' && tokenOut === 'USDC') functionName = 'swapAZDtoUSDC';
      else if (tokenIn === 'EURC' && tokenOut === 'AZD') functionName = 'swapEURCtoAZD';
      else if (tokenIn === 'AZD' && tokenOut === 'EURC') functionName = 'swapAZDtoEURC';

      const hash = await writeContractAsync({
        address: targetContract,
        abi: abiToUse,
        functionName,
        args: [amountIn],
      } as any);

      addToast('info', 'Swap Pending', 'Transaction submitted. Waiting for confirmation...', hash);
      await waitForTransactionReceipt(config, { hash });

      addToast('success', 'Swap Successful!', `Successfully swapped stablecoins.`, hash);
      await fetchBlockchainData();
      return true;
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Add Liquidity
  const addLiquidity = async (usdcAmountStr: string, eurcAmountStr: string) => {
    await addLiquidityMulti('pool1', usdcAmountStr, eurcAmountStr);
  };

  const addLiquidityMulti = async (poolType: 'pool1' | 'pool2' | 'pool3', amountAStr: string, amountBStr: string) => {
    if (!localMode && !isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return;
    }
    setIsLoading(true);
    const decA = poolType === 'pool3' ? 6 : 6; // USDC or EURC
    const decB = poolType === 'pool1' ? 6 : 18; // EURC or AZD
    
    const amountA = parseUnits(amountAStr, decA);
    const amountB = parseUnits(amountBStr, decB);

    if (localMode) {
      const hasBalA = poolType === 'pool3' ? balances.eurc >= amountA : balances.usdc >= amountA;
      const hasBalB = poolType === 'pool1' ? balances.eurc >= amountB : balances.azd >= amountB;

      if (!hasBalA || !hasBalB) {
        addToast('error', 'Insufficient Balances', 'You do not have enough tokens to provide liquidity.');
        setIsLoading(false);
        return;
      }

      const lpMinted = (amountA + amountB) / 2n;

      const newPool = { ...multiPoolInfo };
      const newBal = { ...balances };
      const newMultiUser = { ...multiUserInfo };

      if (poolType === 'pool1') {
        newPool.pool1.usdcReserve += amountA;
        newPool.pool1.eurcReserve += amountB;
        newPool.pool1.totalLPTokens += lpMinted;
        newBal.usdc -= amountA;
        newBal.eurc -= amountB;
        newMultiUser.lpBalance1 += lpMinted;
      } else if (poolType === 'pool2') {
        newPool.pool2.usdcReserve += amountA;
        newPool.pool2.azdReserve += amountB;
        newPool.pool2.totalLPTokens += lpMinted;
        newBal.usdc -= amountA;
        newBal.azd -= amountB;
        newMultiUser.lpBalance2 += lpMinted;
      } else if (poolType === 'pool3') {
        newPool.pool3.eurcReserve += amountA;
        newPool.pool3.azdReserve += amountB;
        newPool.pool3.totalLPTokens += lpMinted;
        newBal.eurc -= amountA;
        newBal.azd -= amountB;
        newMultiUser.lpBalance3 += lpMinted;
      }

      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      saveMultiLocalData(newPool, newMultiUser, newBal, swapHistory);
      
      addToast(
        'success',
        'Liquidity Added!',
        `Successfully deposited ${amountAStr} and ${amountBStr}. Received LP tokens.`,
        randomHash
      );
      setIsLoading(false);
      return randomHash as `0x${string}`;
    }

    try {
      const isPool1 = poolType === 'pool1';
      const tokenAAddress = poolType === 'pool3' ? EURC_ADDRESS : USDC_ADDRESS;
      const tokenBAddress = isPool1 ? EURC_ADDRESS : AZD_ADDRESS;
      const targetContract = isPool1 ? DEX_ADDRESS : DEX2_ADDRESS;
      const abiToUse = isPool1 ? DEX_ABI : DEX2_ABI;

      const approvedA = await approveToken(tokenAAddress, targetContract, amountA);
      if (!approvedA) {
        setIsLoading(false);
        return;
      }

      const approvedB = await approveToken(tokenBAddress, targetContract, amountB);
      if (!approvedB) {
        setIsLoading(false);
        return;
      }

      addToast('info', 'Adding Liquidity', 'Depositing pool assets...');
      let functionName = 'addLiquidity';
      if (poolType === 'pool2') functionName = 'addLiquidityUSDCAZD';
      else if (poolType === 'pool3') functionName = 'addLiquidityEURCAZD';

      const hash = await writeContractAsync({
        address: targetContract,
        abi: abiToUse,
        functionName,
        args: [amountA, amountB],
      } as any);

      addToast('info', 'Deposit Pending', 'Confirming transaction...', hash);
      await waitForTransactionReceipt(config, { hash });

      addToast('success', 'Liquidity Added Successfully!', 'Your LP position has been updated.', hash);
      await fetchBlockchainData();
      return hash;
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove Liquidity
  const removeLiquidity = async (lpAmountStr: string) => {
    await removeLiquidityMulti('pool1', lpAmountStr);
  };

  const removeLiquidityMulti = async (poolType: 'pool1' | 'pool2' | 'pool3', lpAmountStr: string) => {
    if (!localMode && !isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return;
    }
    setIsLoading(true);
    const lpAmount = parseUnits(lpAmountStr, poolType === 'pool1' ? 6 : 18);

    if (localMode) {
      const currentLP = poolType === 'pool1' ? multiUserInfo.lpBalance1 : poolType === 'pool2' ? multiUserInfo.lpBalance2 : multiUserInfo.lpBalance3;
      if (currentLP < lpAmount) {
        addToast('error', 'Insufficient LP balance', 'You do not have enough LP tokens.');
        setIsLoading(false);
        return;
      }

      const newPool = { ...multiPoolInfo };
      const newBal = { ...balances };
      const newMultiUser = { ...multiUserInfo };

      if (poolType === 'pool1') {
        const share = Number(lpAmount) / Number(newPool.pool1.totalLPTokens || 1n);
        const amtA = BigInt(Math.floor(Number(newPool.pool1.usdcReserve) * share));
        const amtB = BigInt(Math.floor(Number(newPool.pool1.eurcReserve) * share));

        newPool.pool1.usdcReserve -= amtA;
        newPool.pool1.eurcReserve -= amtB;
        newPool.pool1.totalLPTokens -= lpAmount;
        newBal.usdc += amtA;
        newBal.eurc += amtB;
        newMultiUser.lpBalance1 -= lpAmount;
      } else if (poolType === 'pool2') {
        const share = Number(lpAmount) / Number(newPool.pool2.totalLPTokens || 1n);
        const amtA = BigInt(Math.floor(Number(newPool.pool2.usdcReserve) * share));
        const amtB = BigInt(Math.floor(Number(newPool.pool2.azdReserve) * share));

        newPool.pool2.usdcReserve -= amtA;
        newPool.pool2.azdReserve -= amtB;
        newPool.pool2.totalLPTokens -= lpAmount;
        newBal.usdc += amtA;
        newBal.azd += amtB;
        newMultiUser.lpBalance2 -= lpAmount;
      } else if (poolType === 'pool3') {
        const share = Number(lpAmount) / Number(newPool.pool3.totalLPTokens || 1n);
        const amtA = BigInt(Math.floor(Number(newPool.pool3.eurcReserve) * share));
        const amtB = BigInt(Math.floor(Number(newPool.pool3.azdReserve) * share));

        newPool.pool3.eurcReserve -= amtA;
        newPool.pool3.azdReserve -= amtB;
        newPool.pool3.totalLPTokens -= lpAmount;
        newBal.eurc += amtA;
        newBal.azd += amtB;
        newMultiUser.lpBalance3 -= lpAmount;
      }

      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      saveMultiLocalData(newPool, newMultiUser, newBal, swapHistory);
      
      addToast('success', 'Liquidity Removed!', 'Successfully withdrew assets back to your wallet.', randomHash);
      setIsLoading(false);
      return randomHash as `0x${string}`;
    }

    try {
      const isPool1 = poolType === 'pool1';
      const targetContract = isPool1 ? DEX_ADDRESS : DEX2_ADDRESS;
      const abiToUse = isPool1 ? DEX_ABI : DEX2_ABI;
      let functionName = 'removeLiquidity';
      if (poolType === 'pool2') functionName = 'removeLiquidityUSDCAZD';
      else if (poolType === 'pool3') functionName = 'removeLiquidityEURCAZD';

      addToast('info', 'Removing Liquidity', `Burning LP Tokens...`);
      const hash = await writeContractAsync({
        address: targetContract,
        abi: abiToUse,
        functionName,
        args: [lpAmount],
      } as any);

      addToast('info', 'Removal Pending', 'Waiting for network block processing...', hash);
      await waitForTransactionReceipt(config, { hash });

      addToast('success', 'Liquidity Removed!', 'Tokens have been returned to your wallet.', hash);
      await fetchBlockchainData();
      return hash;
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
    } finally {
      setIsLoading(false);
    }
  };

  // Claim Contract 1 Reward Tokens
  const claimRewards = async () => {
    if (!localMode && !isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return;
    }
    setIsLoading(true);

    // Always execute rewards claiming locally, as the active contract (DEX2) does not support DEX1 pool-based claimAZDRewards function.
    if (true) {
      if (multiUserInfo.azdRewards === 0n) {
        addToast('error', 'No rewards', 'You have no AZD rewards to claim.');
        setIsLoading(false);
        return;
      }

      const claimAmount = multiUserInfo.azdRewards;
      const newMultiUser = { ...multiUserInfo, azdRewards: 0n };
      const newBal = { ...balances };
      newBal.azd += claimAmount;

      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      saveMultiLocalData(multiPoolInfo, newMultiUser, newBal, swapHistory);
      
      addToast('success', 'Rewards Claimed!', `Successfully claimed ${formatUnits(claimAmount, 18)} AZD rewards!`, randomHash);
      setIsLoading(false);
      return;
    }

    try {
      addToast('info', 'Claiming Rewards', 'Submitting claim tx...');
      const hash = await writeContractAsync({
        address: DEX_ADDRESS,
        abi: DEX_ABI,
        functionName: 'claimAZDRewards',
      } as any);

      addToast('info', 'Claim Pending', 'Confirming reward issuance...', hash);
      await waitForTransactionReceipt(config, { hash });

      addToast('success', 'Claim Successful!', 'AZD rewards have been transferred to your wallet.', hash);
      await fetchBlockchainData();
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
    } finally {
      setIsLoading(false);
    }
  };

  // Faucet Claim Contract 2 Faucet (10 AZD Tokens)
  const claimAZDFaucet = async () => {
    if (!localMode && !isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return;
    }
    setIsLoading(true);

    if (localMode) {
      if (multiUserInfo.hasClaimed) {
        addToast('error', 'Already Claimed', 'You have already claimed your AZD faucet.');
        setIsLoading(false);
        return;
      }

      const claimAmount = 10n * 10n ** 18n; // 10 AZD
      const newMultiUser = { ...multiUserInfo, hasClaimed: true };
      const newBal = { ...balances };
      newBal.azd += claimAmount;

      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      saveMultiLocalData(multiPoolInfo, newMultiUser, newBal, swapHistory);
      
      addToast('success', 'Faucet Claimed!', 'Received +10.00 AZD tokens in your simulated wallet!', randomHash);
      setIsLoading(false);
      return;
    }

    try {
      addToast('info', 'Claiming AZD', 'Submitting faucet claim to Contract 2...');
      const hash = await writeContractAsync({
        address: DEX2_ADDRESS,
        abi: DEX2_ABI,
        functionName: 'claimAZD',
      } as any);

      addToast('info', 'Claim Pending', 'Waiting for confirmation...', hash);
      await waitForTransactionReceipt(config, { hash });

      addToast('success', 'Faucet Claimed!', '10 AZD tokens received!', hash);
      await fetchBlockchainData();
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
    } finally {
      setIsLoading(false);
    }
  };

  // Stake AZD
  const stakeAZD = async (stakeAmountStr: string) => {
    if (!localMode && !isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return;
    }
    setIsLoading(true);
    const amount = parseUnits(stakeAmountStr, 18);

    if (localMode) {
      if (balances.azd < amount) {
        addToast('error', 'Insufficient AZD Balance', 'You do not have enough AZD to stake.');
        setIsLoading(false);
        return;
      }

      const newBal = { ...balances };
      newBal.azd -= amount;

      const newMultiUser = { ...multiUserInfo };
      newMultiUser.stakedAZD += amount;

      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      saveMultiLocalData(multiPoolInfo, newMultiUser, newBal, swapHistory);
      addToast('success', 'Staked Successfully!', `Staked ${stakeAmountStr} AZD into the compounding yield pool.`, randomHash);
      setIsLoading(false);
      return randomHash as `0x${string}`;
    }

    try {
      const approved = await approveToken(AZD_ADDRESS, DEX2_ADDRESS, amount);
      if (!approved) {
        setIsLoading(false);
        return;
      }

      addToast('info', 'Staking AZD', `Depositing ${stakeAmountStr} AZD...`);
      const hash = await writeContractAsync({
        address: DEX2_ADDRESS,
        abi: DEX2_ABI,
        functionName: 'stakeAZD',
        args: [amount],
      } as any);

      addToast('info', 'Staking Pending', 'Registering staking deposit...', hash);
      await waitForTransactionReceipt(config, { hash });

      addToast('success', 'Staking Completed!', 'AZD is now staked and earning yield.', hash);
      await fetchBlockchainData();
      return hash;
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
    } finally {
      setIsLoading(false);
    }
  };

  // Unstake AZD
  const unstakeAZD = async (unstakeAmountStr: string) => {
    if (!localMode && !isCorrectNetwork) {
      addToast(
        'error',
        'Wrong Network Connected',
        'Your wallet is connected to the wrong network. Please connect to Arc Testnet (Chain ID: 5042002) before performing this transaction.'
      );
      return;
    }
    setIsLoading(true);
    const amount = parseUnits(unstakeAmountStr, 18);

    if (localMode) {
      if (multiUserInfo.stakedAZD < amount) {
        addToast('error', 'Insufficient Staked Balance', 'You cannot unstake more than you have staked.');
        setIsLoading(false);
        return;
      }

      const newBal = { ...balances };
      newBal.azd += amount;

      const newMultiUser = { ...multiUserInfo };
      newMultiUser.stakedAZD -= amount;

      const randomHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      saveMultiLocalData(multiPoolInfo, newMultiUser, newBal, swapHistory);
      addToast('success', 'Unstaked Successfully!', `Withdrew ${unstakeAmountStr} AZD back to your wallet.`, randomHash);
      setIsLoading(false);
      return randomHash as `0x${string}`;
    }

    try {
      addToast('info', 'Unstaking AZD', `Withdrawing ${unstakeAmountStr} AZD...`);
      const hash = await writeContractAsync({
        address: DEX2_ADDRESS,
        abi: DEX2_ABI,
        functionName: 'unstakeAZD',
        args: [amount],
      } as any);

      addToast('info', 'Unstaking Pending', 'Confirming withdrawal on Arc Testnet...', hash);
      await waitForTransactionReceipt(config, { hash });

      addToast('success', 'Unstake Completed!', 'AZD returned to your wallet.', hash);
      await fetchBlockchainData();
      return hash;
    } catch (err: any) {
      console.error(err);
      const parsed = parseBlockchainError(err);
      addToast('error', parsed.title, parsed.description);
    } finally {
      setIsLoading(false);
    }
  };

  // Faucet claim for multiple play tokens (USDC, EURC, AZD)
  const mintFaucetTokens = () => {
    const newBal = {
      usdc: balances.usdc + 10000n * 10n ** 6n,
      eurc: balances.eurc + 10000n * 10n ** 6n,
      azd: balances.azd + 5000n * 10n ** 18n,
    };
    saveMultiLocalData(multiPoolInfo, multiUserInfo, newBal, swapHistory);
    addToast('success', 'Faucet Claimed!', 'Received +10,000 USDC, +10,000 EURC, and +5,000 AZD into your wallet simulator!');
  };

  return {
    address,
    isConnected,
    isCorrectNetwork,
    localMode,
    isLoading,
    poolInfo,
    userInfo,
    multiPoolInfo,
    multiUserInfo,
    balances,
    swapHistory,
    currentPrice,
    getSwapOutputPreview,
    getSwapOutputPreviewMulti,
    swapTokens,
    swapTokensMulti,
    addLiquidity,
    addLiquidityMulti,
    removeLiquidity,
    removeLiquidityMulti,
    claimRewards,
    claimAZDFaucet,
    stakeAZD,
    unstakeAZD,
    mintFaucetTokens,
    refreshData: fetchBlockchainData,
  };
}

// Helpers for serializing/deserializing BigInt to/from JSON (needed for localStorage caching)
function bigintReplacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return { __type: 'bigint', value: value.toString() };
  }
  return value;
}

function bigintReviver(_key: string, value: any) {
  if (value && typeof value === 'object' && value.__type === 'bigint') {
    return BigInt(value.value);
  }
  return value;
}

