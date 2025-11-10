/**
 * Deploy Seal Access Policies Move Package
 *
 * This script deploys the Seal access policies Move package to Sui testnet/mainnet.
 *
 * Usage:
 *   pnpm tsx scripts/seal-tests/deploy-seal-policies.ts [testnet|mainnet]
 *
 * Environment Variables:
 *   SUI_ADMIN_PRIVATE_KEY - Admin private key for deployment
 *   NEXT_PUBLIC_SUI_NETWORK - Network (testnet|mainnet)
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

function getAdminKeypair(): Ed25519Keypair {
  const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SUI_ADMIN_PRIVATE_KEY not set in environment variables');
  }
  try {
    if (privateKey.startsWith('suiprivkey1')) {
      // Handle base64-encoded private key
      const secretKeyBytes = fromB64(privateKey);
      return Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      // Handle raw private key
      return Ed25519Keypair.fromSecretKey(fromB64(privateKey));
    }
  } catch (error) {
    throw new Error(
      `Failed to parse admin private key: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function getNetwork(): 'testnet' | 'mainnet' {
  const network = process.argv[2] || process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error(`Invalid network: ${network}. Must be 'testnet' or 'mainnet'`);
  }
  return network;
}

async function deployPackage(network: 'testnet' | 'mainnet') {
  console.log(`\n🚀 Deploying Seal Access Policies to ${network}...\n`);

  // Get admin keypair
  const adminKeypair = getAdminKeypair();
  const adminAddress = adminKeypair.toSuiAddress();
  console.log(`📋 Admin address: ${adminAddress}`);

  // Get Sui client
  const suiClient = new SuiClient({ url: getFullnodeUrl(network) });

  // Build Move package
  console.log('\n📦 Building Move package...');
  const packagePath = path.join(process.cwd(), 'sui-contracts', 'diarybeast_seal_policies');
  try {
    execSync('sui move build', {
      cwd: packagePath,
      stdio: 'inherit',
    });
    console.log('✅ Build successful\n');
  } catch (error) {
    throw new Error(
      `Failed to build Move package: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Publish package using Sui CLI
  console.log('📤 Publishing package...');
  try {
    // Use Sui CLI to publish the package
    const publishOutput = execSync(`sui client publish --gas-budget 100000000 --json`, {
      cwd: packagePath,
      encoding: 'utf-8',
      env: {
        ...process.env,
        SUI_ADMIN_PRIVATE_KEY: process.env.SUI_ADMIN_PRIVATE_KEY,
      },
    });

    const publishResult = JSON.parse(publishOutput.toString());

    // Extract package ID from transaction effects
    let packageId: string | undefined;
    let policyRegistryId: string | undefined;
    let adminCapId: string | undefined;

    if (publishResult.objectChanges) {
      // Find published package
      const publishedPackage = publishResult.objectChanges.find(
        (change: any) => change.type === 'published'
      );
      if (publishedPackage) {
        packageId = publishedPackage.packageId;
      }

      // Find created objects
      const createdObjects = publishResult.objectChanges.filter(
        (change: any) => change.type === 'created'
      );

      // Find PolicyRegistry (shared object)
      const registryObject = createdObjects.find(
        (change: any) =>
          change.objectType?.includes('PolicyRegistry') ||
          change.objectType?.includes('policy_registry')
      );
      if (registryObject) {
        policyRegistryId = registryObject.objectId;
      }

      // Find AdminCap (owned object)
      const adminCapObject = createdObjects.find(
        (change: any) =>
          change.objectType?.includes('AdminCap') || change.objectType?.includes('admin_cap')
      );
      if (adminCapObject) {
        adminCapId = adminCapObject.objectId;
      }
    }

    // Alternative: try to get from effects
    if (!packageId && publishResult.effects?.created) {
      // Package ID is usually in the effects
      const created = publishResult.effects.created;
      if (created && created.length > 0) {
        // Package ID might be in the first created object or in a different field
        console.log('⚠️  Package ID not found in objectChanges, checking effects...');
      }
    }

    if (!packageId) {
      // Try to extract from transaction digest
      console.log('⚠️  Package ID not found in standard location. Transaction details:');
      console.log(JSON.stringify(publishResult, null, 2));
      throw new Error(
        'Failed to get package ID from publish result. Check transaction output above.'
      );
    }

    console.log(`\n✅ Package published successfully!`);
    console.log(`📦 Package ID: ${packageId}`);

    if (policyRegistryId) {
      console.log(`📋 PolicyRegistry ID: ${policyRegistryId}`);
    } else {
      console.log(`⚠️  PolicyRegistry ID not found in transaction output`);
    }

    if (adminCapId) {
      console.log(`🔑 AdminCap ID: ${adminCapId}`);
    } else {
      console.log(`⚠️  AdminCap ID not found in transaction output`);
      console.log(`   Note: AdminCap is transferred to deployer address: ${adminAddress}`);
    }

    console.log('\n📝 Next steps:');
    console.log(`1. Update NEXT_PUBLIC_SEAL_PACKAGE_ID in .env.local:`);
    console.log(`   NEXT_PUBLIC_SEAL_PACKAGE_ID=${packageId}`);
    if (policyRegistryId) {
      console.log(`2. Update SEAL_POLICY_REGISTRY_ID in .env.local:`);
      console.log(`   SEAL_POLICY_REGISTRY_ID=${policyRegistryId}`);
    } else {
      console.log(`2. Find PolicyRegistry object ID manually using Sui Explorer`);
      console.log(`   Search for objects created by package: ${packageId}`);
    }
    if (adminCapId) {
      console.log(`3. Update SEAL_ADMIN_CAP_ID in .env.local:`);
      console.log(`   SEAL_ADMIN_CAP_ID=${adminCapId}`);
    } else {
      console.log(`3. Find AdminCap object ID manually (owned by: ${adminAddress})`);
      console.log(`   Check objects owned by your admin address on Sui Explorer`);
    }
    console.log(`4. Create access policies for users using create_policy function`);
    console.log(`5. Test server-side decryption with access policies`);

    return {
      packageId,
      policyRegistryId: policyRegistryId || '',
      adminCapId: adminCapId || '',
    };
  } catch (error) {
    console.error('❌ Publishing failed. Error details:');
    console.error(error instanceof Error ? error.message : String(error));
    throw new Error(
      `Failed to publish package: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function main() {
  try {
    const network = getNetwork();
    await deployPackage(network);
  } catch (error) {
    console.error('❌ Deployment failed:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
