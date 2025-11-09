/**
 * API endpoint for creating a sponsored burn transaction
 *
 * Flow:
 * 1. Client sends: userAddress, amount, userCoinId
 * 2. Server creates transaction (without gas)
 * 3. Server sponsors transaction (adds gas, signs as sponsor)
 * 4. Server returns: transactionBytes, sponsorSignature
 * 5. Client signs transaction with user's wallet
 * 6. Client sends both signatures to /api/sponsored/burn/execute
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createUserBurnTransaction,
  sponsorTransaction,
  getTokenConfig,
} from '@/lib/sui/sponsored-transactions';
import { getUserCoins, getUserTokenBalance } from '@/lib/sui/token';
import { TransactionBlock } from '@mysten/sui.js/transactions';

export async function POST(req: NextRequest) {
  try {
    const { userAddress, amount } = await req.json();

    if (!userAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, amount' },
        { status: 400 }
      );
    }

    const { packageId, treasuryCapId, adminCapId } = getTokenConfig();

    // Get user's coins
    const userCoins = await getUserCoins(userAddress, packageId);

    if (userCoins.length === 0) {
      return NextResponse.json(
        { error: 'No tokens on blockchain', details: 'User has no tokens to burn' },
        { status: 400 }
      );
    }

    // Check balance
    const balance = await getUserTokenBalance(userAddress, packageId);
    if (balance < amount) {
      return NextResponse.json(
        {
          error: 'Insufficient balance',
          details: `User has ${balance} tokens, but needs ${amount}`,
        },
        { status: 400 }
      );
    }

    // Use first coin
    const userCoinId = userCoins[0];

    // Create user's transaction (without gas)
    const userTx = createUserBurnTransaction(
      packageId,
      treasuryCapId,
      userCoinId,
      amount,
      userAddress
    );

    // Build transaction to get kind bytes (without gas)
    const { getSuiClient } = require('@/lib/sui/sponsored-transactions');
    const client = getSuiClient();
    const kindBytes = await userTx.build({ client, onlyTransactionKind: true });

    // Sponsor the transaction (add gas, sign as sponsor)
    const { transactionBytes, sponsorSignature } = await sponsorTransaction(kindBytes, userAddress);

    return NextResponse.json({
      success: true,
      transactionBytes: Buffer.from(transactionBytes).toString('base64'),
      sponsorSignature,
      userCoinId,
      amount,
      message: 'Transaction sponsored. Sign with user wallet and execute.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[sponsored/burn/create] Error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to create sponsored transaction', details: errorMessage },
      { status: 500 }
    );
  }
}
