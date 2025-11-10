# Development Guide

Guide for developers working on DiaryBeast.

## Getting Started

### 1. Clone and Setup

```bash
git clone <repository-url>
cd diarybeast_v2
pnpm install
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 2. Database Setup

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

### 3. Start Development Server

```bash
pnpm dev
```

## Project Structure

```
diarybeast_v2/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── diary/             # Diary pages
│   └── ...
├── components/             # React components
├── lib/                    # Utility libraries
│   ├── sui/               # Sui blockchain utilities
│   ├── walrus/            # Walrus storage
│   ├── seal/              # Seal encryption
│   └── ...
├── sui-contracts/          # Move smart contracts
│   ├── diarybeast_token/
│   └── diarybeast_seal_policies/
├── prisma/                 # Database schema
└── scripts/                # Utility scripts
```

## Development Workflow

### 1. Feature Development

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes
3. Test locally
4. Commit changes: `git commit -m "feat: your feature"`
5. Push and create PR

### 2. Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for Next.js
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format

### 3. Testing

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests
pnpm test:e2e
```

## Key Development Areas

### Frontend Development

**Components**:
- `components/TextEditor.tsx` - Rich text editor
- `components/EntryViewer.tsx` - Entry display
- `components/WeeklyHistory.tsx` - Weekly history
- `components/Pet.tsx` - Pet display

**State Management**:
- Zustand stores in `lib/stores/`
- React Context for global state

**Styling**:
- Tailwind CSS
- Custom components in `components/`

### Backend Development

**API Routes**:
- `app/api/entries/` - Entry CRUD
- `app/api/summary/` - AI summaries
- `app/api/shop/` - Shop operations
- `app/api/sponsored/` - Sponsored transactions

**Utilities**:
- `lib/sui/token.ts` - Token operations
- `lib/walrus/client-sdk.ts` - Walrus operations
- `lib/seal/encryption.ts` - Seal operations

### Smart Contract Development

**Move Contracts**:
- `sui-contracts/diarybeast_token/` - Token contract
- `sui-contracts/diarybeast_seal_policies/` - Access policies

**Testing**:
```bash
cd sui-contracts/diarybeast_token
sui move test
```

## Common Tasks

### Add New API Endpoint

1. Create file in `app/api/your-endpoint/route.ts`
2. Export handler functions (GET, POST, etc.)
3. Add to API documentation

### Add New Component

1. Create file in `components/YourComponent.tsx`
2. Export component
3. Add TypeScript types
4. Add to Storybook (optional)

### Update Database Schema

1. Edit `prisma/schema.prisma`
2. Create migration: `pnpm prisma migrate dev --name your-migration`
3. Generate client: `pnpm prisma generate`

### Deploy Smart Contract

1. Update contract in `sui-contracts/`
2. Test: `sui move test`
3. Deploy: `sui client publish --gas-budget 100000000`
4. Update environment variables

## Debugging

### Frontend Debugging

- **React DevTools**: Install browser extension
- **Next.js DevTools**: Built-in debugging
- **Console Logs**: Use `console.log` (remove in production)

### Backend Debugging

- **API Routes**: Check server logs
- **Database**: Use Prisma Studio: `pnpm prisma studio`
- **Blockchain**: Use Sui Explorer

### Seal Debugging

```bash
cd scripts/seal-tests
pnpm tsx test-seal-encryption.ts
pnpm tsx test-seal-shares.ts
```

## Performance Optimization

### Database Queries

- Use Prisma indexes
- Optimize queries (select only needed fields)
- Use connection pooling

### Frontend Optimization

- Code splitting (Next.js automatic)
- Image optimization (Next.js Image component)
- Lazy loading (React.lazy)

### Blockchain Optimization

- Batch transactions when possible
- Use sponsored transactions for users
- Cache on-chain data

## Security Best Practices

### Environment Variables

- Never commit `.env.local`
- Use `NEXT_PUBLIC_` prefix only for client-side variables
- Keep private keys secure

### Authentication

- Always verify wallet signatures
- Validate user addresses
- Check permissions before operations

### Encryption

- Use Seal for sensitive data (optional)
- Always encrypt before storing
- Never log encrypted content

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables set
- [ ] Database migrations applied
- [ ] Smart contracts deployed
- [ ] Documentation updated

### Vercel Deployment

1. Push to main branch
2. Vercel automatically deploys
3. Check deployment logs
4. Verify environment variables

## Troubleshooting

### "Module not found"

- Run `pnpm install`
- Check import paths
- Verify file exists

### "Database connection failed"

- Check `DATABASE_URL`
- Verify PostgreSQL is running
- Check network connectivity

### "Transaction failed"

- Check admin has SUI for gas
- Verify contract addresses
- Check transaction parameters

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Sui Documentation](https://docs.sui.io/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

