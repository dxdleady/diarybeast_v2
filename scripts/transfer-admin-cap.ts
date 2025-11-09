/**
 * Transfer AdminCap from old admin to new admin
 *
 * This script transfers AdminCap from the old admin (0x78fda0...) to the new admin (0x19de59...)
 *
 * IMPORTANT: You need the OLD admin's private key to run this script!
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';
import { getTokenConfig } from '../lib/sui/sponsored-transactions';
import { decodeSuiprivkey } from '../lib/sui/token';

const OLD_ADMIN_ADDRESS = '0x78fda05559385f9d053f60a2358456f336be8ce403e9a64d904b4e26292073c4';
const NEW_ADMIN_ADDRESS = '0x19de592bfb0c6b325e741170c20cc59be6fc77b5c32230ca8c6d5bd30b82dc23';

async function transferAdminCap() {
  const client = new SuiClient({
    url: getFullnodeUrl((process.env.NEXT_PUBLIC_SUI_NETWORK as any) || 'testnet'),
  });

  const { adminCapId, packageId } = getTokenConfig();

  console.log('='.repeat(60));
  console.log('Transfer AdminCap');
  console.log('='.repeat(60));
  console.log('');

  console.log('AdminCap ID:', adminCapId);
  console.log('Old Admin:', OLD_ADMIN_ADDRESS);
  console.log('New Admin:', NEW_ADMIN_ADDRESS);
  console.log('');

  // Get OLD admin keypair from environment variable
  // You can set OLD_ADMIN_PRIVATE_KEY in .env.local or pass it as argument
  const oldAdminPrivateKey = process.env.OLD_ADMIN_PRIVATE_KEY || process.env.SUI_ADMIN_PRIVATE_KEY;

  if (!oldAdminPrivateKey) {
    console.error('ERROR: OLD_ADMIN_PRIVATE_KEY environment variable is not set');
    console.error('');
    console.error('SOLUTION:');
    console.error('  1. Set OLD_ADMIN_PRIVATE_KEY in .env.local with the private key for address:');
    console.error(`     ${OLD_ADMIN_ADDRESS}`);
    console.error('');
    console.error('  2. Or if you have the private key, set it temporarily:');
    console.error('     export OLD_ADMIN_PRIVATE_KEY="your-private-key-here"');
    console.error('     npx tsx scripts/transfer-admin-cap.ts');
    console.error('');
    process.exit(1);
  }

  let oldAdminKeypair: Ed25519Keypair;
  try {
    if (oldAdminPrivateKey.startsWith('suiprivkey1')) {
      const secretKeyBytes = decodeSuiprivkey(oldAdminPrivateKey);
      oldAdminKeypair = Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      oldAdminKeypair = Ed25519Keypair.fromSecretKey(fromB64(oldAdminPrivateKey));
    }
  } catch (error) {
    console.error('Failed to create old admin keypair:', error);
    process.exit(1);
  }

  const oldAdminAddress = oldAdminKeypair.toSuiAddress();
  console.log('Old Admin Address (from key):', oldAdminAddress);
  console.log('');

  if (oldAdminAddress.toLowerCase() !== OLD_ADMIN_ADDRESS.toLowerCase()) {
    console.error('ERROR: Private key does not match old admin address!');
    console.error(`  Expected: ${OLD_ADMIN_ADDRESS}`);
    console.error(`  Got: ${oldAdminAddress}`);
    console.error('');
    process.exit(1);
  }

  // Verify AdminCap belongs to old admin
  console.log('Verifying AdminCap ownership...');
  try {
    const adminCapObject = await client.getObject({
      id: adminCapId,
      options: { showOwner: true },
    });

    if (adminCapObject.data?.owner) {
      const owner = adminCapObject.data.owner;
      if ('AddressOwner' in owner) {
        const ownerAddress = owner.AddressOwner;
        if (ownerAddress.toLowerCase() !== OLD_ADMIN_ADDRESS.toLowerCase()) {
          console.error('ERROR: AdminCap does not belong to old admin!');
          console.error(`  Expected: ${OLD_ADMIN_ADDRESS}`);
          console.error(`  Actual: ${ownerAddress}`);
          process.exit(1);
        }
        console.log('✅ AdminCap belongs to old admin');
      } else {
        console.error('ERROR: AdminCap is not owned (it might be shared)');
        process.exit(1);
      }
    } else {
      console.error('ERROR: AdminCap has no owner');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error verifying AdminCap:', error);
    process.exit(1);
  }
  console.log('');

  // Create transaction to transfer AdminCap
  console.log('Creating transfer transaction...');
  const tx = new TransactionBlock();

  // Use the transfer_admin function from the Move contract
  tx.moveCall({
    target: `${packageId}::diary_token::transfer_admin`,
    arguments: [tx.object(adminCapId), tx.pure.address(NEW_ADMIN_ADDRESS)],
  });

  console.log('Transaction created');
  console.log('');

  // Sign and execute transaction
  console.log('Signing and executing transaction...');
  try {
    const result = await client.signAndExecuteTransactionBlock({
      signer: oldAdminKeypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
      },
    });

    console.log('✅ Transaction successful!');
    console.log('Transaction digest:', result.digest);
    console.log('');

    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
    console.log(`View on Sui Explorer: https://suiscan.xyz/${network}/txblock/${result.digest}`);
    console.log('');

    // Verify AdminCap was transferred
    console.log('Verifying AdminCap was transferred...');
    const adminCapObject = await client.getObject({
      id: adminCapId,
      options: { showOwner: true },
    });

    if (adminCapObject.data?.owner) {
      const owner = adminCapObject.data.owner;
      if ('AddressOwner' in owner) {
        const ownerAddress = owner.AddressOwner;
        if (ownerAddress.toLowerCase() === NEW_ADMIN_ADDRESS.toLowerCase()) {
          console.log('✅ AdminCap successfully transferred to new admin!');
          console.log(`   New owner: ${ownerAddress}`);
        } else {
          console.error('❌ ERROR: AdminCap was not transferred correctly');
          console.error(`   Expected: ${NEW_ADMIN_ADDRESS}`);
          console.error(`   Actual: ${ownerAddress}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Transaction failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ AdminCap transfer completed successfully!');
  console.log('='.repeat(60));
}

transferAdminCap().catch(console.error);
