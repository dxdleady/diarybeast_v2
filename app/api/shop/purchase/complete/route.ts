/**
 * API endpoint to complete shop purchase after sponsored transaction is executed
 * This is called after the user signs and executes the sponsored burn transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getConsumableItem, getFoodItem } from '@/lib/gamification/itemsConfig';

export async function POST(req: NextRequest) {
  try {
    const { userAddress, itemId, itemType, quantity = 1, txHash, purchaseInfo } = await req.json();

    if (!userAddress || !itemId || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, itemId, txHash' },
        { status: 400 }
      );
    }

    // Verify transaction hash format (Sui uses base58, not hex)
    if (!txHash || typeof txHash !== 'string' || txHash.length < 10) {
      return NextResponse.json({ error: 'Invalid transaction hash format' }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine item price and name
    let price = purchaseInfo?.price || 0;
    let itemName = purchaseInfo?.itemName || '';

    if (!price || !itemName) {
      // Fallback: determine from item type
      if (itemType === 'food') {
        const food = getFoodItem(itemId);
        if (food) {
          price = food.price * quantity;
          itemName = food.name;
        }
      } else if (itemType === 'consumable') {
        const consumable = getConsumableItem(itemId);
        if (consumable) {
          price = consumable.price;
          itemName = consumable.name;
        }
      } else {
        const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
        if (item) {
          price = item.price;
          itemName = item.name;
        }
      }
    }

    // Handle food items
    if (itemType === 'food') {
      const inventory = (user.inventory as Record<string, number>) || {};
      const currentCount = inventory[itemId] || 0;
      const newInventory = { ...inventory, [itemId]: currentCount + quantity };

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          coinsBalance: { decrement: price },
          inventory: newInventory,
        },
      });

      // Create reward record for the burn
      await prisma.reward.create({
        data: {
          userId: user.id,
          type: 'shop_purchase',
          amount: -price,
          description: `Purchased ${quantity}x ${itemName}`,
          txHash,
        },
      });

      return NextResponse.json({
        success: true,
        updatedBalance: updatedUser.coinsBalance,
        inventory: updatedUser.inventory,
        itemPurchased: itemName,
        quantity,
        txHash,
      });
    }

    // Handle consumable items
    if (itemType === 'consumable') {
      const inventory = (user.inventory as Record<string, number>) || {};
      const currentCount = inventory[itemId] || 0;
      const newInventory = { ...inventory, [itemId]: currentCount + 1 };

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          coinsBalance: { decrement: price },
          inventory: newInventory,
        },
      });

      // Create reward record for the burn
      await prisma.reward.create({
        data: {
          userId: user.id,
          type: 'shop_purchase',
          amount: -price,
          description: `Purchased ${itemName}`,
          txHash,
        },
      });

      return NextResponse.json({
        success: true,
        updatedBalance: updatedUser.coinsBalance,
        inventory: updatedUser.inventory,
        itemPurchased: itemName,
        txHash,
      });
    }

    // Handle regular shop items (backgrounds, accessories)
    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Create purchase record
    await prisma.purchase.create({
      data: {
        userId: user.id,
        itemType: item.type,
        itemId: item.id,
        price: item.price,
        txHash,
      },
    });

    // Update user balance
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { coinsBalance: { decrement: price } },
    });

    // Create reward record for the burn
    await prisma.reward.create({
      data: {
        userId: user.id,
        type: 'shop_purchase',
        amount: -price,
        description: `Purchased ${itemName || item.name}`,
        txHash,
      },
    });

    return NextResponse.json({
      success: true,
      updatedBalance: updatedUser.coinsBalance,
      txHash,
    });
  } catch (error) {
    console.error('[shop/purchase/complete] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete purchase',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
