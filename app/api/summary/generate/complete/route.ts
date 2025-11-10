/**
 * API endpoint to complete summary generation after sponsored transaction is executed
 * This is called after the user signs and executes the sponsored burn transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SUMMARY_COST = 50;

export async function POST(req: NextRequest) {
  try {
    const { userAddress, weekStart, weekEnd, analysis, txHash } = await req.json();

    if (!userAddress || !weekStart || !weekEnd || !analysis || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, weekStart, weekEnd, analysis, txHash' },
        { status: 400 }
      );
    }

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

    // Check if summary already exists
    const existingSummary = await prisma.weeklySummary.findUnique({
      where: {
        userId_weekStart: {
          userId: user.id,
          weekStart: new Date(weekStart),
        },
      },
    });

    if (existingSummary) {
      return NextResponse.json({ error: 'Summary already exists for this week' }, { status: 400 });
    }

    // Check balance
    if (user.coinsBalance < SUMMARY_COST) {
      return NextResponse.json(
        { error: 'Insufficient balance', required: SUMMARY_COST, current: user.coinsBalance },
        { status: 400 }
      );
    }

    // Create summary and deduct cost in a transaction
    const [summary, updatedUser] = await prisma.$transaction([
      prisma.weeklySummary.create({
        data: {
          userId: user.id,
          weekStart: new Date(weekStart),
          weekEnd: new Date(weekEnd),
          emotions: analysis.emotions as any,
          summary: analysis.summary,
          insights: analysis.insights,
          trend: analysis.trend,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { coinsBalance: user.coinsBalance - SUMMARY_COST },
      }),
    ]);

    // Create reward record for the burn
    await prisma.reward.create({
      data: {
        userId: user.id,
        type: 'summary_generation',
        amount: -SUMMARY_COST,
        description: `Weekly summary generation`,
        txHash,
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        id: summary.id,
        emotions: summary.emotions,
        summary: summary.summary,
        insights: summary.insights,
        trend: summary.trend,
      },
      newBalance: updatedUser.coinsBalance,
      txHash,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to complete summary generation',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
