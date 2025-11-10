# DiaryBeast

Write in your diary daily to feed and evolve your personal beast. AI analyzes your emotions to unlock psychological archetypes, generate custom music, and reveal rare collectible creatures.

## 🚀 Features

- **Decentralized Storage**: Diary entries stored on Walrus (decentralized storage)
- **Blockchain Integration**: Sui blockchain for tokens and transactions
- **Sponsored Transactions**: Users don't pay gas fees (admin sponsors)
- **AI Analysis**: Weekly emotion analysis and insights
- **Gamification**: Pet system with rewards and streaks
- **End-to-End Encryption**: Client-side encryption for privacy (crypto-js by default)
- **Optional Seal Encryption**: Enhanced privacy with threshold-based encryption (user choice)

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
- **Deterministic Keys**: Keys derived from wallet address (crypto-js)
- **Optional Seal Encryption**: Enhanced privacy with threshold-based encryption (user choice)
- **AI Analysis**: Server can decrypt crypto-js entries for AI analysis; Seal-encrypted entries excluded

### How It Works

**Default Encryption (crypto-js):**
- All entries are encrypted with crypto-js by default
- Server can decrypt for AI analysis
- Fast and simple

**Optional Seal Encryption:**
- Users can enable Seal encryption per entry via checkbox in the editor
- Entry is encrypted with distributed key servers
- **Only the user can decrypt** by signing with their wallet
- **No one else, including the server, can read it** without the user's signature
- Stored differently in the database
- **Excluded from AI analysis** (for maximum privacy)

### Configuration

Seal is **optional** and can be enabled/disabled via environment variables:
- `SEAL_ENABLED` - Enable/disable Seal (default: true)
- `NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID` - Official Seal package ID
- `NEXT_PUBLIC_SEAL_PACKAGE_ID` - Access policies package ID
- `SEAL_POLICY_REGISTRY_ID` - Policy Registry object ID
- `SEAL_KEY_SERVER_OBJECT_IDS` - Key server object IDs (comma-separated)
- `SEAL_DEFAULT_THRESHOLD` - Threshold for decryption (default: 2)

See [Seal Setup Guide](./lib/seal/SETUP.md) for detailed configuration.

### Documentation
- [Seal README](./lib/seal/README.md) - Seal integration documentation
- [Seal Setup Guide](./lib/seal/SETUP.md) - Setup instructions
- [Seal Test Scripts](./scripts/seal-tests/README.md) - Test scripts documentation
