# Walrus Storage Integration

## Overview

DiaryBeast uses **Walrus decentralized storage** to store encrypted diary entries. This provides decentralized, censorship-resistant storage while maintaining fast metadata queries through PostgreSQL.

## Architecture

### Hybrid Storage Model

- **Walrus**: Stores encrypted diary content (decentralized)
- **PostgreSQL**: Stores metadata (blobId, date, hash, etc.) for fast queries

### Storage Flow

```
User → Encrypt Entry → Server → Upload to Walrus → Store Metadata in PostgreSQL
```

### Retrieval Flow

```
User → Request Entry → Server → Query PostgreSQL → Download from Walrus → Return to User
```

## Payment Model

### Who Pays?

- **Admin (Server)** pays for storage via Upload Relay
- **Payment Method**: Tip in MIST (SUI) - ~105 MIST per upload
- **User Cost**: FREE (user pays nothing for storage)

### Payment Details

- Uses `SUI_ADMIN_PRIVATE_KEY` to sign transactions
- Upload relay simplifies payment (no WAL tokens needed)
- Payment happens automatically on upload
- Very low cost (~105 MIST = ~0.0001 SUI)

## Security Model

### Encryption

- **Client-side encryption**: Entries encrypted before upload
- **Encryption key**: Derived from wallet address + salt (deterministic)
- **Algorithm**: AES (CryptoJS)
- **Key derivation**: `SHA256(walletAddress + "DiaryBeast_v1_encryption")`

### Access Control

- **User**: Can decrypt entries (has encryption key from wallet)
- **Server**: Can decrypt entries (can compute key from user address)
- **Admin**: Can decrypt entries (can compute key from user address)
- **Walrus**: Stores encrypted data only (cannot decrypt)

### Important Note

This is **client-side encryption with server-side decryption capability**. The server can decrypt entries for AI analysis, but data is encrypted in transit and at rest.

## Implementation

### Core Files

- `lib/walrus/client-sdk.ts` - Walrus SDK client
- `lib/walrus/config.ts` - Walrus configuration
- `lib/entries/walrus-storage.ts` - Storage service
- `app/api/entries/route.ts` - Entry creation API
- `app/api/entries/[id]/route.ts` - Entry retrieval API

### Database Schema

```prisma
model Entry {
  id                String   @id @default(cuid())
  userId            String
  encryptedContent  String?  @db.Text  // Optional - legacy support
  walrusBlobId      String?  // Walrus blob ID
  storageType       String   @default("walrus")  // "postgres" | "walrus"
  signature         String
  contentHash       String
  wordCount         Int      @default(0)
  date              DateTime @default(now())
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([userId, date])
  @@index([userId])
  @@index([walrusBlobId])
}
```

## Configuration

### Environment Variables

```env
# Walrus Configuration
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space

# Sui Configuration
SUI_ADMIN_PRIVATE_KEY=suiprivkey1...
NEXT_PUBLIC_SUI_NETWORK=testnet
```

### Next.js Configuration

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  // Tell Next.js to skip bundling for Walrus packages (required for WASM)
  serverExternalPackages: ['@mysten/walrus', '@mysten/walrus-wasm'],
  // ...
};
```

## Usage

### Storing Entries

```typescript
import { storeEntry } from '@/lib/entries/walrus-storage';

const { id, blobId } = await storeEntry(
  prisma,
  userId,
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

const entry = await retrieveEntry(prisma, entryId);
// Returns: { content, signature, contentHash, timestamp, walletAddress, wordCount }
```

## Performance

### Upload
- **Time**: ~1-5 seconds (depends on network)
- **Cost**: ~105 MIST (very small amount of SUI)
- **Reliability**: High (Walrus testnet)

### Download
- **Time**: ~1-3 seconds (depends on network)
- **Cost**: Free (read operations)
- **Reliability**: High (Walrus testnet)

### Database
- **Metadata queries**: <100ms (PostgreSQL)
- **Storage**: Minimal (only metadata)

## Troubleshooting

### Common Issues

1. **Upload fails**
   - Check `SUI_ADMIN_PRIVATE_KEY` is set
   - Verify admin address has SUI for gas
   - Check Walrus testnet status

2. **Download fails**
   - Verify blobId is correct
   - Check blob exists on Walrus
   - Wait for blob certification (~10-30 seconds)

3. **WASM loading issues**
   - Check `next.config.ts` has `serverExternalPackages`
   - Verify WASM URL is accessible
   - Check browser console for errors

## Testing

### Test Scripts

- `scripts/test-walrus-upload-relay.ts` - Integration test
- `app/test-walrus/page.tsx` - Manual test page

### Manual Testing

1. Create a diary entry
2. Verify entry is stored in Walrus
3. View entry (should load from Walrus)
4. Generate AI summary (should read from Walrus)

## Resources

### Documentation
- [Walrus Documentation](https://docs.wal.app/)
- [Walrus GitHub](https://github.com/MystenLabs/walrus)
- [Sui Documentation](https://docs.sui.io/)

### Diagrams
- `diagrams/sponsored-transactions.excalidraw` - Move smart contract flow
- `diagrams/walrus-storage.excalidraw` - Walrus storage flow

## Future Enhancements

- Blob compression before upload
- Blob chunking for large entries
- Blob caching for performance
- Blob replication for reliability
- Migration script for legacy entries
- Mainnet migration

---

**Last Updated**: November 9, 2024
**Status**: ✅ Production Ready
**Network**: Testnet (mainnet ready)

