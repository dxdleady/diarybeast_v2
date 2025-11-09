/**
 * API endpoint for creating a sponsored burn transaction for shop purchase
 *
 * Flow:
 * 1. User initiates purchase
 * 2. Server creates sponsored burn transaction
 * 3. Server returns transaction for user to sign
 * 4. User signs and executes transaction
 * 5. Server completes purchase in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createUserBurnTransaction,
  sponsorTransaction,
  getTokenConfig,
  getSuiClient,
} from '@/lib/sui/sponsored-transactions';
import { getUserCoins, getUserTokenBalance } from '@/lib/sui/token';
import { getConsumableItem, getFoodItem } from '@/lib/gamification/itemsConfig';

export async function POST(req: NextRequest) {
  try {
    const { userAddress, itemId, itemType, quantity = 1 } = await req.json();

    if (!userAddress || !itemId) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, itemId' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine item price
    let price = 0;
    let itemName = '';

    if (itemType === 'food') {
      const food = getFoodItem(itemId);
      if (!food) {
        return NextResponse.json({ error: 'Food item not found' }, { status: 404 });
      }
      price = food.price * quantity;
      itemName = food.name;

      // Check max stack
      const inventory = (user.inventory as Record<string, number>) || {};
      const currentCount = inventory[itemId] || 0;
      if (currentCount + quantity > food.maxStack) {
        return NextResponse.json(
          { error: `Cannot exceed max stack of ${food.maxStack}` },
          { status: 400 }
        );
      }
    } else if (itemType === 'consumable') {
      const consumable = getConsumableItem(itemId);
      if (!consumable) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      price = consumable.price;
      itemName = consumable.name;
    } else {
      // Regular shop items
      const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      }
      price = item.price;
      itemName = item.name;

      // Check if already owned
      const existing = await prisma.purchase.findFirst({
        where: { userId: user.id, itemId },
      });
      if (existing) {
        return NextResponse.json({ error: 'Already owned' }, { status: 409 });
      }
    }

    // Check balance
    if (user.coinsBalance < price) {
      return NextResponse.json(
        { error: 'Insufficient balance', required: price, current: user.coinsBalance },
        { status: 400 }
      );
    }

    // Check on-chain balance
    const { packageId, treasuryCapId } = getTokenConfig();
    const client = getSuiClient();

    // Get user's coins
    const userCoins = await getUserCoins(userAddress, packageId);
    if (userCoins.length === 0) {
      return NextResponse.json(
        { error: 'No tokens on blockchain', details: 'User has no tokens to burn' },
        { status: 400 }
      );
    }

    // Check on-chain balance
    const onChainBalance = await getUserTokenBalance(userAddress, packageId);
    if (onChainBalance < price) {
      return NextResponse.json(
        { error: 'Insufficient balance on blockchain', required: price, current: onChainBalance },
        { status: 400 }
      );
    }

    // Verify coin ownership and find coin with sufficient balance
    let userCoinId: string | null = null;
    for (const coinId of userCoins) {
      try {
        const coinObject = await client.getObject({
          id: coinId,
          options: { showOwner: true, showContent: true },
        });

        if (coinObject.data?.owner) {
          const owner = (coinObject.data.owner as any).AddressOwner;
          if (owner?.toLowerCase() === userAddress.toLowerCase()) {
            // Verify coin has enough balance
            if (coinObject.data?.content && 'fields' in coinObject.data.content) {
              const fields = coinObject.data.content.fields as any;
              const balance = parseInt(fields.balance || '0', 10);
              const balanceInTokens = balance / 10 ** 9;
              if (balanceInTokens >= price) {
                userCoinId = coinId;
                break;
              }
            }
          }
        }
      } catch (coinError) {
        console.error(`[shop/purchase/create] Error verifying coin ${coinId}:`, coinError);
      }
    }

    if (!userCoinId) {
      return NextResponse.json(
        {
          error: 'No valid coins found',
          details: `No coin with sufficient balance (${price}) found`,
        },
        { status: 400 }
      );
    }

    // Create user's transaction (without gas) - user-initiated approach
    const userTx = createUserBurnTransaction(
      packageId,
      treasuryCapId,
      userCoinId,
      price,
      userAddress
    );

    // Build transaction to get kind bytes (without gas)
    const kindBytes = await userTx.build({ client, onlyTransactionKind: true });

    // Sponsor the transaction (add gas, sign as sponsor)
    let transactionBytes: string;
    let sponsorSignature: string;

    try {
      const sponsored = await sponsorTransaction(kindBytes, userAddress);
      transactionBytes = sponsored.transactionBytes;
      sponsorSignature = sponsored.sponsorSignature;
    } catch (sponsorError) {
      console.error('[shop/purchase/create] Failed to sponsor transaction:', sponsorError);
      return NextResponse.json(
        {
          error: 'Failed to sponsor transaction',
          details: sponsorError instanceof Error ? sponsorError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresSignature: true,
      sponsoredTransaction: {
        transactionBytes,
        sponsorSignature,
      },
      purchaseInfo: {
        itemId,
        itemType,
        itemName,
        quantity,
        price,
      },
      message: 'Transaction sponsored. Sign with user wallet to complete purchase.',
    });
  } catch (error) {
    console.error('[shop/purchase/create] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create purchase transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
