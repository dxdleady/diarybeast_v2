# DiaryBeast

Write in your diary daily to feed and evolve your personal beast. AI analyzes your emotions to unlock psychological archetypes, generate custom music, and reveal rare collectible creatures.

## 🚀 Features

- **Decentralized Storage**: Diary entries stored on Walrus (decentralized storage)
- **Blockchain Integration**: Sui blockchain for tokens and transactions
- **Sponsored Transactions**: Users don't pay gas fees (admin sponsors)
- **AI Analysis**: Weekly emotion analysis and insights
- **Gamification**: Pet system with rewards and streaks
- **End-to-End Encryption**: Client-side encryption for privacy

## 📚 Documentation

For detailed documentation, please visit the [docs](/docs) folder:

- [Project Overview](/docs/Project%20Overview.md)
- [Getting Started](/docs/Getting%20Started.md)
- [Technology Stack](/docs/Technology%20Stack%20&%20Dependencies.md)
- [Wallet Setup Guide](/docs/Wallet%20Setup%20Guide.md)
- [Data Models & Database Schema](/docs/Data%20Models%20&%20Database%20Schema.md)
- [Walrus Storage Integration](/docs/Walrus%20Storage%20Integration.md) 🆕

### Architecture
- [Component Architecture](/docs/Component%20Architecture)
- [State Management](/docs/State%20Management)
- [API Integration Layer](/docs/API%20Integration%20Layer)
- [Blockchain Integration](/docs/Blockchain%20Integration)

### Features
- [Gamification System](/docs/Gamification%20System)
- [Security & Encryption](/docs/Security%20&%20Encryption)
- [UI Components Library](/docs/UI%20Components%20Library)
- [Routing & Navigation](/docs/Routing%20&%20Navigation)
- [Walrus Storage Integration](/docs/Walrus%20Storage%20Integration.md) 🆕

## 🏗️ Architecture

### Storage
- **Walrus**: Decentralized storage for encrypted diary entries
- **PostgreSQL**: Metadata storage for fast queries
- **Hybrid Model**: Best of both worlds (decentralized + fast queries)

### Blockchain
- **Sui Blockchain**: Token economy and transactions
- **Sponsored Transactions**: Admin pays gas fees
- **Move Smart Contracts**: Token minting and burning

### Security
- **Client-Side Encryption**: Entries encrypted before upload
- **Deterministic Keys**: Keys derived from wallet address
- **Zero-Knowledge**: Server can decrypt for AI analysis

## 📊 Stage 4: Walrus Integration ✅

Stage 4 has been completed! Diary entries are now stored on Walrus decentralized storage.

### What Was Implemented
- ✅ Walrus SDK integration
- ✅ Upload relay configuration (payment in MIST/SUI)
- ✅ Hybrid storage (Walrus + PostgreSQL)
- ✅ Entry storage and retrieval
- ✅ Backward compatibility
- ✅ Error handling and fallbacks

### Documentation
- [Stage 4 Complete](./STAGE4_COMPLETE.md) - Completion summary
- [Stage 4 Plan](./STAGE4_WALRUS_STORAGE_PLAN.md) - Implementation plan
- [Stage 4 Summary](./STAGE4_SUMMARY.md) - Overview and architecture
- [Walrus Storage Integration](/docs/Walrus%20Storage%20Integration.md) - Detailed guide

### Diagrams
- [Sponsored Transactions](./diagrams/sponsored-transactions.excalidraw) - Move smart contract flow
- [Walrus Storage](./diagrams/walrus-storage.excalidraw) - Storage and payment flow
