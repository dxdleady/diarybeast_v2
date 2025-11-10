# Sui Blockchain Integration

DiaryBeast uses **Sui blockchain** for token economy, sponsored transactions, and access control.

## Overview

Sui is a high-performance blockchain that provides:
- **Move Smart Contracts**: Type-safe, secure smart contracts
- **Shared Objects**: Enable sponsored transactions
- **High Throughput**: Fast transaction processing
- **Low Gas Fees**: Cost-effective transactions

## Smart Contracts

### DiaryToken Contract

**Location**: `sui-contracts/diarybeast_token/sources/diary_token.move`

**Purpose**: Soul-bound token for rewards and gamification

**Key Features**:
- Soul-bound (non-transferable) tokens
- Admin can mint tokens to users
- Users can burn tokens for purchases
- TreasuryCap is a shared object (enables sponsored transactions)

**Functions**:

```move
// Mint tokens to user (admin only)
public entry fun mint_reward(
    _admin_cap: &AdminCap,
    treasury_cap: &mut TreasuryCap<DIARY_TOKEN>,
    amount: u64,
    recipient: address,
    ctx: &mut tx_context::TxContext
);

// Burn tokens from user (admin only)
public entry fun burn_from(
    _admin_cap: &AdminCap,
    treasury_cap: &mut TreasuryCap<DIARY_TOKEN>,
    user_coins: &mut Coin<DIARY_TOKEN>,
    amount: u64,
    ctx: &mut tx_context::TxContext
);

// User can burn their own tokens
public entry fun burn(
    treasury_cap: &mut TreasuryCap<DIARY_TOKEN>,
    user_coins: Coin<DIARY_TOKEN>,
);
```

**Package ID**: Configured via `NEXT_PUBLIC_SUI_PACKAGE_ID` (testnet) or `NEXT_PUBLIC_SUI_PACKAGE_ID_MAINNET` (mainnet)

### Seal Access Policies Contract

**Location**: `sui-contracts/diarybeast_seal_policies/sources/seal_policies.move`

**Purpose**: Access control for Seal encryption/decryption

**Key Features**:
- Access policies for user identities
- Onchain verification via `seal_approve`
- Policy Registry (shared object)

**Functions**:

```move
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

**Package ID**: Configured via `NEXT_PUBLIC_SEAL_PACKAGE_ID`

## Token Economy

### Earning Tokens

Users earn DiaryToken for:
- Writing diary entries (base reward)
- Maintaining streaks (bonus multipliers)
- Completing milestones (bonus rewards)

### Spending Tokens

Users spend DiaryToken for:
- Shop items (backgrounds, accessories, items)
- Pet food and care items

### Token Balance

Token balance is:
- Stored on-chain (Coin<DIARY_TOKEN> objects)
- Synced to database for fast queries
- Updated in real-time

## Sponsored Transactions

DiaryBeast uses **sponsored transactions** to provide a gas-free user experience:

### How It Works

1. User initiates transaction (e.g., burn tokens)
2. Server builds transaction
3. Admin signs and pays for gas
4. Transaction executed on-chain
5. User receives result

### Implementation

**Key Files**:
- `lib/sui/sponsored-transactions.ts` - Sponsored transaction handling
- `lib/sui/token.ts` - Token utilities
- `app/api/sponsored/*` - Sponsored transaction endpoints

**Example**:

```typescript
import { createUserBurnTransaction } from '@/lib/sui/sponsored-transactions';

// Build transaction
const tx = createUserBurnTransaction(
  packageId,
  treasuryCapId,
  userCoinId,
  amount,
  userAddress
);

// Admin signs and executes
const result = await client.signAndExecuteTransactionBlock({
  signer: adminKeypair,
  transactionBlock: tx,
});
```

## Wallet Integration

### @mysten/dapp-kit

DiaryBeast uses `@mysten/dapp-kit` for wallet integration:

- **Wallet Connection**: Connect Sui wallets
- **Personal Message Signing**: Sign messages for authentication
- **Transaction Signing**: Sign transactions (for Seal decryption)

**Key Files**:
- `app/providers.tsx` - Wallet provider setup
- `components/WalletConnect.tsx` - Wallet connection component

## Configuration

### Environment Variables

```bash
# Sui Network
NEXT_PUBLIC_SUI_NETWORK=testnet # or 'mainnet'

# Token Contract (testnet)
NEXT_PUBLIC_SUI_PACKAGE_ID=0x...
NEXT_PUBLIC_SUI_TREASURY_CAP_ID=0x...
NEXT_PUBLIC_SUI_ADMIN_CAP_ID=0x...

# Token Contract (mainnet)
NEXT_PUBLIC_SUI_PACKAGE_ID_MAINNET=0x...
NEXT_PUBLIC_SUI_TREASURY_CAP_ID_MAINNET=0x...
NEXT_PUBLIC_SUI_ADMIN_CAP_ID_MAINNET=0x...

# Admin Private Key (for sponsored transactions)
SUI_ADMIN_PRIVATE_KEY=suiprivkey1... # or base64 encoded
```

### Network Configuration

- **Testnet**: `https://fullnode.testnet.sui.io:443`
- **Mainnet**: `https://fullnode.mainnet.sui.io:443`

## Token Utilities

### Get User Balance

```typescript
import { getUserTokenBalance } from '@/lib/sui/token';

const balance = await getUserTokenBalance(userAddress, packageId);
```

### Mint Tokens

```typescript
import { mintTokens } from '@/lib/sui/token';

const txHash = await mintTokens(userAddress, amount);
```

### Burn Tokens

```typescript
import { burnTokens } from '@/lib/sui/token';

const txHash = await burnTokens(userAddress, amount);
```

## Deployment

### Deploy Token Contract

```bash
cd sui-contracts/diarybeast_token
sui client publish --gas-budget 100000000
```

### Deploy Seal Policies Contract

```bash
cd sui-contracts/diarybeast_seal_policies
sui client publish --gas-budget 100000000
```

### Update Environment Variables

After deployment, update environment variables with:
- Package ID
- TreasuryCap ID
- AdminCap ID
- Policy Registry ID (for Seal)

## Troubleshooting

### "Missing Sui token configuration"

- Verify `NEXT_PUBLIC_SUI_PACKAGE_ID` is set
- Verify `NEXT_PUBLIC_SUI_TREASURY_CAP_ID` is set
- Verify `NEXT_PUBLIC_SUI_ADMIN_CAP_ID` is set
- Check network matches (testnet/mainnet)

### "Transaction failed"

- Verify admin has SUI for gas
- Check TreasuryCap is shared object
- Verify AdminCap owner matches admin address
- Check transaction parameters

### "User balance not found"

- Verify user has Coin<DIARY_TOKEN> objects
- Check package ID matches deployed contract
- Verify network matches (testnet/mainnet)

## Resources

- [Sui Documentation](https://docs.sui.io/)
- [Move Language](https://move-language.github.io/move/)
- [Sui SDK](https://github.com/MystenLabs/sui/tree/main/sdk)
- [@mysten/dapp-kit](https://github.com/MystenLabs/sui/tree/main/sdk/dapp-kit)

