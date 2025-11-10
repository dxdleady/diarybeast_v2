# Seal Encryption Integration

DiaryBeast integrates **Seal** for optional threshold-based encryption, providing maximum privacy for users who want it.

## Overview

Seal is a decentralized secrets management (DSM) system that provides:
- **Identity-based encryption**: Encrypt data using user identity (wallet address)
- **Threshold-based decryption**: Decrypt data using multiple key servers
- **Maximum privacy**: Only the user can decrypt by signing with their wallet

## Features

- ✅ **Optional Encryption**: Users can choose per-entry whether to use Seal encryption (disabled by default)
- ✅ **Threshold-Based Decryption**: Uses distributed key servers for decryption
- ✅ **Identity-Based Encryption**: Uses wallet address as identity
- ✅ **Maximum Privacy**: Only the user can decrypt - even the server cannot read Seal-encrypted entries
- ✅ **AI Exclusion**: Seal-encrypted entries are excluded from AI analysis

## How It Works

### Encryption Flow

```
User enables Seal encryption
    ↓
Entry encrypted with Seal SDK
    ↓
User's wallet address used as identity
    ↓
Encrypted object + metadata stored
    ↓
Only user can decrypt (requires wallet signature)
```

### Decryption Flow

```
User views entry
    ↓
Create SessionKey (requires wallet signature)
    ↓
Build seal_approve transaction
    ↓
Fetch keys from key servers
    ↓
Decrypt entry
```

## Implementation

### Key Files

- `lib/seal/encryption.ts` - Core encryption/decryption
- `lib/seal/hybrid-encryption.ts` - Hybrid encryption wrapper
- `lib/seal/session-key.ts` - SessionKey management
- `lib/seal/transaction.ts` - Transaction building
- `lib/seal/config.ts` - Configuration
- `sui-contracts/diarybeast_seal_policies/sources/seal_policies.move` - Access policies contract

### Encryption

```typescript
import { encryptWithSeal } from '@/lib/seal/encryption';

const result = await encryptWithSeal(
  content,
  userAddress, // Identity for encryption
  threshold // Number of key servers needed
);

// result.encryptedObject - Encrypted data
// result.sealId - Identity used
// result.packageId - Package ID
// result.threshold - Threshold
```

### Decryption

```typescript
import { decryptWithSeal } from '@/lib/seal/encryption';

// Create SessionKey (requires wallet signature)
const sessionKey = await createSealSessionKey(
  userAddress,
  signer, // Wallet signer
  threshold
);

// Build seal_approve transaction
const txBytes = await createSealAuthorizationTransaction(
  userAddress,
  sessionKey,
  policyRegistryId
);

// Decrypt
const decrypted = await decryptWithSeal(
  encryptedObject,
  userAddress,
  sessionKey,
  txBytes,
  threshold
);
```

### Hybrid Encryption

```typescript
import { hybridEncrypt, hybridDecrypt } from '@/lib/seal/hybrid-encryption';

// Encrypt (uses Seal if available, otherwise crypto-js)
const result = await hybridEncrypt(
  content,
  userAddress,
  signature,
  useSeal // User choice
);

// Decrypt (handles both Seal and crypto-js)
const decrypted = await hybridDecrypt({
  encryptedData: entry.encryptedContent,
  method: entry.method || 'crypto-js',
  walletAddress: userAddress,
  sealEncryptedObject: entry.sealEncryptedObject,
  sessionKey: sessionKey, // Required for Seal
  txBytes: txBytes, // Required for Seal
  sealId: entry.sealId,
  sealThreshold: entry.sealThreshold,
});
```

## Configuration

### Environment Variables

```bash
# Enable/disable Seal (default: true)
SEAL_ENABLED=true

# Official Seal Package ID (from MystenLabs)
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682

# Access Policies Package ID (your deployed package)
NEXT_PUBLIC_SEAL_PACKAGE_ID=0x...

# Policy Registry Object ID
NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID=0x...

# Admin Cap Object ID
SEAL_ADMIN_CAP_ID=0x...

# Key Server Object IDs (comma-separated)
NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS=0x...,0x...

# Default Threshold (number of key servers needed)
SEAL_DEFAULT_THRESHOLD=2
```

### Key Servers

Seal uses distributed key servers for threshold-based decryption:

- **Testnet**: Mysten Labs key servers (Open mode, free for testing)
- **Mainnet**: Various key server providers (Open mode + Permissioned mode)

Key servers are configured via `NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS`.

## Access Policies

### Move Contract

The `seal_policies.move` contract defines access policies:

```move
module diarybeast::seal_policies;

// Create access policy for user
public entry fun create_policy(
    registry: &mut PolicyRegistry,
    admin_cap: &AdminCap,
    user: address,
    ctx: &mut tx_context::TxContext
);

// Approve decryption access
public entry fun seal_approve(
    registry: &PolicyRegistry,
    requester: address,
    ctx: &mut tx_context::TxContext
): bool;
```

### Policy Registry

The Policy Registry is a shared Sui object that stores access policies for each user identity.

## SessionKey

SessionKey is required for Seal decryption:

- **TTL**: 1-30 minutes (configurable)
- **Signature**: Requires user's wallet signature
- **Purpose**: Authorizes decryption for a limited time

### Creating SessionKey

```typescript
import { createSealSessionKey } from '@/lib/seal/session-key';

const sessionKey = await createSealSessionKey(
  userAddress,
  signer, // Wallet signer
  threshold,
  ttlMin // Optional: TTL in minutes (default: 5)
);
```

## Database Schema

Seal-encrypted entries are stored with additional metadata:

```typescript
{
  encryptedContent: string, // Base64 encoded (crypto-js or Seal)
  method: 'crypto-js' | 'seal',
  sealEncryptedObject?: string, // Base64 encoded Seal encrypted object
  sealKey?: string, // Base64 encoded Seal key (backup)
  sealPackageId?: string,
  sealId?: string, // Identity used for encryption
  sealThreshold?: number, // Threshold for decryption
}
```

## AI Analysis Exclusion

Seal-encrypted entries are **excluded from AI analysis** for maximum privacy:

- Server cannot decrypt Seal-encrypted entries
- Only user can decrypt (requires wallet signature)
- AI analysis only processes crypto-js encrypted entries

## Troubleshooting

### "Not enough shares"

- Verify key servers are configured correctly
- Check threshold is not higher than number of key servers
- Verify user address matches identity used for encryption
- Check SessionKey is valid and not expired

### "Seal package ID is not configured"

- Set `NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID`
- Set `NEXT_PUBLIC_SEAL_PACKAGE_ID` (access policies package)
- Verify both package IDs are correct

### "Policy Registry not found"

- Set `NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID`
- Verify Policy Registry object exists on-chain
- Check network matches (testnet/mainnet)

## Resources

- [Seal Documentation](https://seal-docs.wal.app/)
- [Seal GitHub](https://github.com/MystenLabs/seal)
- [Seal Setup Guide](../lib/seal/SETUP.md)
- [Seal README](../lib/seal/README.md)

