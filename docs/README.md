# DiaryBeast Documentation

Welcome to the DiaryBeast documentation! This comprehensive guide covers everything you need to know about the project, from quick start guides for hackathon judges to detailed technical documentation for developers.

## 📚 Documentation Structure

### For Hackathon Judges (Quick Overview)

- **[Quick Start Guide](./Quick-Start.md)** - Get started in 5 minutes
- **[Hackathon Highlights](./Hackathon-Highlights.md)** - Key features and innovations
- **[User Benefits](./User-Benefits.md)** - Real-world value for users
- **[Architecture Overview](./Architecture.md)** - High-level system architecture

### For Developers (Detailed Documentation)

#### Core Technologies
- **[Walrus Integration](./Walrus-Integration.md)** - Decentralized storage implementation
- **[Seal Encryption](./Seal-Encryption.md)** - Threshold-based encryption system
- **[Sui Blockchain](./Sui-Blockchain.md)** - Smart contracts and token economy

#### Setup & Development
- **[Setup Guide](./Setup-Guide.md)** - Complete environment setup
- **[Development Guide](./Development.md)** - Local development workflow
- **[API Reference](./API-Reference.md)** - All API endpoints

#### Features
- **[Gamification System](./Gamification.md)** - Pet system, streaks, and rewards

#### Migration & History
- **[Migration Guide](./Migration.md)** - Migration from Base to Sui

## 🚀 Quick Links

- **Main Contract**: `diary_token.move` - Soul-bound token contract
  - Location: `sui-contracts/diarybeast_token/sources/diary_token.move`
  - Package ID: Set via `NEXT_PUBLIC_SUI_PACKAGE_ID` (testnet) or `NEXT_PUBLIC_SUI_PACKAGE_ID_MAINNET` (mainnet)
  
- **Seal Access Policies**: `seal_policies.move` - Access control for Seal encryption
  - Location: `sui-contracts/diarybeast_seal_policies/sources/seal_policies.move`
  - Package ID: Set via `NEXT_PUBLIC_SEAL_PACKAGE_ID`

## 🏗️ Technology Stack

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Blockchain**: Sui (Move smart contracts)
- **Storage**: Walrus (decentralized) + PostgreSQL (metadata)
- **Encryption**: Seal (threshold-based) + crypto-js (fallback)
- **Wallet**: @mysten/dapp-kit (Sui wallet integration)

## 📖 Key Features

1. **Decentralized Storage** - Diary entries stored on Walrus
2. **Threshold Encryption** - Optional Seal encryption for maximum privacy
3. **Sponsored Transactions** - Users don't pay gas fees
4. **AI Analysis** - Weekly emotion analysis (excludes Seal-encrypted entries)
5. **Gamification** - Pet system with rewards and streaks

## 🔗 External Resources

### Hackathon
- [Walrus Haulout Hackathon](https://www.walrus.xyz/haulout) - Official hackathon website
- [Walrus Haulout Hackathon Handbook](https://mystenlabs.notion.site/Walrus-Haulout-Hackathon-Participant-Handbook-2886d9dcb4e980e2adc1d047a95dfef8) - Participant handbook
- [DeepSurge](https://deepsurge.io/) - Hackathon registration and submission portal

### Documentation
- [Sui Documentation](https://docs.sui.io/)
- [Walrus Documentation](https://walrus.wal.app/)
- [Seal Documentation](https://seal-docs.wal.app/)

## 📝 Contributing

This documentation is maintained alongside the codebase. When making changes:

1. Update relevant documentation files
2. Keep examples up-to-date with code changes
3. Add migration notes for breaking changes

---

**Note**: This documentation is designed for the Walrus Haulout Hackathon. For production deployment, additional security and configuration considerations apply.

