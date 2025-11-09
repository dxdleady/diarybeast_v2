/**
 * API endpoint for executing a sponsored burn transaction
 *
 * Flow:
 * 1. Client sends: transactionBytes, userSignature, sponsorSignature
 * 2. Server executes transaction with both signatures
 * 3. Server returns: transaction digest
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeSponsoredTransaction } from '@/lib/sui/sponsored-transactions';

export async function POST(req: NextRequest) {
  try {
    const { transactionBytes, userSignature, sponsorSignature } = await req.json();

    if (!transactionBytes || !userSignature || !sponsorSignature) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionBytes, userSignature, sponsorSignature' },
        { status: 400 }
      );
    }

    // Execute sponsored transaction
    const digest = await executeSponsoredTransaction(
      transactionBytes,
      userSignature,
      sponsorSignature
    );

    return NextResponse.json({
      success: true,
      digest,
      message: 'Transaction executed successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[sponsored/burn/execute] Error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to execute transaction', details: errorMessage },
      { status: 500 }
    );
  }
}
