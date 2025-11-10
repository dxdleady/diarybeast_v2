# Walrus Integration

DiaryBeast uses **Walrus** for decentralized storage of encrypted diary entries. This provides cost-effective, verifiable, and decentralized storage.

## Overview

Walrus is a decentralized storage network built on Sui. DiaryBeast stores encrypted diary entries as blobs on Walrus, with metadata stored in PostgreSQL for fast queries.

## Architecture

### Storage Flow

```
User writes entry
    ↓
Encrypt entry (crypto-js or Seal)
    ↓
Upload to Walrus via SDK
    ↓
Store blob ID + tx digest in PostgreSQL
    ↓
Entry retrievable via blob ID
```

### Hybrid Model

- **Walrus**: Encrypted content (blobs)
- **PostgreSQL**: Metadata (users, entries, rewards, blob IDs)

This hybrid approach provides:
- ✅ Decentralized content storage
- ✅ Fast queries (PostgreSQL metadata)
- ✅ Verifiable on-chain (transaction digests)

## Implementation

### Key Files

- `lib/entries/walrus-storage.ts` - Main storage functions
- `lib/walrus/client-sdk.ts` - Walrus SDK client
- `lib/walrus/config.ts` - Configuration
- `app/api/entries/route.ts` - Entry creation endpoint

### Storage Functions

#### `storeEntryToWalrus()`

Uploads encrypted entry to Walrus:

```typescript
const { blobId, txDigest, blobObjectId } = await storeEntryToWalrus(
  encryptedEntry,
  epochs, // Storage duration (default: 5)
  sendObjectTo // Optional: Address to receive blob object
);
```

#### `retrieveEntryFromWalrus()`

Retrieves encrypted entry from Walrus:

```typescript
const entry = await retrieveEntryFromWalrus(blobId);
```

#### `storeEntry()`

Hybrid storage (Walrus + PostgreSQL):

```typescript
const { id, blobId, txDigest } = await storeEntry(
  prisma,
  userId,
  encryptedContent,
  signature,
  contentHash,
  wordCount,
  epochs
);
```

## Configuration

### Environment Variables

```bash
# Walrus Aggregator URL (testnet)
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# Walrus Publisher URL (testnet)
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space

# Storage epochs (duration)
NEXT_PUBLIC_WALRUS_STORAGE_EPOCHS=5

# Mainnet URLs (optional)
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL_MAINNET=https://aggregator.walrus.space
NEXT_PUBLIC_WALRUS_PUBLISHER_URL_MAINNET=https://publisher.walrus.space
```

### SDK Configuration

The Walrus SDK uses:
- **Upload Relay**: Requires tip in MIST (SUI), not WAL tokens
- **Signer**: Admin keypair (from `SUI_ADMIN_PRIVATE_KEY`)
- **Network**: Testnet or Mainnet (configurable)

## Usage

### Uploading Entries

```typescript
import { storeEntry } from '@/lib/entries/walrus-storage';

// Store entry (encrypts and uploads to Walrus)
const { id, blobId, txDigest } = await storeEntry(
  prisma,
  userAddress,
  encryptedContent,
  signature,
  contentHash,
  wordCount,
  5 // epochs
);
```

### Retrieving Entries

```typescript
import { retrieveEntry } from '@/lib/entries/walrus-storage';

// Retrieve entry (downloads from Walrus)
const entry = await retrieveEntry(prisma, entryId);
```

### Verifying Blobs

```typescript
import { verifyBlobExists } from '@/lib/entries/walrus-storage';

// Verify blob exists on Walrus
const exists = await verifyBlobExists(blobId);
```

## Sponsored Transactions

DiaryBeast uses **sponsored transactions** for Walrus uploads:

- Admin signs and pays for storage
- Users don't need WAL tokens or SUI for gas
- Seamless user experience

### Implementation

The admin keypair (from `SUI_ADMIN_PRIVATE_KEY`) is used to:
1. Sign Walrus upload transactions
2. Pay for storage with WAL tokens
3. Pay for gas with SUI

## Cost Analysis

- **Storage Cost**: ~$0.10/GB
- **Gas Cost**: Minimal (sponsored by admin)
- **Total Cost**: Very affordable for diary entries

## Benefits

1. **Decentralized**: No single point of failure
2. **Verifiable**: Transaction digests stored on-chain
3. **Cost-Effective**: ~$0.10/GB storage
4. **Scalable**: Handles large volumes of entries
5. **Content-Addressed**: Entries are content-addressed

## Troubleshooting

### "Failed to upload to Walrus"

- Check `SUI_ADMIN_PRIVATE_KEY` is set
- Verify admin has WAL tokens for storage
- Verify admin has SUI for gas
- Check network configuration (testnet/mainnet)

### "Blob not found"

- Verify blob ID is correct
- Check blob exists on Walrus explorer
- Verify network matches (testnet/mainnet)

## Resources

- [Walrus Documentation](https://walrus.wal.app/)
- [Walrus SDK](https://github.com/MystenLabs/walrus)
- [Walrus Explorer](https://explorer.walrus.space/)

