import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mintTokens } from '@/lib/blockchain';

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('Failed to parse request body:', jsonError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { address, message, signature, messageBytes } = body;

    if (!address || !message || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Sui signature
    // TODO: Implement proper cryptographic signature verification
    // For testnet, we'll validate address format only
    // In production, you must verify the signature using Sui's verification methods
    try {
      // Basic validation: check if address is a valid Sui address format
      if (!address.startsWith('0x') || address.length < 40) {
        return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
      }

      // TODO: Implement proper signature verification
      // For now, accepting valid address format (testnet mode)
      // Signature verification disabled for testnet
    } catch (sigError) {
      // Signature verification failed
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    });

    const isNewUser = !user;

    if (!user) {
      // Randomly assign an animal for new users
      const animals = ['cat', 'dog'];
      const randomAnimal = animals[Math.floor(Math.random() * animals.length)];

      const initialBonus = 50;

      let welcomeTxHash = 'mint_failed';
      try {
        welcomeTxHash = await mintTokens(address, initialBonus);
      } catch (error) {
        // Continue with user creation even if mint fails
      }

      user = await prisma.user.create({
        data: {
          walletAddress: address.toLowerCase(),
          selectedAnimal: randomAnimal,
          coinsBalance: initialBonus, // Initial bonus for first weekly summary
        },
      });

      // Create reward record for welcome bonus
      await prisma.reward.create({
        data: {
          userId: user.id,
          type: 'welcome_bonus',
          amount: initialBonus,
          description: 'Welcome to DiaryBeast!',
          txHash: welcomeTxHash,
        },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        selectedAnimal: user.selectedAnimal,
        onboardingCompleted: user.onboardingCompleted,
        coinsBalance: user.coinsBalance,
        livesRemaining: user.livesRemaining,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
      isNewUser,
    });
  } catch (error) {
    // Safely extract error message without causing serialization issues
    let errorMessage = 'Authentication failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else if (error) {
      errorMessage = String(error);
    }

    console.error('Auth error:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('Stack:', error.stack);
    }

    return NextResponse.json(
      {
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
