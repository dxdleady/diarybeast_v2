/**
 * API endpoint for creating sponsored burn transactions
 *
 * Flow:
 * 1. Client requests sponsored transaction (sends user's transaction kind bytes)
 * 2. Server sponsors the transaction (adds gas, signs as sponsor)
 * 3. Server returns sponsored transaction and sponsor signature
 * 4. Client signs with user's wallet
 * 5. Client sends both signatures to execute endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { sponsorTransaction, getSuiClient, getTokenConfig } from '@/lib/sui/sponsored-transactions';
import { getUserCoins } from '@/lib/sui/token';
import { SuiClient } from '@mysten/sui.js/client';

export async function POST(req: NextRequest) {
  try {
    const { userAddress, amount, transactionKindBytes } = await req.json();

    if (!userAddress || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { packageId, treasuryCapId, adminCapId } = getTokenConfig();
    const client = getSuiClient();

    // Get user's coins
    const userCoins = await getUserCoins(userAddress, packageId);

    if (userCoins.length === 0) {
      return NextResponse.json(
        { error: 'No tokens on blockchain', details: 'User has no tokens to burn' },
        { status: 400 }
      );
    }

    const userCoinId = userCoins[0];

    // If transactionKindBytes provided, sponsor existing transaction
    if (transactionKindBytes) {
      const kindBytes = Uint8Array.from(Buffer.from(transactionKindBytes, 'base64'));
      const { transactionBytes, sponsorSignature } = await sponsorTransaction(
        kindBytes,
        userAddress
      );

      return NextResponse.json({
        success: true,
        sponsoredTransaction: {
          transactionBytes: Buffer.from(transactionBytes).toString('base64'),
          sponsorSignature,
        },
        message: 'Transaction sponsored. User must sign and execute.',
      });
    }

    // Otherwise, return transaction data for client to build
    return NextResponse.json({
      success: true,
      transactionData: {
        packageId,
        treasuryCapId,
        adminCapId,
        userCoinId,
        amount,
        userAddress,
      },
      message: 'Transaction data ready. Build transaction on client and request sponsorship.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Sponsor transaction error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to sponsor transaction', details: errorMessage },
      { status: 500 }
    );
  }
}
