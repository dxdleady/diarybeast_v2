/**
 * Test script for sponsored burn transactions
 *
 * This script tests the full flow of sponsored transactions:
 * 1. Mint tokens to a test user
 * 2. Create a burn transaction (without gas)
 * 3. Sponsor the transaction (add gas, sign as sponsor)
 * 4. Sign the transaction as user
 * 5. Execute the dual-signed transaction
 * 6. Verify tokens were burned
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import {
  createUserBurnTransaction,
  sponsorTransaction,
  executeSponsoredTransaction,
  getTokenConfig,
  getSuiClient,
  getAdminKeypair,
} from '../lib/sui/sponsored-transactions';
import { mintTokens, getUserTokenBalance, getUserCoins } from '../lib/sui/token';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Test user address (can be any address for testing)
// For real testing, you would use a wallet address
// For this script, we'll generate a test keypair
const TEST_USER_KEYPAIR = Ed25519Keypair.deriveKeypairFromSeed(
  new TextEncoder().encode('test-user-seed-for-sponsored-transactions')
);
const TEST_USER_ADDRESS = TEST_USER_KEYPAIR.toSuiAddress();
const BURN_AMOUNT = 50; // 50 tokens to burn
const MINT_AMOUNT = 200; // Mint 200 tokens first

async function testSponsoredBurn() {
  console.log('='.repeat(60));
  console.log('Testing Sponsored Burn Transaction Flow');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Step 0: Check admin keypair
    const adminKeypair = getAdminKeypair();
    if (!adminKeypair) {
      console.error('❌ ERROR: SUI_ADMIN_PRIVATE_KEY is not set');
      console.error('   Please set SUI_ADMIN_PRIVATE_KEY in .env.local');
      process.exit(1);
    }

    const adminAddress = adminKeypair.toSuiAddress();
    console.log('✅ Admin keypair loaded');
    console.log('   Admin address:', adminAddress);
    console.log('   Test user address:', TEST_USER_ADDRESS);
    console.log('');

    // Step 1: Mint tokens to test user
    console.log('Step 1: Minting tokens to test user...');
    console.log(`   Minting ${MINT_AMOUNT} tokens to ${TEST_USER_ADDRESS}`);

    const mintTxHash = await mintTokens(TEST_USER_ADDRESS, MINT_AMOUNT);

    if (!mintTxHash || mintTxHash === 'mint_failed' || mintTxHash === 'mint_skipped_no_admin_key') {
      console.error('❌ Failed to mint tokens');
      console.error('   Result:', mintTxHash);
      process.exit(1);
    }

    console.log('✅ Tokens minted');
    console.log('   Transaction hash:', mintTxHash);
    console.log('   View on Sui Explorer: https://suiscan.xyz/testnet/txblock/' + mintTxHash);
    console.log('');

    // Wait for transaction to be indexed
    console.log('   Waiting 3 seconds for transaction to be indexed...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check balance
    const { packageId } = getTokenConfig();
    let balance = await getUserTokenBalance(TEST_USER_ADDRESS, packageId);
    console.log('   User balance:', balance, 'tokens');
    console.log('');

    if (balance < BURN_AMOUNT) {
      console.error(
        `❌ ERROR: User balance (${balance}) is less than burn amount (${BURN_AMOUNT})`
      );
      process.exit(1);
    }

    // Step 2: Create user's burn transaction (without gas)
    console.log('Step 2: Creating user burn transaction (without gas)...');
    console.log(`   Burning ${BURN_AMOUNT} tokens`);

    const { treasuryCapId } = getTokenConfig();
    const userCoins = await getUserCoins(TEST_USER_ADDRESS, packageId);

    if (userCoins.length === 0) {
      console.error('❌ ERROR: User has no coins');
      process.exit(1);
    }

    const userCoinId = userCoins[0];
    console.log('   Using coin ID:', userCoinId);
    console.log('   TreasuryCap ID:', treasuryCapId);
    console.log('');

    const userTx = createUserBurnTransaction(
      packageId,
      treasuryCapId,
      userCoinId,
      BURN_AMOUNT,
      TEST_USER_ADDRESS
    );

    // Build transaction to get kind bytes (without gas)
    const client = getSuiClient();
    const kindBytes = await userTx.build({ client, onlyTransactionKind: true });
    console.log('✅ User transaction created (GasLessTransactionData)');
    console.log('   Kind bytes length:', kindBytes.length);
    console.log('');

    // Step 3: Sponsor the transaction
    console.log('Step 3: Sponsoring transaction (adding gas, signing as sponsor)...');

    const { transactionBytes, sponsorSignature } = await sponsorTransaction(
      kindBytes,
      TEST_USER_ADDRESS
    );

    console.log('✅ Transaction sponsored');
    console.log('   Transaction bytes length:', transactionBytes.length, '(base64)');
    console.log('   Sponsor signature length:', sponsorSignature.length);
    console.log('');

    // Step 4: Sign as user
    console.log('Step 4: Signing transaction as user...');

    // Convert base64 string to Uint8Array for signing
    // signTransactionBlock expects Uint8Array (transaction bytes)
    // transactionBytes is a base64 string from sponsorTransaction
    const { fromB64 } = require('@mysten/sui.js/utils');
    const transactionBytesArray = fromB64(transactionBytes);

    // Sign as user
    const userSignResult = await TEST_USER_KEYPAIR.signTransactionBlock(transactionBytesArray);
    const userSignature = userSignResult.signature;

    console.log('✅ Transaction signed by user');
    console.log('   User signature length:', userSignature.length);
    console.log('');

    // Step 5: Execute dual-signed transaction
    console.log('Step 5: Executing dual-signed transaction...');

    const digest = await executeSponsoredTransaction(
      transactionBytes,
      userSignature,
      sponsorSignature
    );

    console.log('✅ Transaction executed');
    console.log('   Transaction digest:', digest);
    console.log('   View on Sui Explorer: https://suiscan.xyz/testnet/txblock/' + digest);
    console.log('');

    // Wait for transaction to be indexed
    console.log('   Waiting 3 seconds for transaction to be indexed...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Step 6: Verify tokens were burned
    console.log('Step 6: Verifying tokens were burned...');

    const newBalance = await getUserTokenBalance(TEST_USER_ADDRESS, packageId);
    console.log('   Old balance:', balance, 'tokens');
    console.log('   New balance:', newBalance, 'tokens');
    console.log('   Expected new balance:', balance - BURN_AMOUNT, 'tokens');
    console.log('');

    if (newBalance === balance - BURN_AMOUNT) {
      console.log('✅ SUCCESS: Tokens were burned correctly!');
      console.log('');
      console.log('='.repeat(60));
      console.log('Test Summary:');
      console.log('='.repeat(60));
      console.log('✅ Minted tokens to user');
      console.log('✅ Created burn transaction (without gas)');
      console.log('✅ Sponsored transaction (added gas, signed as sponsor)');
      console.log('✅ Signed transaction as user');
      console.log('✅ Executed dual-signed transaction');
      console.log('✅ Verified tokens were burned');
      console.log('='.repeat(60));
    } else {
      console.error('❌ ERROR: Token balance mismatch');
      console.error(`   Expected: ${balance - BURN_AMOUNT}, Got: ${newBalance}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('');
    console.error('❌ ERROR: Test failed');
    console.error('   Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testSponsoredBurn();
