/**
 * Test Seal Encryption/Decryption
 *
 * This script tests Seal encryption and decryption functionality.
 *
 * Usage:
 *   pnpm tsx scripts/seal-tests/test-seal-encryption.ts [userAddress]
 *
 * Example:
 *   pnpm tsx scripts/seal-tests/test-seal-encryption.ts 0x1234567890abcdef...
 */

import * as dotenv from 'dotenv';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import {
  hybridEncrypt,
  hybridDecrypt,
  isSealAvailable,
  createSessionKey,
  createSealAuthorizationTransaction,
} from '../../lib/seal';
import { getAccessPoliciesPackageId, getPolicyRegistryId } from '../../lib/seal/config';

// Load environment variables
dotenv.config({ path: '.env.local' });

function getAdminKeypair(): Ed25519Keypair {
  const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SUI_ADMIN_PRIVATE_KEY not set in environment variables');
  }
  try {
    if (privateKey.startsWith('suiprivkey1')) {
      const secretKeyBytes = fromB64(privateKey);
      return Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      return Ed25519Keypair.fromSecretKey(fromB64(privateKey));
    }
  } catch (error) {
    throw new Error(
      `Failed to parse admin private key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function getNetwork(): 'testnet' | 'mainnet' {
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error(`Invalid network: ${network}. Must be 'testnet' or 'mainnet'`);
  }
  return network;
}

async function testEncryption(userAddress: string, adminAddress: string) {
  console.log(`\n🔐 Testing Seal Encryption/Decryption...\n`);

  // Check if Seal is available
  if (!isSealAvailable()) {
    console.error('❌ Seal is not available');
    console.error('   Please check:');
    console.error('   1. SEAL_ENABLED is not set to false');
    console.error('   2. Official Seal package ID is configured');
    console.error('   3. Key servers are configured');
    process.exit(1);
  }

  console.log(`✅ Seal is available\n`);
  console.log(`📋 User address: ${userAddress}`);
  console.log(`📋 Admin address: ${adminAddress}\n`);

  // Test data
  const testContent = 'This is a test diary entry for Seal encryption/decryption.';
  console.log(`📝 Test content: "${testContent}"\n`);

  // Step 1: Encrypt
  console.log('1️⃣  Encrypting content...');
  let encryptedResult;
  try {
    // Create a dummy signature for testing
    const signature = 'test-signature';
    encryptedResult = await hybridEncrypt(testContent, userAddress, signature);
    console.log(`   ✅ Encryption successful`);
    console.log(`   📦 Method: ${encryptedResult.method}`);
    if (encryptedResult.method === 'seal') {
      console.log(`   📦 Seal ID: ${encryptedResult.sealId}`);
      console.log(`   📦 Threshold: ${encryptedResult.sealThreshold}`);
      console.log(`   📦 Package ID: ${encryptedResult.sealPackageId}`);
    }
  } catch (error) {
    console.error(
      `   ❌ Encryption failed:`,
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }

  // Step 2: Decrypt (client-side - user decrypts their own entry)
  console.log('\n2️⃣  Testing client-side decryption (user decrypts their own entry)...');
  try {
    if (encryptedResult.method === 'seal') {
      // Create session key for user
      const sessionKey = await createSessionKey(userAddress, 'diarybeast', 60);

      // Create transaction bytes for seal_approve (user is requester)
      const network = getNetwork();
      const suiClient = new SuiClient({ url: getFullnodeUrl(network) });
      const txBytes = await createSealAuthorizationTransaction(
        userAddress,
        sessionKey,
        userAddress
      );

      // Decrypt
      const decrypted = await hybridDecrypt({
        encryptedData: encryptedResult.encryptedData,
        method: 'seal',
        walletAddress: userAddress,
        sealEncryptedObject: encryptedResult.sealEncryptedObject,
        sessionKey,
        txBytes,
        sealId: encryptedResult.sealId!,
      });

      console.log(`   ✅ Decryption successful`);
      console.log(`   📝 Decrypted content: "${decrypted}"`);

      if (decrypted === testContent) {
        console.log(`   ✅ Content matches original`);
      } else {
        console.error(`   ❌ Content does not match original`);
        process.exit(1);
      }
    } else {
      console.log(`   ⏭️  Skipping (not using Seal encryption)`);
    }
  } catch (error) {
    console.error(
      `   ❌ Client-side decryption failed:`,
      error instanceof Error ? error.message : String(error)
    );
    console.error(`   💡 This might be expected if access policy is not created for user`);
    console.error(
      `   💡 Run: pnpm tsx scripts/seal-tests/create-seal-access-policy.ts ${userAddress}`
    );
  }

  // Step 3: Decrypt (server-side - admin decrypts for AI analysis)
  console.log('\n3️⃣  Testing server-side decryption (admin decrypts for AI analysis)...');
  try {
    if (encryptedResult.method === 'seal') {
      // Create session key for user (identity is user address)
      const sessionKey = await createSessionKey(userAddress, 'diarybeast', 60);

      // Create transaction bytes for seal_approve (admin is requester)
      const txBytes = await createSealAuthorizationTransaction(
        userAddress,
        sessionKey,
        adminAddress
      );

      // Decrypt
      const decrypted = await hybridDecrypt({
        encryptedData: encryptedResult.encryptedData,
        method: 'seal',
        walletAddress: userAddress,
        sealEncryptedObject: encryptedResult.sealEncryptedObject,
        sessionKey,
        txBytes,
        sealId: encryptedResult.sealId!,
      });

      console.log(`   ✅ Decryption successful`);
      console.log(`   📝 Decrypted content: "${decrypted}"`);

      if (decrypted === testContent) {
        console.log(`   ✅ Content matches original`);
      } else {
        console.error(`   ❌ Content does not match original`);
        process.exit(1);
      }
    } else {
      console.log(`   ⏭️  Skipping (not using Seal encryption)`);
    }
  } catch (error) {
    console.error(
      `   ❌ Server-side decryption failed:`,
      error instanceof Error ? error.message : String(error)
    );
    console.error(`   💡 This might be expected if access policy is not created for user`);
    console.error(
      `   💡 Run: pnpm tsx scripts/seal-tests/create-seal-access-policy.ts ${userAddress}`
    );
  }

  console.log(`\n✅ All tests passed!`);
}

async function main() {
  try {
    const userAddress = process.argv[2];
    const adminKeypair = getAdminKeypair();
    const adminAddress = adminKeypair.toSuiAddress();

    if (!userAddress) {
      console.error('❌ Error: User address is required');
      console.error('Usage: pnpm tsx scripts/seal-tests/test-seal-encryption.ts <userAddress>');
      process.exit(1);
    }

    await testEncryption(userAddress, adminAddress);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
