#!/usr/bin/env tsx
/**
 * Seal Shares Diagnostic Script
 *
 * This script tests Seal encryption/decryption and diagnoses "Not enough shares" errors.
 * It checks:
 * 1. Key server configuration
 * 2. Key server availability
 * 3. Encryption with different thresholds
 * 4. Decryption and share retrieval
 * 5. Actual shares received vs threshold required
 *
 * Usage:
 *   pnpm tsx scripts/seal-tests/test-seal-shares.ts
 *
 * Environment variables required:
 *   - SUI_ADMIN_PRIVATE_KEY (for signing personal message)
 *   - NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS (comma-separated key server object IDs)
 *   - NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID (official Seal package ID)
 *   - TEST_WALLET_ADDRESS (optional, defaults to test address)
 */

import { getSealClient, getSuiClient } from '../../lib/seal/client';
import {
  sealConfig,
  getKeyServerConfigs,
  getOfficialSealPackageId,
  isSealConfigured,
} from '../../lib/seal/config';
import { encryptWithSeal, decryptWithSeal } from '../../lib/seal/encryption';
import { createSessionKey } from '../../lib/seal/session-key';
import { createSealAuthorizationTransaction } from '../../lib/seal/transaction';
import { DemType } from '@mysten/seal';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Test identity (wallet address)
// IMPORTANT: For testing, we'll use admin address as identity if TEST_WALLET_PRIVATE_KEY is not provided
// This allows us to sign the personal message correctly
let TEST_IDENTITY: string;
let TEST_KEYPAIR: Ed25519Keypair | null = null;

// Test data
const TEST_DATA = new TextEncoder().encode('Test diary entry for Seal shares diagnostic');

async function getAdminKeypair(): Promise<Ed25519Keypair | null> {
  const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  try {
    if (privateKey.startsWith('suiprivkey1')) {
      const { decodeSuiprivkey } = await import('../../lib/sui/token');
      const secretKeyBytes = decodeSuiprivkey(privateKey);
      return Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      return Ed25519Keypair.fromSecretKey(fromB64(privateKey));
    }
  } catch (error) {
    console.error('Error getting admin keypair:', error);
    return null;
  }
}

async function getTestKeypair(): Promise<Ed25519Keypair | null> {
  // First, try to get user's private key from environment
  const userPrivateKey = process.env.TEST_WALLET_PRIVATE_KEY;
  if (userPrivateKey) {
    try {
      if (userPrivateKey.startsWith('suiprivkey1')) {
        const { decodeSuiprivkey } = await import('../../lib/sui/token');
        const secretKeyBytes = decodeSuiprivkey(userPrivateKey);
        return Ed25519Keypair.fromSecretKey(secretKeyBytes);
      } else {
        return Ed25519Keypair.fromSecretKey(fromB64(userPrivateKey));
      }
    } catch (error) {
      console.error('Error parsing TEST_WALLET_PRIVATE_KEY:', error);
    }
  }

  // Fallback to admin keypair (for testing purposes)
  return await getAdminKeypair();
}

async function initializeTestIdentity() {
  // Try to get user's private key
  const userKeypair = await getTestKeypair();
  if (userKeypair) {
    TEST_KEYPAIR = userKeypair;
    TEST_IDENTITY = userKeypair.toSuiAddress();
    console.log(`Using identity from keypair: ${TEST_IDENTITY}`);
  } else {
    // Use provided address or default
    TEST_IDENTITY =
      process.env.TEST_WALLET_ADDRESS ||
      '0x281921ed203cad4b4a9f95198fe25aa2c1b49881b37e8dc165701a9bf21752b2';
    console.log(`Using test identity: ${TEST_IDENTITY}`);
    console.log(
      '⚠️  No private key provided - decryption test will use admin keypair (may fail signature validation)'
    );
  }
}

async function checkKeyServers() {
  console.log('\n=== Key Servers Configuration ===');
  const keyServers = getKeyServerConfigs();
  console.log(`Key servers configured: ${keyServers.length}`);

  if (keyServers.length === 0) {
    console.error('❌ No key servers configured!');
    return false;
  }

  keyServers.forEach((ks, index) => {
    console.log(`  ${index + 1}. Object ID: ${ks.objectId}`);
    console.log(`     Weight: ${ks.weight || 1}`);
    if (ks.apiKey) {
      console.log(`     API Key: ${ks.apiKey ? 'configured' : 'not configured'}`);
    }
  });

  const threshold = sealConfig.defaultThreshold;
  console.log(`\nDefault threshold: ${threshold}`);
  console.log(`Key servers available: ${keyServers.length}`);

  if (threshold > keyServers.length) {
    console.error(
      `❌ Threshold (${threshold}) is higher than available key servers (${keyServers.length})!`
    );
    console.error('   This will cause "Not enough shares" errors.');
    return false;
  }

  if (threshold === keyServers.length) {
    console.warn(`⚠️  Threshold (${threshold}) equals key servers count (${keyServers.length})`);
    console.warn('   All key servers must respond for decryption to work.');
    console.warn('   If any key server is unavailable, decryption will fail.');
  }

  return true;
}

async function testEncryption(threshold?: number) {
  console.log('\n=== Testing Encryption ===');
  const testThreshold = threshold || sealConfig.defaultThreshold;
  const packageId = getOfficialSealPackageId();

  console.log(`Identity: ${TEST_IDENTITY}`);
  console.log(`Package ID: ${packageId}`);
  console.log(`Threshold: ${testThreshold}`);
  console.log(`Data length: ${TEST_DATA.length} bytes`);

  try {
    const result = await encryptWithSeal(TEST_DATA, TEST_IDENTITY, testThreshold);
    console.log('✅ Encryption successful');
    console.log(`   Encrypted object length: ${result.encryptedObject.length} bytes`);
    console.log(`   Seal ID: ${result.id}`);
    console.log(`   Threshold used: ${result.threshold}`);
    return result;
  } catch (error: any) {
    console.error('❌ Encryption failed:', error.message);
    throw error;
  }
}

async function testDecryption(encryptedResult: any, threshold?: number) {
  console.log('\n=== Testing Decryption ===');
  const testThreshold = threshold || encryptedResult.threshold;

  console.log(`Identity: ${TEST_IDENTITY}`);
  console.log(`Seal ID: ${encryptedResult.id}`);
  console.log(`Threshold: ${testThreshold}`);
  console.log(`Key servers: ${getKeyServerConfigs().length}`);

  try {
    // Create SessionKey
    console.log('\n1. Creating SessionKey...');
    const sessionKey = await createSessionKey(
      TEST_IDENTITY,
      undefined, // mvrName
      30, // ttlMin
      undefined // signer - we'll sign manually
    );
    console.log('   ✅ SessionKey created');

    // Sign personal message
    console.log('\n2. Signing personal message...');
    // Use test keypair if available, otherwise admin keypair
    const signerKeypair = TEST_KEYPAIR || (await getAdminKeypair());
    if (!signerKeypair) {
      throw new Error('No keypair available for signing');
    }

    const signerAddress = signerKeypair.toSuiAddress();
    console.log(`   Signer address: ${signerAddress}`);
    console.log(`   SessionKey identity: ${TEST_IDENTITY}`);

    if (signerAddress !== TEST_IDENTITY) {
      console.warn(
        `   ⚠️  WARNING: Signer address (${signerAddress}) does not match SessionKey identity (${TEST_IDENTITY})`
      );
      console.warn(`   This may cause "Not valid" error when setting signature.`);
    }

    const personalMessage = sessionKey.getPersonalMessage();
    const signatureResult = await signerKeypair.signPersonalMessage(personalMessage);

    try {
      await sessionKey.setPersonalMessageSignature(signatureResult.signature);
      console.log('   ✅ Personal message signed and validated');
    } catch (sigError: any) {
      console.error('   ❌ Failed to set personal message signature:', sigError.message);
      if (sigError.message.includes('Not valid')) {
        console.error(
          '   This usually means the signature does not match the SessionKey identity.'
        );
        console.error('   Solution: Use a keypair that matches the identity used for encryption.');
        throw sigError;
      }
      throw sigError;
    }

    // Create authorization transaction
    console.log('\n3. Creating authorization transaction...');
    const requesterAddress = signerKeypair.toSuiAddress();
    const txBytes = await createSealAuthorizationTransaction(
      TEST_IDENTITY,
      sessionKey,
      requesterAddress
    );
    console.log(`   ✅ Transaction created (${txBytes.length} bytes)`);
    console.log(`   Requester address: ${requesterAddress}`);

    // Test fetchKeys with detailed logging
    console.log('\n4. Fetching keys from key servers...');
    const client = getSealClient();
    const keyServers = getKeyServerConfigs();

    console.log(`   Requesting ${testThreshold} shares from ${keyServers.length} key servers...`);

    try {
      await client.fetchKeys({
        ids: [TEST_IDENTITY],
        txBytes,
        sessionKey,
        threshold: testThreshold,
      });
      console.log('   ✅ Keys fetched successfully');
    } catch (fetchError: any) {
      console.error('   ❌ Failed to fetch keys:', fetchError.message);
      console.error('   This might indicate:');
      console.error('     - Key servers are not available');
      console.error('     - Key servers do not have keys for this identity');
      console.error('     - Authorization transaction is invalid');
      throw fetchError;
    }

    // Attempt decryption
    console.log('\n5. Attempting decryption...');
    console.log(
      `   Using threshold: ${testThreshold} (from encryption: ${encryptedResult.threshold})`
    );
    const decrypted = await decryptWithSeal({
      encryptedObject: encryptedResult.encryptedObject,
      sessionKey,
      txBytes,
      id: TEST_IDENTITY,
      threshold: testThreshold, // Use the same threshold as encryption
    });

    console.log('   ✅ Decryption successful');
    console.log(`   Decrypted data length: ${decrypted.length} bytes`);

    const decryptedText = new TextDecoder().decode(decrypted);
    if (decryptedText === new TextDecoder().decode(TEST_DATA)) {
      console.log('   ✅ Decrypted data matches original');
    } else {
      console.error('   ❌ Decrypted data does not match original!');
    }

    return decrypted;
  } catch (error: any) {
    console.error('❌ Decryption failed:', error.message);
    if (error.message.includes('Not enough shares')) {
      console.error('\n   Possible causes:');
      console.error('   1. Not all key servers responded');
      console.error('   2. Key servers do not have keys for this identity');
      console.error('   3. Threshold is too high for available key servers');
      console.error('   4. Key servers are not properly configured');
    }
    throw error;
  }
}

async function testWithDifferentThresholds() {
  console.log('\n=== Testing with Different Thresholds ===');
  const keyServers = getKeyServerConfigs();
  const maxThreshold = keyServers.length;

  for (let threshold = 1; threshold <= maxThreshold; threshold++) {
    console.log(`\n--- Testing with threshold = ${threshold} ---`);
    try {
      const encrypted = await testEncryption(threshold);
      await testDecryption(encrypted, threshold);
      console.log(`✅ Threshold ${threshold} works!`);
    } catch (error: any) {
      console.error(`❌ Threshold ${threshold} failed:`, error.message);
    }
  }
}

async function main() {
  console.log('🔍 Seal Shares Diagnostic Script');
  console.log('================================\n');

  // Initialize test identity
  await initializeTestIdentity();
  console.log('');

  // Check configuration
  if (!isSealConfigured()) {
    console.error('❌ Seal is not configured!');
    console.error('Please configure key servers and package ID.');
    process.exit(1);
  }

  console.log('✅ Seal is configured');

  // Check key servers
  const keyServersOk = await checkKeyServers();
  if (!keyServersOk) {
    console.error('\n❌ Key servers configuration is invalid!');
    process.exit(1);
  }

  // Test basic encryption/decryption
  try {
    console.log('\n=== Basic Encryption/Decryption Test ===');
    const encrypted = await testEncryption();
    await testDecryption(encrypted);
    console.log('\n✅ Basic test passed!');
  } catch (error: any) {
    console.error('\n❌ Basic test failed:', error.message);
    console.error('\nTrying with different thresholds...');
    await testWithDifferentThresholds();
    process.exit(1);
  }

  // Test with different thresholds
  await testWithDifferentThresholds();

  console.log('\n✅ All tests completed!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
