import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mintTokens } from '@/lib/blockchain';
import { restoreLives, calculateRewardMultiplier } from '@/lib/gamification/lifeSystem';
import { calculateStreakBonus } from '@/lib/gamification/streakRewards';
import { storeEntry } from '@/lib/entries/walrus-storage';
import { getAdminAddress } from '@/lib/sui/sponsored-transactions';

export async function POST(req: NextRequest) {
  try {
    const {
      userAddress,
      encryptedContent,
      signature,
      contentHash,
      wordCount,
      messageBytes,
      encryptionMethod, // 'crypto-js' | 'seal'
      // Seal-specific fields (optional)
      sealEncryptedObject,
      sealKey,
      sealPackageId,
      sealId,
      sealThreshold,
    } = await req.json();

    if (!userAddress || !encryptedContent || !signature || !contentHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify Sui signature
    try {
      // Basic validation: check if address is a valid Sui address format
      if (!userAddress.startsWith('0x') || userAddress.length < 40) {
        return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
      }

      // TODO: Implement proper signature verification using public key
      // For now, we'll accept the signature if address format is valid
      // In production, you must verify the signature cryptographically
      // Signature verification disabled for testnet
    } catch (sigError) {
      // Signature verification failed
      // For testnet, allow with warning; in production, this should be strict
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if entry exists today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingEntry = await prisma.entry.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json({ error: 'Entry already exists for today' }, { status: 409 });
    }

    // Prepare encrypted entry with encryption method and Seal metadata
    const encryptedEntryData = {
      content: encryptedContent,
      signature,
      contentHash,
      timestamp: Date.now(),
      walletAddress: userAddress,
      wordCount: wordCount || 0,
      method: encryptionMethod || 'crypto-js', // Default to crypto-js for backward compatibility
      // Seal-specific fields (if using Seal)
      ...(encryptionMethod === 'seal' && {
        sealEncryptedObject,
        sealKey,
        sealPackageId,
        sealId,
        sealThreshold,
      }),
    };

    console.log('[api/entries] Storing entry', {
      userId: user.id,
      encryptionMethod,
      hasSealMetadata: encryptionMethod === 'seal',
      sealId: encryptionMethod === 'seal' ? sealId : undefined,
      threshold: encryptionMethod === 'seal' ? sealThreshold : undefined,
    });

    // Store entry using Walrus storage with encryption metadata
    const {
      id: entryId,
      blobId,
      txDigest,
      blobObjectId,
    } = await storeEntry(
      prisma,
      user.id,
      encryptedContent,
      signature,
      contentHash,
      wordCount || 0,
      5, // Store for 5 epochs on Walrus
      encryptedEntryData // Pass full entry data including Seal metadata
    );

    console.log('[api/entries] Entry stored successfully', {
      entryId,
      blobId,
      txDigest,
      encryptionMethod,
    });

    // Get the created entry for response
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
    });

    if (!entry) {
      throw new Error('Failed to create entry');
    }

    // Get admin address for explorer link fallback
    let adminAddress: string | null = null;
    try {
      adminAddress = getAdminAddress();
    } catch {
      // Admin address not available, will use other fallbacks
    }

    // Calculate reward multiplier based on pet condition
    const { multiplier, reason: multiplierReason } = calculateRewardMultiplier(
      user.happiness,
      user.livesRemaining
    );

    // Determine base reward
    const entryCount = await prisma.entry.count({
      where: { userId: user.id },
    });
    const isFirstEntry = entryCount === 1;
    const baseReward = isFirstEntry ? 50 : 10;

    // Apply multiplier to reward
    const rewardAmount = Math.floor(baseReward * multiplier);

    // Mint tokens
    let txHash: string;
    try {
      txHash = await mintTokens(userAddress, rewardAmount);
    } catch (error) {
      console.error('Token mint failed:', error);
      // Still create entry even if mint fails
      txHash = 'mint_failed';
    }

    // Create reward record
    await prisma.reward.create({
      data: {
        userId: user.id,
        type: isFirstEntry ? 'first_entry' : 'daily_entry',
        amount: rewardAmount,
        description: isFirstEntry
          ? `First entry bonus! (${multiplier}x multiplier)`
          : `Daily entry reward (${multiplier}x multiplier)`,
        txHash,
      },
    });

    // Calculate lives to restore (+2, not full restore)
    const newLives = restoreLives(user.livesRemaining);
    const livesRestored = newLives - user.livesRemaining;

    // Calculate streak based on consecutive days
    // If user wrote yesterday, increment streak. Otherwise reset to 1.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const lastEntryDate = user.lastEntryDate ? new Date(user.lastEntryDate) : null;
    let yesterdayEntry = false;

    if (lastEntryDate) {
      const lastEntry = new Date(lastEntryDate);
      lastEntry.setHours(0, 0, 0, 0);
      yesterdayEntry = lastEntry.getTime() === yesterday.getTime();
    }

    const newStreak = yesterdayEntry ? user.currentStreak + 1 : 1;
    const newLongestStreak = Math.max(user.longestStreak, newStreak);

    // Check for streak milestone bonus and apply multiplier
    const { bonus: baseStreakBonus, milestone } = calculateStreakBonus(newStreak);
    const streakBonus = Math.floor(baseStreakBonus * multiplier);
    const totalReward = rewardAmount + streakBonus;

    // Mint and create streak bonus reward if milestone reached
    if (streakBonus > 0 && milestone) {
      let streakTxHash = 'mint_failed';
      try {
        streakTxHash = await mintTokens(userAddress, streakBonus);
      } catch (error) {
        console.error('Streak bonus mint failed:', error);
        // Continue even if mint fails
      }

      await prisma.reward.create({
        data: {
          userId: user.id,
          type: 'streak_bonus',
          amount: streakBonus,
          description: `${milestone.label} bonus! (${multiplier}x multiplier)`,
          txHash: streakTxHash,
        },
      });
    }

    // Update user stats
    const now = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        coinsBalance: { increment: totalReward },
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastEntryDate: now,
        lastActiveAt: now, // Update last active
        livesRemaining: newLives, // Restore +2 lives
      },
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        date: entry.date,
        blobId: entry.walrusBlobId, // Include Walrus blob ID
        txDigest: entry.walrusTxDigest, // Include transaction digest for blockchain verification
        storageType: entry.storageType, // Include storage type
        adminAddress, // Include admin address for explorer link fallback
        encryptionMethod, // Include encryption method for UI display
        // Include Seal metadata if using Seal
        ...(encryptionMethod === 'seal' && {
          sealId,
          sealThreshold,
          sealPackageId,
        }),
      },
      reward: {
        amount: rewardAmount,
        baseAmount: baseReward,
        multiplier,
        multiplierReason,
        streakBonus,
        baseStreakBonus,
        totalAmount: totalReward,
        type: isFirstEntry ? 'first_entry' : 'daily_entry',
        txHash,
        milestone: milestone ? milestone.label : null,
      },
      updatedUser: {
        coinsBalance: updatedUser.coinsBalance,
        currentStreak: updatedUser.currentStreak,
        livesRemaining: updatedUser.livesRemaining,
      },
      livesRestored, // Include lives restored for success modal
      oldLives: user.livesRemaining, // Include old lives for before/after display
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : error ? String(error) : 'Unknown error';
    console.error('Entry creation error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to create entry', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userAddress = req.nextUrl.searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'Missing userAddress' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: userAddress.toLowerCase() },
      include: {
        entries: {
          orderBy: { date: 'desc' },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get admin address for explorer link fallback
    let adminAddress: string | null = null;
    try {
      adminAddress = getAdminAddress();
    } catch {
      // Admin address not available, will use other fallbacks
    }

    // Retrieve Seal metadata from Walrus for entries stored in Walrus
    // This is needed for client-side Seal decryption
    const { retrieveEntry } = await import('@/lib/entries/walrus-storage');

    const entriesWithMetadata = await Promise.all(
      user.entries.map(async (entry) => {
        // If entry is stored in Walrus, retrieve Seal metadata
        if (entry.storageType === 'walrus' && entry.walrusBlobId) {
          try {
            const walrusEntry = await retrieveEntry(prisma, entry.id);
            if (walrusEntry) {
              return {
                ...entry,
                adminAddress,
                // Include encryption method and Seal metadata
                method: walrusEntry.method || 'crypto-js',
                sealEncryptedObject: walrusEntry.sealEncryptedObject,
                sealKey: walrusEntry.sealKey,
                sealPackageId: walrusEntry.sealPackageId,
                sealId: walrusEntry.sealId,
                sealThreshold: walrusEntry.sealThreshold,
                // Include encryptedContent for backward compatibility and client-side decryption
                encryptedContent: walrusEntry.content,
              };
            }
          } catch (error) {
            console.error(`Failed to retrieve Walrus entry ${entry.id}:`, error);
            // Continue with basic entry data if Walrus retrieval fails
          }
        }

        // For PostgreSQL entries or if Walrus retrieval failed, return basic entry
        return {
          ...entry,
          adminAddress,
          method: 'crypto-js', // Default to crypto-js for PostgreSQL entries
          encryptedContent: entry.encryptedContent || '', // Include encryptedContent if available
        };
      })
    );

    return NextResponse.json({
      entries: entriesWithMetadata,
      total: entriesWithMetadata.length,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : error ? String(error) : 'Unknown error';
    console.error('Get entries error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to fetch entries', details: errorMessage },
      { status: 500 }
    );
  }
}
