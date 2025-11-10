# Setup Guide

Complete guide for setting up DiaryBeast development environment.

## Prerequisites

- **Node.js**: 18+ (recommended: 20+)
- **pnpm**: Latest version
- **Sui CLI**: For contract deployment
- **PostgreSQL**: Database (local or cloud)
- **Sui Wallet**: For testing (Sui Wallet extension)

## Installation

### 1. Clone Repository

```bash
git clone <repository-url>
cd diarybeast_v2
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Install Sui CLI

**macOS/Linux**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sui.io/install.sh | sh
```

**Windows**:
```powershell
# Use WSL or follow Windows installation guide
```

### 4. Setup Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL
# Create database
createdb diarybeast

# Or use Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres
```

**Option B: Cloud Database (Vercel Postgres, Neon)**
- Create database in cloud provider
- Get connection string

### 5. Run Migrations

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

## Environment Variables

Create `.env.local` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/diarybeast"

# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet

# Token Contract (testnet)
NEXT_PUBLIC_SUI_PACKAGE_ID=0x...
NEXT_PUBLIC_SUI_TREASURY_CAP_ID=0x...
NEXT_PUBLIC_SUI_ADMIN_CAP_ID=0x...

# Admin Private Key (for sponsored transactions)
# Format: suiprivkey1... or base64 encoded
SUI_ADMIN_PRIVATE_KEY=suiprivkey1...

# Walrus Configuration
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
NEXT_PUBLIC_WALRUS_STORAGE_EPOCHS=5

# Seal Configuration
SEAL_ENABLED=true
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682
NEXT_PUBLIC_SEAL_PACKAGE_ID=0x...
NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID=0x...
SEAL_ADMIN_CAP_ID=0x...
NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS=0x...,0x...
SEAL_DEFAULT_THRESHOLD=2

# AI Configuration
GROQ_API_KEY=...

# Music Configuration (optional)
MUBERT_COMPANY_ID=...
MUBERT_LICENSE_TOKEN=...
```

## Contract Deployment

### 1. Deploy Token Contract

```bash
cd sui-contracts/diarybeast_token
sui client publish --gas-budget 100000000
```

**Output**:
- Package ID
- TreasuryCap ID
- AdminCap ID

**Update `.env.local`**:
```bash
NEXT_PUBLIC_SUI_PACKAGE_ID=<package-id>
NEXT_PUBLIC_SUI_TREASURY_CAP_ID=<treasury-cap-id>
NEXT_PUBLIC_SUI_ADMIN_CAP_ID=<admin-cap-id>
```

### 2. Deploy Seal Policies Contract

```bash
cd sui-contracts/diarybeast_seal_policies
sui client publish --gas-budget 100000000
```

**Output**:
- Package ID
- Policy Registry ID (from init function)
- AdminCap ID

**Update `.env.local`**:
```bash
NEXT_PUBLIC_SEAL_PACKAGE_ID=<package-id>
NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID=<policy-registry-id>
SEAL_ADMIN_CAP_ID=<admin-cap-id>
```

### 3. Create Access Policy

```bash
cd scripts/seal-tests
pnpm tsx create-seal-access-policy.ts
```

## Wallet Setup

### 1. Install Sui Wallet Extension

- Chrome: [Sui Wallet Extension](https://chrome.google.com/webstore/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil)
- Firefox: [Sui Wallet Extension](https://addons.mozilla.org/en-US/firefox/addon/sui-wallet/)

### 2. Create Testnet Wallet

1. Open Sui Wallet extension
2. Create new wallet
3. Switch to Testnet
4. Get testnet SUI from faucet: https://discord.com/channels/916379725201563759/971488439931392130

### 3. Get Admin Address

```bash
# From SUI_ADMIN_PRIVATE_KEY
sui keytool list
# Or use script
node scripts/get-admin-address.js
```

## Walrus Setup

### 1. Get WAL Tokens

Admin address needs WAL tokens for storage:

```bash
# Get WAL tokens from faucet or purchase
# Testnet: https://faucet.walrus-testnet.walrus.space
```

### 2. Verify Configuration

```bash
# Test Walrus connection
pnpm tsx scripts/test-walrus-connection.ts
```

## Seal Setup

### 1. Configure Key Servers

**Testnet (Open Mode, Free)**:
- Mysten Labs key servers (default)
- No API key required

**Mainnet**:
- Choose key server provider
- Get API key if required
- Configure in environment variables

### 2. Test Seal Encryption

```bash
cd scripts/seal-tests
pnpm tsx test-seal-encryption.ts
```

## Development Server

### Start Development Server

```bash
pnpm dev
```

### Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3000/api

## Testing

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

### Test Seal Integration

```bash
cd scripts/seal-tests
pnpm tsx test-seal-encryption.ts
pnpm tsx test-seal-shares.ts
```

## Troubleshooting

### "Database connection failed"

- Verify `DATABASE_URL` is correct
- Check PostgreSQL is running
- Verify database exists

### "Missing Sui token configuration"

- Verify contract deployment completed
- Check environment variables are set
- Verify network matches (testnet/mainnet)

### "Seal package ID is not configured"

- Verify Seal contracts deployed
- Check `NEXT_PUBLIC_SEAL_PACKAGE_ID` is set
- Verify Policy Registry ID is correct

### "Failed to upload to Walrus"

- Verify admin has WAL tokens
- Check admin has SUI for gas
- Verify network configuration

### "Not enough shares" (Seal)

- Verify key servers are configured
- Check threshold is correct
- Verify user address matches identity

## Production Deployment

### Vercel Deployment

1. **Connect Repository** to Vercel
2. **Set Environment Variables** in Vercel dashboard
3. **Deploy** (automatic on push to main)

### Environment Variables for Production

- Use **mainnet** URLs and package IDs
- Set production database URL
- Configure production API keys
- Set `NEXT_PUBLIC_SUI_NETWORK=mainnet`

## Resources

- [Sui Documentation](https://docs.sui.io/)
- [Walrus Documentation](https://walrus.wal.app/)
- [Seal Documentation](https://seal-docs.wal.app/)
- [Seal Setup Guide](../lib/seal/SETUP.md)

