import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { retrieveEntry } from '@/lib/entries/walrus-storage';
import { getAdminAddress } from '@/lib/sui/sponsored-transactions';

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: entryId } = await context.params;

    if (!entryId) {
      return NextResponse.json({ error: 'Missing entry ID' }, { status: 400 });
    }

    // Get entry metadata from PostgreSQL
    const entryMetadata = await prisma.entry.findUnique({
      where: { id: entryId },
      include: {
        user: {
          select: {
            walletAddress: true,
          },
        },
      },
    });

    if (!entryMetadata) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    // Retrieve encrypted content from Walrus/PostgreSQL
    const encryptedEntry = await retrieveEntry(prisma, entryId);

    if (!encryptedEntry) {
      return NextResponse.json({ error: 'Entry content not found' }, { status: 404 });
    }

    // Get admin address for explorer link fallback
    let adminAddress: string | null = null;
    try {
      adminAddress = getAdminAddress();
    } catch {
      // Admin address not available, will use other fallbacks
    }

    // Return entry in the format expected by components
    // Components expect: { id, date, wordCount, encryptedContent }
    return NextResponse.json({
      success: true,
      entry: {
        id: entryMetadata.id,
        date: entryMetadata.date.toISOString(),
        wordCount: entryMetadata.wordCount,
        encryptedContent: encryptedEntry.content, // Content from Walrus or PostgreSQL
        signature: encryptedEntry.signature,
        contentHash: encryptedEntry.contentHash,
        storageType: entryMetadata.storageType,
        walrusBlobId: entryMetadata.walrusBlobId,
        walrusTxDigest: entryMetadata.walrusTxDigest, // Transaction digest for blockchain verification
        adminAddress, // Admin address for explorer link fallback
      },
    });
  } catch (error: any) {
    console.error('Entry retrieval error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve entry' },
      { status: 500 }
    );
  }
}
