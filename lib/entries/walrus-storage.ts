import { PrismaClient } from '@prisma/client';
// Use SDK with upload relay - upload relay requires tip in MIST (SUI), not WAL tokens!
// We have SUI for gas, so this is perfect!
// Lazy import to avoid initialization errors at module load time
let uploadToWalrusSDK: any;
let downloadFromWalrusSDK: any;
let blobExistsSDK: any;

// Lazy load Walrus SDK to avoid initialization errors
async function getWalrusSDK() {
  if (!uploadToWalrusSDK) {
    try {
      const walrusSDK = await import('@/lib/walrus/client-sdk');
      uploadToWalrusSDK = walrusSDK.uploadToWalrusSDK;
      downloadFromWalrusSDK = walrusSDK.downloadFromWalrusSDK;
      blobExistsSDK = walrusSDK.blobExistsSDK;
    } catch (error: any) {
      console.error('[walrus-storage] Failed to load Walrus SDK:', error);
      throw new Error(`Failed to load Walrus SDK: ${error.message}`);
    }
  }
  return { uploadToWalrusSDK, downloadFromWalrusSDK, blobExistsSDK };
}

import { getAdminAddress } from '@/lib/sui/sponsored-transactions';

export interface EncryptedEntry {
  content: string;
  signature: string;
  contentHash: string;
  timestamp: number;
  walletAddress: string;
  wordCount?: number;
}

/**
 * Store encrypted entry to Walrus
 * @param encryptedEntry - Encrypted entry data
 * @param epochs - Storage duration in epochs (default: 5)
 * @param sendObjectTo - Optional: Address to send blob object to (for sponsored transactions)
 * @returns Walrus blob ID
 */
export async function storeEntryToWalrus(
  encryptedEntry: EncryptedEntry,
  epochs: number = 5,
  sendObjectTo?: string // Admin address for sponsored transactions
): Promise<{ blobId: string; txDigest?: string; blobObjectId?: string }> {
  // Serialize entry data
  const entryJson = JSON.stringify(encryptedEntry);
  const entryData = new TextEncoder().encode(entryJson);

  // Lazy load Walrus SDK
  const { uploadToWalrusSDK: uploadSDK } = await getWalrusSDK();

  // Upload to Walrus using SDK with upload relay
  // Upload relay requires tip in MIST (SUI), not WAL tokens - we have SUI for gas!
  // If sendObjectTo is provided, blob object will be sent to that address
  // Otherwise, blob object will be owned by the signer (admin address)
  const result = await uploadSDK(
    entryData,
    'application/json',
    epochs,
    'testnet', // TODO: Make this configurable based on environment
    sendObjectTo // Optional: Address to send blob object to
  );

  return {
    blobId: result.blobId,
    txDigest: result.txDigest,
    blobObjectId: result.blobObjectId,
  };
}

/**
 * Retrieve encrypted entry from Walrus
 * @param blobId - Walrus blob ID
 * @returns Encrypted entry data
 */
export async function retrieveEntryFromWalrus(blobId: string): Promise<EncryptedEntry> {
  // Lazy load Walrus SDK
  const { downloadFromWalrusSDK: downloadSDK } = await getWalrusSDK();

  // Download from Walrus using SDK
  const { data } = await downloadSDK(blobId, 'testnet');

  // Parse JSON
  const entryJson = new TextDecoder().decode(data);
  const entry: EncryptedEntry = JSON.parse(entryJson);

  return entry;
}

/**
 * Store entry (hybrid: Walrus + PostgreSQL metadata)
 * @param prisma - Prisma client instance
 * @param userId - User ID (wallet address)
 * @param encryptedContent - Encrypted diary content
 * @param signature - Entry signature
 * @param contentHash - Content hash
 * @param wordCount - Word count
 * @param epochs - Storage duration in epochs
 * @returns Entry ID, blob ID, transaction digest, and blob object ID
 */
export async function storeEntry(
  prisma: PrismaClient,
  userId: string,
  encryptedContent: string,
  signature: string,
  contentHash: string,
  wordCount: number,
  epochs: number = 5
): Promise<{ id: string; blobId: string; txDigest?: string; blobObjectId?: string }> {
  // Prepare encrypted entry
  const encryptedEntry: EncryptedEntry = {
    content: encryptedContent,
    signature,
    contentHash,
    timestamp: Date.now(),
    walletAddress: userId,
    wordCount,
  };

  // IMPORTANT: Use admin address (from SUI_ADMIN_PRIVATE_KEY) as the owner of blob object
  // The signer (admin) will pay for storage with WAL tokens and SUI for gas
  // Do NOT use WALRUS_PAYER_ADDRESS - it causes conflicts when signer address is different
  // The signer address must match the address that owns WAL tokens and SUI for gas
  let ownerAddress: string | undefined;

  try {
    // Always use admin address from SUI_ADMIN_PRIVATE_KEY
    // This ensures signer and owner address match, avoiding "wrong sender" errors
    ownerAddress = getAdminAddress();
  } catch (error) {
    // Continue without owner address - blob will be owned by signer
    // This should not happen in production if SUI_ADMIN_PRIVATE_KEY is set
  }

  // Upload to Walrus using SDK with upload relay
  // Upload relay requires tip in MIST (SUI), not WAL tokens - we have SUI for gas!
  // ownerAddress will receive the blob object (must match signer address to avoid errors)
  const { blobId, txDigest, blobObjectId } = await storeEntryToWalrus(
    encryptedEntry,
    epochs,
    ownerAddress
  );

  // Store metadata in PostgreSQL
  const entry = await prisma.entry.create({
    data: {
      userId,
      walrusBlobId: blobId,
      walrusTxDigest: txDigest || null, // Store transaction digest if available
      storageType: 'walrus',
      signature,
      contentHash,
      wordCount,
      date: new Date(),
    },
  });

  return {
    id: entry.id,
    blobId,
    txDigest: txDigest || undefined,
    blobObjectId: blobObjectId || undefined,
  };
}

/**
 * Retrieve entry (hybrid: Walrus + PostgreSQL)
 * @param prisma - Prisma client instance
 * @param entryId - Entry ID
 * @returns Encrypted entry data or null
 */
export async function retrieveEntry(
  prisma: PrismaClient,
  entryId: string
): Promise<EncryptedEntry | null> {
  // Get metadata from PostgreSQL
  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
  });

  if (!entry) {
    return null;
  }

  // Check storage type
  if (entry.storageType === 'walrus' && entry.walrusBlobId) {
    // Retrieve from Walrus
    try {
      return await retrieveEntryFromWalrus(entry.walrusBlobId);
    } catch (error) {
      console.error('Failed to retrieve from Walrus:', error);
      // Fallback to PostgreSQL if Walrus fails
      if (entry.encryptedContent) {
        return {
          content: entry.encryptedContent,
          signature: entry.signature,
          contentHash: entry.contentHash,
          timestamp: entry.createdAt.getTime(),
          walletAddress: entry.userId,
          wordCount: entry.wordCount,
        };
      }
      throw error;
    }
  } else if (entry.storageType === 'postgres' && entry.encryptedContent) {
    // Legacy: retrieve from PostgreSQL
    return {
      content: entry.encryptedContent,
      signature: entry.signature,
      contentHash: entry.contentHash,
      timestamp: entry.createdAt.getTime(),
      walletAddress: entry.userId,
      wordCount: entry.wordCount,
    };
  }

  return null;
}

/**
 * Get all user entries (metadata only)
 * @param prisma - Prisma client instance
 * @param userId - User ID (wallet address)
 * @returns List of entry metadata
 */
export async function getUserEntries(
  prisma: PrismaClient,
  userId: string
): Promise<Array<{ id: string; date: Date; blobId: string | null; storageType: string }>> {
  const entries = await prisma.entry.findMany({
    where: { userId },
    select: {
      id: true,
      date: true,
      walrusBlobId: true,
      storageType: true,
    },
    orderBy: { date: 'desc' },
  });

  return entries.map((e) => ({
    id: e.id,
    date: e.date,
    blobId: e.walrusBlobId,
    storageType: e.storageType,
  }));
}

/**
 * Verify blob exists on Walrus
 * @param blobId - Blob ID to verify
 * @returns true if blob exists
 */
export async function verifyBlobExists(blobId: string): Promise<boolean> {
  // Lazy load Walrus SDK
  const { blobExistsSDK: existsSDK } = await getWalrusSDK();
  return await existsSDK(blobId, 'testnet');
}
