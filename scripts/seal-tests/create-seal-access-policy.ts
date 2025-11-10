/**
 * Create Seal Access Policy for a User
 *
 * This script creates an access policy for a user, allowing:
 * 1. User to decrypt their own entries (implicit)
 * 2. Server (admin) to decrypt entries for AI analysis
 *
 * Usage:
 *   pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>
 *
 * Example:
 *   pnpm tsx scripts/seal-tests/create-seal-access-policy.ts 0x1234567890abcdef...
 */

import * as dotenv from 'dotenv';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import {
  getAccessPoliciesPackageId,
  getPolicyRegistryId,
  getAdminCapId,
} from '../../lib/seal/config';

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

async function createAccessPolicy(userAddress: string, adminAddress: string) {
  const network = getNetwork();
  console.log(`\n🔐 Creating Seal Access Policy for user on ${network}...\n`);

  const adminKeypair = getAdminKeypair();
  const adminAddressFromKey = adminKeypair.toSuiAddress();

  console.log(`📋 User address: ${userAddress}`);
  console.log(`📋 Admin address: ${adminAddress}`);
  console.log(`📋 Admin address from key: ${adminAddressFromKey}`);

  if (adminAddress !== adminAddressFromKey) {
    console.warn(
      `⚠️  Warning: Admin address from key (${adminAddressFromKey}) does not match provided admin address (${adminAddress})`
    );
    console.warn(`   Using admin address from key: ${adminAddressFromKey}`);
    adminAddress = adminAddressFromKey;
  }

  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

  const packageId = getAccessPoliciesPackageId();
  const policyRegistryId = getPolicyRegistryId();
  const adminCapId = getAdminCapId();

  if (!packageId) {
    throw new Error(
      'Access policies package ID not configured. Please set NEXT_PUBLIC_SEAL_PACKAGE_ID'
    );
  }

  if (!policyRegistryId) {
    throw new Error('Policy Registry ID not configured. Please set SEAL_POLICY_REGISTRY_ID');
  }

  if (!adminCapId) {
    throw new Error('Admin Cap ID not configured. Please set SEAL_ADMIN_CAP_ID');
  }

  console.log(`\n📦 Package ID: ${packageId}`);
  console.log(`📋 Policy Registry ID: ${policyRegistryId}`);
  console.log(`🔑 Admin Cap ID: ${adminCapId}\n`);

  // Create transaction
  const tx = new Transaction();

  tx.moveCall({
    target: `${packageId}::seal_policies::create_policy`,
    arguments: [
      tx.object(policyRegistryId),
      tx.pure.address(userAddress),
      tx.pure.address(adminAddress),
    ],
  });

  // Execute transaction
  console.log('📤 Executing transaction...');
  const result = await suiClient.signAndExecuteTransaction({
    signer: adminKeypair,
    transaction: tx,
    options: {
      showEffects: true,
      showObjectChanges: true,
    },
  });

  console.log(`\n✅ Access policy created successfully!`);
  console.log(`📋 Transaction digest: ${result.digest}`);
  console.log(`🔗 Explorer: https://suiscan.xyz/${network}/tx/${result.digest}`);

  // Check if policy was created
  if (result.objectChanges) {
    const createdObjects = result.objectChanges.filter((change: any) => change.type === 'created');

    const policyObject = createdObjects.find(
      (change: any) =>
        change.objectType?.includes('AccessPolicy') || change.objectType?.includes('access_policy')
    );

    if (policyObject) {
      console.log(`\n📋 Access Policy Object ID: ${policyObject.objectId}`);
    }
  }

  console.log(`\n✅ Access policy created for user ${userAddress}`);
  console.log(`   - User can decrypt their own entries (implicit)`);
  console.log(`   - Admin (${adminAddress}) can decrypt entries for AI analysis`);

  return result;
}

async function main() {
  try {
    const userAddress = process.argv[2];
    const adminAddress = process.argv[3];

    if (!userAddress) {
      console.error('❌ Error: User address is required');
      console.error(
        'Usage: pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress> [adminAddress]'
      );
      process.exit(1);
    }

    // Get admin address from keypair if not provided
    const finalAdminAddress = adminAddress || getAdminKeypair().toSuiAddress();

    await createAccessPolicy(userAddress, finalAdminAddress);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
