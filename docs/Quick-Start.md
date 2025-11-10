# Quick Start Guide

Get started with DiaryBeast in 5 minutes! This guide is designed for hackathon judges and provides a quick overview of the project.

## What is DiaryBeast?

DiaryBeast is a Web3 diary application where users write daily entries to feed and evolve their personal beast. The app uses AI to analyze emotions, generates custom music, and rewards users with soul-bound tokens.

## Key Features

### 🦭 Walrus Integration
- **Decentralized Storage**: Diary entries are stored on Walrus, a decentralized storage network
- **Cost-Effective**: ~$0.10/GB storage cost
- **Content Addressing**: Entries are content-addressed and verifiable on-chain

### 🔐 Seal Encryption (Optional)
- **Threshold-Based Encryption**: Optional enhanced privacy with Seal encryption
- **User Choice**: Users can enable Seal encryption per entry (disabled by default)
- **Maximum Privacy**: Only the user can decrypt Seal-encrypted entries (even the server cannot read them)
- **AI Exclusion**: Seal-encrypted entries are excluded from AI analysis for maximum privacy

### ⛓️ Sui Blockchain
- **Soul-Bound Tokens**: Users earn DiaryToken for writing entries
- **Sponsored Transactions**: Users don't pay gas fees (admin sponsors transactions)
- **Move Smart Contracts**: Token minting and burning via Move contracts

### 🤖 AI Analysis
- **Weekly Summaries**: AI analyzes emotions and generates weekly insights
- **Privacy-First**: Only crypto-js encrypted entries are analyzed (Seal-encrypted entries excluded)

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│           Next.js 15 Frontend               │
│     (React 19, Tailwind, Zustand)           │
└──────────────┬──────────────────────────────┘
               │
               ├─→ Sui Wallet (@mysten/dapp-kit)
               │   └─→ Sui Testnet/Mainnet
               │       └─→ DiaryToken (Move contract)
               │
               ├─→ Seal SDK (Optional)
               │   ├─→ Threshold encryption
               │   └─→ Access policies (Move contract)
               │
               ├─→ Walrus SDK
               │   ├─→ Encrypted blobs (diary entries)
               │   └─→ Content addressing
               │
               ├─→ PostgreSQL Database
               │   └─→ Metadata (users, entries, rewards)
               │
               └─→ Groq AI API
                   └─→ Weekly emotion analysis
```

## Technology Stack

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Blockchain**: Sui (Move smart contracts)
- **Storage**: Walrus (decentralized) + PostgreSQL (metadata)
- **Encryption**: Seal (threshold-based) + crypto-js (fallback)
- **Wallet**: @mysten/dapp-kit (Sui wallet integration)

## Main Smart Contracts

### DiaryToken Contract
- **Location**: `sui-contracts/diarybeast_token/sources/diary_token.move`
- **Purpose**: Soul-bound token for rewards
- **Functions**:
  - `mint_reward`: Admin mints tokens to users
  - `burn`: Users burn tokens for purchases
- **Package ID**: Configured via `NEXT_PUBLIC_SUI_PACKAGE_ID` (testnet) or `NEXT_PUBLIC_SUI_PACKAGE_ID_MAINNET` (mainnet)

### Seal Access Policies Contract
- **Location**: `sui-contracts/diarybeast_seal_policies/sources/seal_policies.move`
- **Purpose**: Access control for Seal encryption/decryption
- **Functions**:
  - `create_policy`: Create access policy for user
  - `seal_approve`: Approve decryption access
- **Package ID**: Configured via `NEXT_PUBLIC_SEAL_PACKAGE_ID`

## How to Run

1. **Clone the repository**
2. **Install dependencies**: `pnpm install`
3. **Set up environment variables** (see [Setup Guide](./Setup-Guide.md))
4. **Run database migrations**: `pnpm prisma migrate dev`
5. **Start development server**: `pnpm dev`

## Demo Links

- **Live Demo**: [Deploy to Vercel/your hosting]
- **GitHub Repository**: [Your repository URL]
- **Documentation**: [This documentation]
- **Video Demo**: [Link to video walkthrough]

## What to Look For in the Demo

When testing DiaryBeast, pay attention to:

1. **Wallet Connection**: Seamless Sui wallet integration
2. **Entry Creation**: Fast, no gas fees (sponsored transaction)
3. **Encryption Options**: Checkbox to enable Seal encryption per entry
4. **Token Rewards**: Automatic token minting after entry creation
5. **AI Summaries**: Privacy-preserving weekly summaries
6. **Storage**: Entries stored on Walrus (decentralized)

## For Hackathon Judges

See [Hackathon Highlights](./Hackathon-Highlights.md) for detailed information about:
- How we use Walrus for decentralized storage
- How we use Seal for threshold-based encryption
- How we integrate with Sui blockchain
- Innovation and uniqueness of the project

## Next Steps

- **[Setup Guide](./Setup-Guide.md)** - Complete environment setup
- **[Architecture](./Architecture.md)** - Detailed system architecture
- **[API Reference](./API-Reference.md)** - All API endpoints

