import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { getSuiClient } from '../lib/sui/sponsored-transactions';

const LAST_TX_DIGEST = 'EkH5SobJP28BP9NtQcbDng2sX9d9T3YWRAiJvMwCCjkc';
const USER_ADDRESS = '0x6014f6d591069f41a3d16934c57670f6a8bb4671d155b0f1ea87b8f693afd693';
const ADMIN_ADDRESS = '0x19de592bfb0c6b325e741170c20cc59be6fc77b5c32230ca8c6d5bd30b82dc23';

async function checkLastTx() {
  const client = getSuiClient();

  console.log('Checking transaction:', LAST_TX_DIGEST);
  console.log('');

  const tx = await client.getTransactionBlock({
    digest: LAST_TX_DIGEST,
    options: {
      showInput: true,
      showEffects: true,
      showEvents: true,
      showObjectChanges: true,
    },
  });

  console.log('=== TRANSACTION DETAILS ===');
  console.log('Transaction digest:', tx.digest);
  console.log('Sender:', tx.transaction?.data.sender);
  console.log('');

  console.log('=== OBJECT CHANGES ===');
  if (tx.objectChanges) {
    for (const change of tx.objectChanges) {
      if (change.type === 'created') {
        const created = change as any;
        if (created.objectType?.includes('Coin<')) {
          console.log('Created Coin:');
          console.log('  Object ID:', created.objectId);
          console.log('  Object Type:', created.objectType);
          console.log('  Owner:', JSON.stringify(created.owner, null, 2));

          if (created.owner && 'AddressOwner' in created.owner) {
            const ownerAddr = created.owner.AddressOwner;
            console.log('  Owner Address:', ownerAddr);
            console.log('  Expected (User):', USER_ADDRESS);
            console.log('  Admin Address:', ADMIN_ADDRESS);

            if (ownerAddr.toLowerCase() === USER_ADDRESS.toLowerCase()) {
              console.log('  ✅ CORRECT: Coin belongs to USER');
            } else if (ownerAddr.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
              console.log('  ❌ WRONG: Coin belongs to ADMIN');
            } else {
              console.log('  ⚠️  UNEXPECTED: Coin belongs to different address');
            }
          }
          console.log('');
        }
      }
    }
  }

  console.log('=== TRANSACTION INPUT ===');
  if (tx.transaction?.data.transaction?.data?.moveCalls) {
    for (const call of tx.transaction.data.transaction.data.moveCalls) {
      console.log('Move Call:');
      console.log('  Target:', call.target);
      console.log('  Arguments:', JSON.stringify(call.arguments, null, 2));
      console.log('');
    }
  }
}

checkLastTx();
