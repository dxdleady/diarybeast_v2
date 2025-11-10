# Migration Guide

This document describes the migration of DiaryBeast from Base (Ethereum) to Sui blockchain.

## Overview

DiaryBeast was migrated from Base to Sui to:
- Participate in Sui Overflow III hackathon
- Leverage Walrus for decentralized storage
- Use Seal for threshold-based encryption
- Reduce gas costs (95-98% savings)
- Improve security and decentralization

## Migration Timeline

The migration was completed in stages:

1. **Sui Environment Setup** - Sui CLI, Move learning
2. **Move Smart Contract** - DiaryToken contract deployment
3. **Sui Wallet Integration** - @mysten/dapp-kit integration
4. **Walrus Storage Integration** - Decentralized storage
5. **Seal Encryption** - Threshold-based encryption
6. **Frontend Updates** - UI/UX improvements
7. **Testing & Deployment** - Final testing and deployment

## Key Changes

### Blockchain

**Before (Base)**:
- ERC-20 token (Solidity)
- Wagmi + Viem for interactions
- Coinbase OnchainKit for wallet
- High gas costs ($0.05-0.50 per tx)

**After (Sui)**:
- Move token contract
- @mysten/dapp-kit for wallet
- Sui SDK for interactions
- Low gas costs ($0.001-0.01 per tx)
- Sponsored transactions (gas-free for users)

### Storage

**Before**:
- PostgreSQL only (centralized)
- All data in database

**After**:
- Walrus (decentralized) for encrypted content
- PostgreSQL for metadata only
- Hybrid model (best of both worlds)

### Encryption

**Before**:
- crypto-js only (AES encryption)
- Server can decrypt for AI analysis

**After**:
- crypto-js (default, server can decrypt)
- Seal (optional, user choice, maximum privacy)
- Hybrid encryption system

## Challenges & Solutions

### Challenge 1: TreasuryCap as Shared Object

**Problem**: Initial deployment had TreasuryCap as owned object, preventing sponsored transactions.

**Solution**: Updated `init` function to make TreasuryCap a shared object:

```move
// Make TreasuryCap a shared object
sui::transfer::public_share_object(treasury_cap);
```

### Challenge 2: Seal Decryption "Not enough shares"

**Problem**: Decryption failed with "Not enough shares" error.

**Solution**:
- Correctly use `fetchKeys()` before `decrypt()`
- Pass correct identity ID (user address) to `fetchKeys()`
- Use correct threshold from entry metadata

### Challenge 3: React Strict Mode Double Calls

**Problem**: `useEffect` called twice in development, causing duplicate transactions.

**Solution**: Added comment explaining React Strict Mode behavior, no code changes needed (production works correctly).

## Migration Files

### Smart Contracts

- `sui-contracts/diarybeast_token/sources/diary_token.move` - Token contract
- `sui-contracts/diarybeast_seal_policies/sources/seal_policies.move` - Access policies

### Code Changes

- `lib/sui/token.ts` - Token utilities (replaced `lib/blockchain.ts`)
- `lib/sui/sponsored-transactions.ts` - Sponsored transaction handling
- `lib/walrus/client-sdk.ts` - Walrus SDK client
- `lib/seal/*` - Seal encryption integration
- `app/providers.tsx` - Wallet provider (replaced OnchainKit)

## Environment Variables Migration

### Before (Base)

```bash
OWNER_PRIVATE_KEY=...
NEXT_PUBLIC_DIARY_TOKEN_ADDRESS=...
NEXT_PUBLIC_ONCHAINKIT_API_KEY=...
```

### After (Sui)

```bash
SUI_ADMIN_PRIVATE_KEY=suiprivkey1...
NEXT_PUBLIC_SUI_PACKAGE_ID=0x...
NEXT_PUBLIC_SUI_TREASURY_CAP_ID=0x...
NEXT_PUBLIC_SUI_ADMIN_CAP_ID=0x...
NEXT_PUBLIC_SUI_NETWORK=testnet
# Walrus
NEXT_PUBLIC_WALRUS_AGGREGATOR_URL=...
# Seal
NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID=0x...
NEXT_PUBLIC_SEAL_PACKAGE_ID=0x...
```

## Database Schema Changes

### Entry Model

**Added fields**:
- `walrusBlobId` - Blob ID for Walrus storage
- `walrusTxDigest` - Transaction digest for verification
- `storageType` - "walrus" or "postgres"
- `sealEncryptedObject` - Seal encrypted data (optional)
- `sealPackageId` - Seal package ID (optional)
- `sealId` - Identity used for encryption (optional)
- `sealThreshold` - Threshold for decryption (optional)

**Migration**:
- Existing entries remain in PostgreSQL (`storageType: "postgres"`)
- New entries stored on Walrus (`storageType: "walrus"`)
- Backward compatible (supports both)

## Benefits Achieved

### Cost Reduction

- **Gas costs**: 95-98% reduction ($0.05-0.50 → $0.001-0.01)
- **Storage costs**: Predictable (~$0.10/GB on Walrus)
- **Infrastructure**: 90% reduction ($50-200 → $5-20/month)

### Security Improvements

- **Encryption**: Optional Seal encryption for maximum privacy
- **Decentralization**: Content stored on Walrus (no single point of failure)
- **Access Control**: Onchain access policies via Move contracts

### Performance Gains

- **Transaction speed**: <1 second finality
- **Throughput**: High throughput capability
- **Parallel execution**: Sui's object-centric model

## Resources

- [Migration Plan](../DIARYBEAST-SUI-MIGRATION-PLAN.md) - Detailed migration plan
- [Migration Challenges](../MIGRATION_CHALLENGES_AND_SOLUTIONS.md) - Challenges and solutions
- [Sui Documentation](https://docs.sui.io/)
- [Walrus Documentation](https://walrus.wal.app/)
- [Seal Documentation](https://seal-docs.wal.app/)

