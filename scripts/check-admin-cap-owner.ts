/**
 * Check AdminCap and TreasuryCap ownership
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import { getTokenConfig } from '../lib/sui/sponsored-transactions';
import { decodeSuiprivkey } from '../lib/sui/token';

async function checkOwnership() {
  const client = new SuiClient({
    url: getFullnodeUrl((process.env.NEXT_PUBLIC_SUI_NETWORK as any) || 'testnet'),
  });

  const { adminCapId, treasuryCapId } = getTokenConfig();

  if (!adminCapId || !treasuryCapId) {
    console.error('AdminCap ID or TreasuryCap ID is not set in environment variables');
    process.exit(1);
  }

  const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    console.error('SUI_ADMIN_PRIVATE_KEY environment variable is not set');
    process.exit(1);
  }

  let adminKeypair: Ed25519Keypair;
  try {
    if (privateKey.startsWith('suiprivkey1')) {
      const secretKeyBytes = decodeSuiprivkey(privateKey);
      adminKeypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      adminKeypair = Ed25519Keypair.fromSecretKey(fromB64(privateKey));
    }
  } catch (error) {
    console.error('Failed to create admin keypair:', error);
    process.exit(1);
  }

  const adminAddress = adminKeypair.toSuiAddress();

  console.log('='.repeat(60));
  console.log('Checking AdminCap and TreasuryCap Ownership');
  console.log('='.repeat(60));
  console.log('');
  console.log('Current Admin Address:', adminAddress);
  console.log('');

  console.log('=== AdminCap ===');
  console.log(`AdminCap ID: ${adminCapId}`);
  try {
    const adminCapObject = await client.getObject({
      id: adminCapId!,
      options: { showOwner: true, showType: true },
    });

    if (adminCapObject.data?.owner) {
      const owner = adminCapObject.data.owner as any;
      if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
        const ownerAddress = owner.AddressOwner;
        console.log(`Owner: ${ownerAddress}`);

        if (ownerAddress.toLowerCase() === adminAddress?.toLowerCase()) {
          console.log('✅ AdminCap belongs to current admin');
        } else {
          console.error('❌ ERROR: AdminCap belongs to DIFFERENT admin!');
          console.error(`   Expected: ${adminAddress}`);
          console.error(`   Actual: ${ownerAddress}`);
          console.error('');
          console.error('SOLUTION:');
          console.error('  1. Use the private key for address:', ownerAddress);
          console.error('  2. Or transfer AdminCap to current admin:', adminAddress);
        }
      }
    }
  } catch (error) {
    console.error('Error checking AdminCap:', error);
  }
  console.log('');

  console.log('=== TreasuryCap ===');
  console.log(`TreasuryCap ID: ${treasuryCapId}`);
  try {
    const treasuryCapObject = await client.getObject({
      id: treasuryCapId!,
      options: { showOwner: true, showType: true },
    });

    if (treasuryCapObject.data?.owner) {
      const owner = treasuryCapObject.data.owner as any;
      if (owner && typeof owner === 'object' && 'Shared' in owner) {
        const sharedVersion = owner.Shared?.initial_shared_version;
        console.log(`Owner: Shared (version: ${sharedVersion})`);
        console.log('✅ TreasuryCap is shared object (correct)');
      } else if (owner && typeof owner === 'object' && 'AddressOwner' in owner) {
        const ownerAddress = owner.AddressOwner;
        console.log(`Owner: ${ownerAddress}`);
        console.error('❌ ERROR: TreasuryCap is owned (should be shared)!');
        console.error(`   Current owner: ${ownerAddress}`);
        if (ownerAddress.toLowerCase() !== adminAddress?.toLowerCase()) {
          console.error('   This owner is DIFFERENT from current admin!');
        }
      }
    }
  } catch (error) {
    console.error('Error checking TreasuryCap:', error);
  }
  console.log('');
  console.log('='.repeat(60));
}

checkOwnership().catch(console.error);
