# Seal Setup Guide

This guide explains how to configure Seal for DiaryBeast.

## Prerequisites

1. **Sui Network**: Sui testnet or mainnet
2. **Admin Keypair**: Sui keypair for deploying access policies
3. **Environment Variables**: Configure environment variables for Seal

## Quick Start

### 1. Enable Seal (Optional)

Seal is enabled by default. To disable, set:

```bash
SEAL_ENABLED=false
```

### 2. Configure Environment Variables

Create or update `.env.local`:

```bash
# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet

# Seal Configuration
SEAL_ENABLED=true

# Official Seal Package ID (from Seal documentation)
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682

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

# Admin Private Key (for deploying access policies)
SUI_ADMIN_PRIVATE_KEY=your_admin_private_key
```

### 3. Deploy Access Policies (One-time Setup)

Deploy the Seal access policies Move package:

```bash
pnpm tsx scripts/seal-tests/deploy-seal-policies.ts testnet
```

This will output:
- Package ID (set `NEXT_PUBLIC_SEAL_PACKAGE_ID`)
- Policy Registry ID (set `SEAL_POLICY_REGISTRY_ID`)
- Admin Cap ID (set `SEAL_ADMIN_CAP_ID`)

### 4. Create Access Policy for Users

Create access policy for each user:

```bash
pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>
```

### 5. Test Configuration

Test Seal encryption/decryption:

```bash
pnpm tsx scripts/seal-tests/test-seal-encryption.ts <userAddress>
```

## Detailed Configuration

### Official Seal Package ID

The official Seal package ID is provided by Mysten Labs. For testnet:

```
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682
```

### Key Servers

Key servers are Sui objects that participate in threshold-based decryption. You need at least one key server configured.

**Finding Key Servers:**
1. Check Seal documentation: https://seal-docs.wal.app
2. Contact Seal team on Sui Discord
3. Check Seal example applications on GitHub

**Configuration:**
```bash
# Key Server Object IDs (comma-separated)
NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS=0x...,0x...

# Default Threshold (number of key servers needed for decryption)
SEAL_DEFAULT_THRESHOLD=2
```

**Threshold Guidelines:**
- Threshold should be less than or equal to the number of key servers
- Higher threshold = more secure but requires more key servers to respond
- Lower threshold = less secure but more reliable (fewer key servers needed)

### Access Policies

Access policies control who can decrypt Seal-encrypted entries. The access policies Move package must be deployed before users can use Seal encryption.

**Deploy Access Policies:**
```bash
pnpm tsx scripts/seal-tests/deploy-seal-policies.ts testnet
```

**Create Access Policy for User:**
```bash
pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>
```

This allows:
- User to decrypt their own entries (implicit)
- Admin to decrypt entries for AI analysis (if needed in future)

## Environment Variables Reference

### Required Variables

```bash
# Official Seal Package ID
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=0x...

# Access Policies Package ID (your deployed package)
NEXT_PUBLIC_SEAL_PACKAGE_ID=0x...

# Policy Registry Object ID
SEAL_POLICY_REGISTRY_ID=0x...

# Admin Cap Object ID
SEAL_ADMIN_CAP_ID=0x...

# Key Server Object IDs
NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS=0x...,0x...

# Default Threshold
SEAL_DEFAULT_THRESHOLD=2

# Admin Private Key (for deploying access policies)
SUI_ADMIN_PRIVATE_KEY=your_admin_private_key
```

### Optional Variables

```bash
# Enable/disable Seal (default: true)
SEAL_ENABLED=true

# Sui Network (default: testnet)
NEXT_PUBLIC_SUI_NETWORK=testnet

# Key Server API Keys (if required)
SEAL_KEY_SERVER_API_KEY_NAME=api-key
SEAL_KEY_SERVER_API_KEY=your-api-key

# Timeout for requests (milliseconds, default: 30000)
SEAL_TIMEOUT=30000
```

## Testing

### Test Configuration

Test Seal configuration:

```bash
pnpm tsx scripts/seal-tests/test-seal-shares.ts
```

### Test Encryption/Decryption

Test encryption/decryption for a user:

```bash
pnpm tsx scripts/seal-tests/test-seal-encryption.ts <userAddress>
```

### Diagnose Issues

If you encounter "Not enough shares" errors:

```bash
pnpm tsx scripts/seal-tests/test-seal-shares.ts
```

This script will:
- Check key server configuration
- Test encryption with different thresholds
- Test decryption and share retrieval
- Diagnose threshold vs key server count issues

## Troubleshooting

### "No key servers configured"

**Solution**: Configure key servers in environment variables:
```bash
NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS=0x...,0x...
```

### "Seal package ID is not configured"

**Solution**: Set `NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID` and `NEXT_PUBLIC_SEAL_PACKAGE_ID` environment variables.

### "Access policy not found"

**Solution**: Create access policy for the user:
```bash
pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>
```

### "Not enough shares"

**Solution**:
1. Check key server configuration
2. Verify threshold is not higher than key server count
3. Ensure key servers are accessible
4. Run diagnostic script: `pnpm tsx scripts/seal-tests/test-seal-shares.ts`

### "Seal is not available"

**Solution**:
1. Check `SEAL_ENABLED` is not set to `false`
2. Verify Seal package IDs are configured
3. Verify key servers are configured

## Next Steps

After configuring Seal:

1. **Test Configuration**: Run test scripts to verify Seal is working
2. **Create Access Policies**: Create access policies for users
3. **Test in Application**: Create diary entry with Seal encryption enabled
4. **Verify Decryption**: View entry to verify decryption works

## Resources

- **Seal Documentation**: https://seal-docs.wal.app
- **Seal GitHub**: https://github.com/MystenLabs/seal
- **Test Scripts**: [scripts/seal-tests/README.md](../../scripts/seal-tests/README.md)
- **Seal README**: [README.md](./README.md)
