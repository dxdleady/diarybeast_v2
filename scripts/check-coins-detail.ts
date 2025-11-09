import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { getSuiClient } from '../lib/sui/sponsored-transactions';
import { getTokenConfig } from '../lib/sui/sponsored-transactions';

const USER_ADDRESS = '0x6014f6d591069f41a3d16934c57670f6a8bb4671d155b0f1ea87b8f693afd693';
const ADMIN_ADDRESS = '0x19de592bfb0c6b325e741170c20cc59be6fc77b5c32230ca8c6d5bd30b82dc23';

async function checkCoinsDetail() {
  const client = getSuiClient();
  const { packageId } = getTokenConfig();
  const coinType = `0x2::coin::Coin<${packageId}::diary_token::DIARY_TOKEN>`;

  console.log('Package ID:', packageId);
  console.log('Coin type:', coinType);
  console.log('');

  // Check user coins
  console.log('=== USER COINS ===');
  console.log('User address:', USER_ADDRESS);
  const userObjects = await client.getOwnedObjects({
    owner: USER_ADDRESS,
    filter: {
      StructType: coinType,
    },
    options: {
      showContent: true,
      showOwner: true,
      showType: true,
    },
  });

  console.log(`Found ${userObjects.data.length} coins for user`);
  let userTotalBalance = 0;
  for (const obj of userObjects.data) {
    if (obj.data?.content && 'fields' in obj.data.content) {
      const fields = obj.data.content.fields as any;
      const balance = parseInt(fields.balance || '0', 10);
      const balanceInTokens = balance / 10 ** 9;
      userTotalBalance += balanceInTokens;
      const owner = (obj.data.owner as any)?.AddressOwner;
      console.log(`  Coin ID: ${obj.data.objectId}`);
      console.log(`    Owner: ${owner}`);
      console.log(`    Balance: ${balanceInTokens} tokens (${balance} base units)`);
      console.log('');
    }
  }
  console.log(`Total user balance: ${userTotalBalance} tokens`);
  console.log('');

  // Check admin coins
  console.log('=== ADMIN COINS ===');
  console.log('Admin address:', ADMIN_ADDRESS);
  const adminObjects = await client.getOwnedObjects({
    owner: ADMIN_ADDRESS,
    filter: {
      StructType: coinType,
    },
    options: {
      showContent: true,
      showOwner: true,
      showType: true,
    },
  });

  console.log(`Found ${adminObjects.data.length} coins for admin`);
  let adminTotalBalance = 0;
  for (const obj of adminObjects.data) {
    if (obj.data?.content && 'fields' in obj.data.content) {
      const fields = obj.data.content.fields as any;
      const balance = parseInt(fields.balance || '0', 10);
      const balanceInTokens = balance / 10 ** 9;
      adminTotalBalance += balanceInTokens;
      const owner = (obj.data.owner as any)?.AddressOwner;
      console.log(`  Coin ID: ${obj.data.objectId}`);
      console.log(`    Owner: ${owner}`);
      console.log(`    Balance: ${balanceInTokens} tokens (${balance} base units)`);
      console.log('');
    }
  }
  console.log(`Total admin balance: ${adminTotalBalance} tokens`);
  console.log('');

  // Summary
  console.log('=== SUMMARY ===');
  if (userTotalBalance > 0 && adminTotalBalance === 0) {
    console.log('✅ CORRECT: User has tokens, admin has no tokens');
  } else if (userTotalBalance === 0 && adminTotalBalance > 0) {
    console.log('❌ WRONG: Admin has tokens, user has no tokens');
  } else if (userTotalBalance > 0 && adminTotalBalance > 0) {
    console.log('⚠️  Both user and admin have tokens');
  } else {
    console.log('❌ No tokens found for either user or admin');
  }
}

checkCoinsDetail();
