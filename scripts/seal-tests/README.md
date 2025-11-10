# Seal Tests Scripts

This directory contains test scripts for Seal encryption functionality in DiaryBeast.

## Scripts Overview

### 1. `test-seal-shares.ts` - Diagnostic Script

**Purpose**: Tests Seal encryption/decryption and diagnoses "Not enough shares" errors.

**What it does**:
- Checks key server configuration
- Tests encryption with different thresholds
- Tests decryption and share retrieval
- Validates key server availability
- Diagnoses threshold vs key server count issues

**Usage**:
```bash
pnpm tsx scripts/seal-tests/test-seal-shares.ts
```

**Environment variables required**:
- `SUI_ADMIN_PRIVATE_KEY` - For signing personal message
- `NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS` - Comma-separated key server object IDs
- `NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID` - Official Seal package ID
- `TEST_WALLET_ADDRESS` (optional) - Test wallet address (defaults to test address)
- `TEST_WALLET_PRIVATE_KEY` (optional) - Test wallet private key for signing

---

### 2. `test-seal-encryption.ts` - Encryption/Decryption Test

**Purpose**: Tests Seal encryption and decryption functionality for a specific user.

**What it does**:
- Encrypts test data using Seal
- Tests client-side decryption (user decrypts their own entry)
- Tests server-side decryption (admin decrypts for AI analysis)
- Validates encryption/decryption flow

**Usage**:
```bash
pnpm tsx scripts/seal-tests/test-seal-encryption.ts <userAddress>
```

**Example**:
```bash
pnpm tsx scripts/seal-tests/test-seal-encryption.ts 0x1234567890abcdef...
```

**Environment variables required**:
- `SUI_ADMIN_PRIVATE_KEY` - Admin private key
- `NEXT_PUBLIC_SUI_NETWORK` - Network (testnet|mainnet)

**Note**: Access policy must be created for the user before testing decryption:
```bash
pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>
```

---

### 3. `create-seal-access-policy.ts` - Create Access Policy

**Purpose**: Creates an access policy for a user, allowing:
1. User to decrypt their own entries (implicit)
2. Server (admin) to decrypt entries for AI analysis

**Usage**:
```bash
pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress> [adminAddress]
```

**Example**:
```bash
pnpm tsx scripts/seal-tests/create-seal-access-policy.ts 0x1234567890abcdef...
```

**Environment variables required**:
- `SUI_ADMIN_PRIVATE_KEY` - Admin private key for signing transaction
- `NEXT_PUBLIC_SEAL_PACKAGE_ID` - Access policies package ID
- `SEAL_POLICY_REGISTRY_ID` - Policy Registry object ID
- `SEAL_ADMIN_CAP_ID` - Admin Cap object ID
- `NEXT_PUBLIC_SUI_NETWORK` - Network (testnet|mainnet)

**What it does**:
- Creates an access policy on-chain for the specified user
- Allows user to decrypt their own entries
- Allows admin to decrypt entries for AI analysis
- Returns transaction digest and policy object ID

---

### 4. `deploy-seal-policies.ts` - Deploy Move Package

**Purpose**: Deploys the Seal access policies Move package to Sui testnet/mainnet.

**Usage**:
```bash
pnpm tsx scripts/seal-tests/deploy-seal-policies.ts [testnet|mainnet]
```

**Example**:
```bash
pnpm tsx scripts/seal-tests/deploy-seal-policies.ts testnet
```

**Environment variables required**:
- `SUI_ADMIN_PRIVATE_KEY` - Admin private key for deployment
- `NEXT_PUBLIC_SUI_NETWORK` (optional) - Network (testnet|mainnet)

**What it does**:
- Builds the Move package from `sui-contracts/diarybeast_seal_policies`
- Publishes the package to Sui network
- Extracts package ID, PolicyRegistry ID, and AdminCap ID
- Provides next steps for configuration

**Output**:
- Package ID (for `NEXT_PUBLIC_SEAL_PACKAGE_ID`)
- PolicyRegistry ID (for `SEAL_POLICY_REGISTRY_ID`)
- AdminCap ID (for `SEAL_ADMIN_CAP_ID`)

---

## Typical Workflow

### 1. Deploy Access Policies (one-time setup)
```bash
# Deploy Move package to testnet
pnpm tsx scripts/seal-tests/deploy-seal-policies.ts testnet

# Update .env.local with package ID, PolicyRegistry ID, and AdminCap ID
```

### 2. Create Access Policy for User
```bash
# Create access policy for a user
pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>
```

### 3. Test Encryption/Decryption
```bash
# Test Seal encryption/decryption for a user
pnpm tsx scripts/seal-tests/test-seal-encryption.ts <userAddress>
```

### 4. Diagnose Issues (if needed)
```bash
# Run diagnostic script to check key servers and thresholds
pnpm tsx scripts/seal-tests/test-seal-shares.ts
```

---

## Troubleshooting

### "Not enough shares" Error

If you encounter "Not enough shares" errors:
1. Run `test-seal-shares.ts` to diagnose the issue
2. Check key server configuration
3. Verify threshold is not higher than key server count
4. Ensure key servers are accessible
5. Verify access policy is created for the user

### "Access policy not found" Error

If decryption fails with access policy errors:
1. Create access policy for the user:
   ```bash
   pnpm tsx scripts/seal-tests/create-seal-access-policy.ts <userAddress>
   ```
2. Verify PolicyRegistry ID is correct in `.env.local`
3. Check transaction on Sui Explorer

### "Package ID not found" Error

If package ID is not found after deployment:
1. Check transaction output from `deploy-seal-policies.ts`
2. Find package ID manually on Sui Explorer
3. Update `NEXT_PUBLIC_SEAL_PACKAGE_ID` in `.env.local`

---

## Environment Variables

All scripts require the following environment variables (in `.env.local`):

```env
# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet

# Admin Key
SUI_ADMIN_PRIVATE_KEY=your_admin_private_key

# Seal Configuration
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=official_seal_package_id
NEXT_PUBLIC_SEAL_PACKAGE_ID=your_access_policies_package_id
SEAL_POLICY_REGISTRY_ID=policy_registry_object_id
SEAL_ADMIN_CAP_ID=admin_cap_object_id
NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS=key_server_1,key_server_2,...
SEAL_DEFAULT_THRESHOLD=2
SEAL_ENABLED=true
```

---

## Notes

- All scripts use `dotenv` to load environment variables from `.env.local`
- Scripts are designed for testnet/mainnet deployment
- Access policies must be created for each user before they can use Seal encryption
- Key servers must be configured and accessible for decryption to work
- Threshold should be less than or equal to the number of key servers

