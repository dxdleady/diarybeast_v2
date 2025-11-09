import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { getUserTokenBalance } from '../lib/sui/token';
import { getTokenConfig } from '../lib/sui/sponsored-transactions';

const USER_ADDRESS = '0x6014f6d591069f41a3d16934c57670f6a8bb4671d155b0f1ea87b8f693afd693';
const ADMIN_ADDRESS = '0x19de592bfb0c6b325e741170c20cc59be6fc77b5c32230ca8c6d5bd30b82dc23';

async function checkBalances() {
  console.log('Checking balances...');
  console.log('');

  const { packageId } = getTokenConfig();
  console.log('Package ID:', packageId);
  console.log('');

  // Check user balance
  console.log('User address:', USER_ADDRESS);
  const userBalance = await getUserTokenBalance(USER_ADDRESS, packageId);
  console.log('User balance:', userBalance, 'tokens');
  console.log('');

  // Check admin balance
  console.log('Admin address:', ADMIN_ADDRESS);
  const adminBalance = await getUserTokenBalance(ADMIN_ADDRESS, packageId);
  console.log('Admin balance:', adminBalance, 'tokens');
  console.log('');

  if (userBalance > 0) {
    console.log('✅ User has tokens!');
  } else {
    console.log('❌ User has no tokens');
  }

  if (adminBalance > 0) {
    console.log('⚠️  Admin has tokens (this might be wrong if they were supposed to go to user)');
  } else {
    console.log('✅ Admin has no tokens');
  }
}

checkBalances();
