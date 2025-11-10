# Seal Integration for DiaryBeast

Seal is a decentralized secrets management (DSM) system that provides identity-based encryption with threshold-based decryption. This integration enables users to optionally encrypt their diary entries with Seal for enhanced privacy.

## Overview

Seal provides:
- **Identity-based encryption**: Encrypt data using user identity (wallet address)
- **Threshold-based decryption**: Decrypt data using multiple key servers (threshold scheme)
- **Maximum privacy**: Only the user can decrypt by signing with their wallet - even the server cannot read Seal-encrypted entries
- **Optional feature**: Users choose per-entry whether to use Seal encryption (disabled by default)

## How It Works

### Default Encryption (crypto-js)
- All entries are encrypted with crypto-js by default
- Server can decrypt for AI analysis
- Fast and simple

### Optional Seal Encryption
- Users can enable Seal encryption per entry via checkbox in the editor
- Entry is encrypted with distributed key servers
- **Only the user can decrypt** by signing with their wallet
- **No one else, including the server, can read it** without the user's signature
- Stored differently in the database
- **Excluded from AI analysis** (for maximum privacy)

## Features

- ✅ **Optional Seal encryption** - Users choose per-entry (disabled by default)
- ✅ **Hybrid encryption system** - Supports both Seal and crypto-js
- ✅ **Identity-based encryption** - Uses wallet address as identity
- ✅ **Threshold-based decryption** - Uses distributed key servers
- ✅ **Session key management** - Wallet signature required for decryption
- ✅ **Access policies** - Onchain policies for controlling decryption access
- ✅ **Backward compatibility** - Existing crypto-js entries continue to work
- ✅ **AI analysis exclusion** - Seal-encrypted entries excluded from AI summaries

## Configuration

Seal is **optional** and can be enabled/disabled via environment variables:

```bash
# Enable/disable Seal (default: true)
SEAL_ENABLED=true

# Official Seal Package ID
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=0x...

# Access Policies Package ID (your deployed package)
NEXT_PUBLIC_SEAL_PACKAGE_ID=0x...

# Policy Registry Object ID
SEAL_POLICY_REGISTRY_ID=0x...

# Admin Cap Object ID
SEAL_ADMIN_CAP_ID=0x...

# Key Server Object IDs (comma-separated)
NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS=0x...,0x...

# Default Threshold (number of key servers needed for decryption)
SEAL_DEFAULT_THRESHOLD=2
```

See [SETUP.md](./SETUP.md) for detailed setup instructions.

## Usage

### In the Application

1. **Enable Seal encryption**: Users can enable Seal encryption per entry via checkbox in the editor
2. **View entries**: Seal-encrypted entries are automatically decrypted when viewing (requires wallet signature)
3. **AI analysis**: Seal-encrypted entries are excluded from AI analysis

### Programmatic Usage

```typescript
import { hybridEncrypt, hybridDecrypt, isSealAvailable } from '@/lib/seal';

// Encrypt with Seal (if user chose Seal encryption)
if (isSealAvailable() && useSealEncryption) {
  const result = await hybridEncrypt(content, userAddress, signature);
  // result.encryptedData - encrypted content
  // result.method - 'seal' or 'crypto-js'
  // result.sealId, result.sealThreshold, etc. - Seal metadata
}

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

## Architecture

### Encryption Flow

1. User writes diary entry
2. User optionally enables Seal encryption
3. If Seal enabled:
   - Entry is encrypted using Seal SDK with user's wallet address as identity
   - Encryption keys are distributed across key servers
   - Seal metadata is stored (packageId, sealId, threshold, etc.)
4. If Seal disabled:
   - Entry is encrypted using crypto-js (default)
   - Standard encryption key derived from wallet address

### Decryption Flow

1. User requests to view entry
2. If Seal-encrypted:
   - User creates SessionKey for their wallet address
   - User signs personal message with wallet
   - User creates authorization transaction
   - Entry is decrypted using Seal SDK
3. If crypto-js encrypted:
   - Entry is decrypted using standard crypto-js decryption

## Testing

Test scripts are located in `scripts/seal-tests/`:

- **test-seal-shares.ts** - Diagnostic script for "Not enough shares" errors
- **test-seal-encryption.ts** - Test encryption/decryption for a user
- **create-seal-access-policy.ts** - Create access policy for a user
- **deploy-seal-policies.ts** - Deploy access policies Move package

See [scripts/seal-tests/README.md](../../scripts/seal-tests/README.md) for detailed documentation.

## Troubleshooting

### "Not enough shares" Error

- Check key server configuration
- Verify threshold is not higher than key server count
- Ensure key servers are accessible
- Run `test-seal-shares.ts` diagnostic script

### "Access policy not found" Error

- Create access policy for the user: `pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>`
- Verify PolicyRegistry ID is correct

### "Seal is not available" Error

- Check `SEAL_ENABLED` is not set to `false`
- Verify Seal package IDs are configured
- Verify key servers are configured

## Resources

- **Seal Documentation**: https://seal-docs.wal.app
- **Seal GitHub**: https://github.com/MystenLabs/seal
- **Setup Guide**: [SETUP.md](./SETUP.md)
- **Test Scripts**: [scripts/seal-tests/README.md](../../scripts/seal-tests/README.md)

## Current Status

✅ **Complete**: Seal integration is fully implemented and functional.

- ✅ Seal SDK integration
- ✅ Hybrid encryption system (Seal + crypto-js)
- ✅ Optional Seal encryption per entry
- ✅ Access policies implementation
- ✅ Frontend integration
- ✅ API integration
- ✅ Test scripts
- ✅ Documentation

## Notes

- Seal encryption is **optional** - users choose per-entry
- Seal-encrypted entries are **excluded from AI analysis** for maximum privacy
- Access policies must be created for users before they can use Seal encryption
- Key servers must be configured and accessible for decryption to work
- Threshold should be less than or equal to the number of key servers
