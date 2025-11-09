/**
 * Test script to verify minting works after transferring AdminCap and TreasuryCap
 *
 * Usage:
 *   tsx scripts/test-minting.ts <recipient-address> <amount>
 *
 * Example:
 *   tsx scripts/test-minting.ts 0x19de592bfb0c6b325e741170c20cc59be6fc77b5c32230ca8c6d5bd30b82dc23 10
 */

import { mintTokens } from '@/lib/blockchain';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function testMinting() {
  const recipientAddress = process.argv[2];
  const amount = parseFloat(process.argv[3]) || 10;

  if (!recipientAddress) {
    console.error('Usage: tsx scripts/test-minting.ts <recipient-address> <amount>');
    process.exit(1);
  }

  console.log('🧪 Testing minting...');
  console.log('📍 Recipient:', recipientAddress);
  console.log('💰 Amount:', amount, 'DIARY tokens');
  console.log('');

  try {
    const txHash = await mintTokens(recipientAddress, amount);

    if (txHash === 'mint_skipped_no_admin_key') {
      console.error('❌ Minting failed: SUI_ADMIN_PRIVATE_KEY not set');
      process.exit(1);
    } else if (txHash === 'mint_failed') {
      console.error('❌ Minting failed: Transaction failed');
      process.exit(1);
    } else if (txHash.startsWith('0x')) {
      console.log('✅ Minting successful!');
      console.log('📝 Transaction hash:', txHash);
      console.log('');
      console.log('🔗 View on Sui Explorer:');
      const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
      console.log(`   https://suiexplorer.com/txblock/${txHash}?network=${network}`);
    } else {
      console.error('❌ Unexpected result:', txHash);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMinting();
