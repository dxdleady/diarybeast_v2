import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { mintTokens } from '../lib/sui/token';

const TEST_ADDRESS = '0x6014f6d591069f41a3d16934c57670f6a8bb4671d155b0f1ea87b8f693afd693';
const MINT_AMOUNT = 100; // 100 tokens

async function testMint() {
  console.log('Testing mint to address:', TEST_ADDRESS);
  console.log('Amount:', MINT_AMOUNT, 'tokens');
  console.log('');

  try {
    const txHash = await mintTokens(TEST_ADDRESS, MINT_AMOUNT);

    if (txHash && txHash !== 'mint_skipped_no_admin_key' && txHash !== 'mint_failed') {
      console.log('');
      console.log('✅ Mint successful!');
      console.log('Transaction hash:', txHash);
      console.log('View on Sui Explorer: https://suiscan.xyz/testnet/txblock/' + txHash);

      // Wait a bit for transaction to be indexed
      console.log('');
      console.log('Waiting 3 seconds for transaction to be indexed...');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check balance
      console.log('Checking balance for address:', TEST_ADDRESS);
      const { getUserTokenBalance } = require('../lib/sui/token');
      const { getTokenConfig } = require('../lib/sui/sponsored-transactions');
      const { getSuiClient } = require('../lib/sui/sponsored-transactions');

      const { packageId } = getTokenConfig();
      const balance = await getUserTokenBalance(TEST_ADDRESS, packageId);
      console.log('Balance:', balance, 'tokens');

      if (balance >= MINT_AMOUNT) {
        console.log('✅ Tokens successfully received!');
      } else {
        console.log('⚠️  Warning: Expected', MINT_AMOUNT, 'tokens, but balance is', balance);
      }
    } else {
      console.log('❌ Mint failed or skipped');
      console.log('Result:', txHash);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMint();
