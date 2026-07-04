import { createPublicClient, http } from 'viem';
import * as fs from 'fs';
import {
  DEX_ADDRESS,
  DEX_ABI,
} from './src/contracts';

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
});

const USER = '0x13b3216c71bc6a75b9dd87017dde2e8867d8999f';

async function testSimulate(amountUSDC: bigint, amountEURC: bigint) {
  try {
    await client.simulateContract({
      address: DEX_ADDRESS,
      abi: DEX_ABI,
      functionName: 'addLiquidity',
      args: [amountUSDC, amountEURC],
      account: USER,
    });
    return { success: true, error: null };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function main() {
  const results: any[] = [];

  // Try 5 USDC and 4 EURC (original failing case)
  results.push({
    test: '5 USDC, 4 EURC',
    res: await testSimulate(5_000_000n, 4_000_000n)
  });

  // Try 5 USDC and 5 EURC (equal amounts)
  results.push({
    test: '5 USDC, 5 EURC',
    res: await testSimulate(5_000_000n, 5_000_000n)
  });

  // Try 10 USDC and 10 EURC
  results.push({
    test: '10 USDC, 10 EURC',
    res: await testSimulate(10_000_000n, 10_000_000n)
  });

  // Try 100 USDC and 100 EURC
  results.push({
    test: '100 USDC, 100 EURC',
    res: await testSimulate(100_000_000n, 100_000_000n)
  });

  fs.writeFileSync('simulate_results.txt', JSON.stringify(results, null, 2));
}

main();
