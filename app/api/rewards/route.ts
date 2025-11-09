import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address is required' }, { status: 400 });
    }

    // Find user by wallet address
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ rewards: [] });
    }

    // Get rewards for the user, ordered by most recent first
    const rewards = await prisma.reward.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20, // Limit to last 20 rewards
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        txHash: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ rewards });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[rewards] Error fetching rewards:', errorMessage, error);
    return NextResponse.json(
      {
        error: 'Failed to fetch rewards',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
