# API Reference

Complete API documentation for DiaryBeast.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All API endpoints require wallet-based authentication:
- User signs a personal message with their wallet
- Signature is verified server-side
- Wallet address is used as user identifier

## Endpoints

### Entries

#### Create Entry

**POST** `/api/entries`

Create a new diary entry.

**Request Body**:
```json
{
  "userAddress": "0x...",
  "encryptedContent": "base64-encoded-encrypted-content",
  "signature": "signature-string",
  "contentHash": "hash-string",
  "wordCount": 100,
  "messageBytes": "base64-encoded-message",
  "encryptionMethod": "crypto-js" | "seal",
  "sealEncryptedObject": "base64-encoded-seal-object", // Optional
  "sealKey": "base64-encoded-seal-key", // Optional
  "sealPackageId": "0x...", // Optional
  "sealId": "0x...", // Optional
  "sealThreshold": 2 // Optional
}
```

**Response**:
```json
{
  "success": true,
  "entry": {
    "id": "entry-id",
    "date": "2024-01-01T00:00:00.000Z",
    "blobId": "walrus-blob-id",
    "txDigest": "transaction-digest"
  },
  "reward": 10,
  "streakBonus": 5,
  "newStreak": 3
}
```

#### Get Entry

**GET** `/api/entries/[id]`

Get a diary entry by ID.

**Response**:
```json
{
  "id": "entry-id",
  "encryptedContent": "base64-encoded-encrypted-content",
  "signature": "signature-string",
  "contentHash": "hash-string",
  "wordCount": 100,
  "date": "2024-01-01T00:00:00.000Z",
  "method": "crypto-js" | "seal",
  "sealEncryptedObject": "base64-encoded-seal-object", // Optional
  "sealPackageId": "0x...", // Optional
  "sealId": "0x...", // Optional
  "sealThreshold": 2 // Optional
}
```

### User

#### Get User

**GET** `/api/user/[address]`

Get user profile and stats.

**Response**:
```json
{
  "id": "user-id",
  "walletAddress": "0x...",
  "coinsBalance": 100,
  "livesRemaining": 7,
  "currentStreak": 3,
  "longestStreak": 5,
  "happiness": 100,
  "petState": "idle",
  "totalEntries": 10
}
```

#### Update User

**PATCH** `/api/user/[address]`

Update user profile.

**Request Body**:
```json
{
  "userName": "John",
  "petName": "Fluffy",
  "selectedAnimal": "cat"
}
```

### Summary

#### Generate Summary

**POST** `/api/summary/generate`

Generate AI summary for a week.

**Request Body**:
```json
{
  "userAddress": "0x...",
  "weekStart": "2024-01-01T00:00:00.000Z",
  "weekEnd": "2024-01-07T23:59:59.999Z"
}
```

**Response**:
```json
{
  "summary": {
    "id": "summary-id",
    "emotions": {
      "joy": 0.8,
      "sadness": 0.2,
      "anger": 0.1
    },
    "insights": "Weekly insights...",
    "trend": "improving"
  }
}
```

#### Get Summary History

**GET** `/api/summary/history?userAddress=0x...`

Get summary history for user.

**Response**:
```json
{
  "summaries": [
    {
      "id": "summary-id",
      "weekStart": "2024-01-01T00:00:00.000Z",
      "weekEnd": "2024-01-07T23:59:59.999Z",
      "createdAt": "2024-01-08T00:00:00.000Z"
    }
  ]
}
```

### Shop

#### Get Items

**GET** `/api/shop/items`

Get available shop items.

**Response**:
```json
{
  "items": [
    {
      "id": "item-id",
      "name": "Background",
      "type": "background",
      "price": 10,
      "image": "image-url"
    }
  ]
}
```

#### Purchase Item

**POST** `/api/shop/purchase`

Purchase a shop item.

**Request Body**:
```json
{
  "userAddress": "0x...",
  "itemType": "background",
  "itemId": "item-id"
}
```

**Response**:
```json
{
  "success": true,
  "purchase": {
    "id": "purchase-id",
    "itemType": "background",
    "itemId": "item-id",
    "price": 10,
    "txHash": "transaction-hash"
  }
}
```

### Sponsored Transactions

#### Burn Tokens

**POST** `/api/sponsored/burn`

Sponsored burn transaction (admin pays gas).

**Request Body**:
```json
{
  "userAddress": "0x...",
  "amount": 10
}
```

**Response**:
```json
{
  "success": true,
  "txHash": "transaction-hash",
  "digest": "transaction-digest"
}
```

### Pet

#### Feed Pet

**POST** `/api/pet/feed`

Feed the pet.

**Request Body**:
```json
{
  "userAddress": "0x...",
  "foodType": "meat"
}
```

**Response**:
```json
{
  "success": true,
  "happiness": 100,
  "petState": "happy"
}
```

#### Use Item

**POST** `/api/pet/use-item`

Use an item from inventory.

**Request Body**:
```json
{
  "userAddress": "0x...",
  "itemType": "healthPotion"
}
```

## Error Responses

### 400 Bad Request

```json
{
  "error": "Missing required fields"
}
```

### 401 Unauthorized

```json
{
  "error": "Invalid signature"
}
```

### 404 Not Found

```json
{
  "error": "User not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "Failed to process request",
  "details": "Error details"
}
```

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authentication endpoints**: 10 requests per minute per IP

## CORS

- **Allowed Origins**: Configured in `next.config.ts`
- **Methods**: GET, POST, PATCH, DELETE
- **Headers**: Content-Type, Authorization

## Webhooks

Currently not implemented. Future feature for:
- Entry creation notifications
- Summary generation completion
- Transaction confirmations

## Resources

- [Development Guide](./Development.md) - Development workflow
- [Architecture](./Architecture.md) - System architecture

