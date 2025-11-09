import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/sui.js/utils';

// Helper to decode bech32 suiprivkey format
// Note: bech32 is a CommonJS module, so we import it dynamically
export function decodeSuiprivkey(suiprivkey: string): Uint8Array {
  const bech32 = require('bech32');
  const decoded = bech32.bech32.decode(suiprivkey);
  const words = decoded.words;
  const bytes = bech32.bech32.fromWords(words);
  return new Uint8Array(bytes.slice(0, 32));
}

// Token configuration
const DIARY_TOKEN_DECIMALS = 9;
const MODULE_NAME = 'diary_token';

/**
 * Get Sui client for server-side operations
 */
function getSuiClient(): SuiClient {
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  return new SuiClient({ url: getFullnodeUrl(network as 'testnet' | 'mainnet') });
}

/**
 * Get admin keypair from environment variable
 * Supports two formats:
 * 1. Sui private key format (bech32): "suiprivkey1..." - RECOMMENDED
 * 2. Base64 encoded raw secret key (32 bytes): "base64string"
 */
function getAdminKeypair(): Ed25519Keypair | null {
  const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  try {
    if (privateKey.startsWith('suiprivkey1')) {
      const secretKeyBytes = decodeSuiprivkey(privateKey);
      if (secretKeyBytes.length !== 32) {
        throw new Error(
          `Invalid secret key length: expected 32 bytes, got ${secretKeyBytes.length}`
        );
      }
      return Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      const secretKeyBytes = fromB64(privateKey);
      if (secretKeyBytes.length !== 32) {
        throw new Error(
          `Invalid secret key length: expected 32 bytes, got ${secretKeyBytes.length}`
        );
      }
      return Ed25519Keypair.fromSecretKey(secretKeyBytes);
    }
  } catch (error) {
    console.error(
      '[getAdminKeypair] Error:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

/**
 * Get token configuration from environment variables
 */
function getTokenConfig() {
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  const packageId =
    network === 'mainnet'
      ? process.env.NEXT_PUBLIC_SUI_PACKAGE_ID_MAINNET
      : process.env.NEXT_PUBLIC_SUI_PACKAGE_ID;
  const treasuryCapId =
    network === 'mainnet'
      ? process.env.NEXT_PUBLIC_SUI_TREASURY_CAP_ID_MAINNET
      : process.env.NEXT_PUBLIC_SUI_TREASURY_CAP_ID;
  const adminCapId =
    network === 'mainnet'
      ? process.env.NEXT_PUBLIC_SUI_ADMIN_CAP_ID_MAINNET
      : process.env.NEXT_PUBLIC_SUI_ADMIN_CAP_ID;

  if (!packageId || !treasuryCapId || !adminCapId) {
    throw new Error('Missing Sui token configuration in environment variables');
  }

  return { packageId, treasuryCapId, adminCapId };
}

/**
 * Get user's token balance by querying all Coin<DIARY_TOKEN> objects
 */
export async function getUserTokenBalance(
  userAddress: string,
  packageId?: string
): Promise<number> {
  try {
    const client = getSuiClient();

    // If packageId not provided, get from config
    if (!packageId) {
      const config = getTokenConfig();
      packageId = config.packageId;
    }

    // Query for user's Coin<DIARY_TOKEN> objects
    const coinType = `${packageId}::diary_token::DIARY_TOKEN`;
    const objects = await client.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: `0x2::coin::Coin<${coinType}>`,
      },
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (!objects.data || objects.data.length === 0) {
      return 0;
    }

    // Sum all coin balances
    let totalBalance = 0;
    for (const obj of objects.data) {
      if (obj.data?.content && 'fields' in obj.data.content) {
        const fields = obj.data.content.fields as any;
        if (fields.balance) {
          totalBalance += parseInt(fields.balance, 10);
        }
      }
    }

    // Convert from base units to display units (9 decimals)
    return totalBalance / 10 ** DIARY_TOKEN_DECIMALS;
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

/**
 * Get user's Coin objects (for transaction building)
 * Exported for use in other modules
 */
export async function getUserCoins(userAddress: string, packageId?: string): Promise<string[]> {
  try {
    const client = getSuiClient();

    // If packageId not provided, get from config
    if (!packageId) {
      const config = getTokenConfig();
      packageId = config.packageId;
    }

    const coinType = `${packageId}::diary_token::DIARY_TOKEN`;

    const objects = await client.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: `0x2::coin::Coin<${coinType}>`,
      },
      options: {
        showType: true,
        showOwner: true,
      },
    });

    const userCoinIds: string[] = [];
    for (const obj of objects.data) {
      if (obj.data?.objectId) {
        if (obj.data.owner) {
          const owner = (obj.data.owner as any).AddressOwner;
          if (owner?.toLowerCase() === userAddress.toLowerCase()) {
            userCoinIds.push(obj.data.objectId);
          }
        } else {
          userCoinIds.push(obj.data.objectId);
        }
      }
    }

    return userCoinIds;
  } catch (error) {
    console.error('Error getting user coins:', error);
    return [];
  }
}

/**
 * Create transaction to mint tokens (admin only, server-side)
 * Now requires AdminCap since TreasuryCap is shared
 */
export function createMintRewardTx(
  packageId: string,
  treasuryCapId: string,
  adminCapId: string,
  amount: number,
  recipient: string
): TransactionBlock {
  const tx = new TransactionBlock();

  // Convert amount to base units (9 decimals)
  const amountInBaseUnits = BigInt(Math.floor(amount * 10 ** DIARY_TOKEN_DECIMALS));
  const amountU64 = Number(amountInBaseUnits);

  let normalizedRecipient = recipient.trim();
  if (!normalizedRecipient.startsWith('0x')) {
    normalizedRecipient = `0x${normalizedRecipient}`;
  }
  normalizedRecipient = normalizedRecipient.toLowerCase();
  tx.moveCall({
    target: `${packageId}::${MODULE_NAME}::mint_reward`,
    arguments: [
      tx.object(adminCapId), // AdminCap for authorization
      tx.object(treasuryCapId), // TreasuryCap is shared object (Sui SDK auto-detects by ID)
      tx.pure.u64(amountU64),
      tx.pure.address(normalizedRecipient), // Pass recipient address WITH 0x prefix (required by Sui SDK)
    ],
  });

  return tx;
}

/**
 * Create transaction to burn tokens from user (admin only, server-side)
 * Note: This requires the user's Coin object ID
 */
export function createBurnFromTx(
  packageId: string,
  treasuryCapId: string,
  adminCapId: string,
  userCoinId: string,
  amount: number
): TransactionBlock {
  const tx = new TransactionBlock();

  // Convert amount to base units (9 decimals)
  const amountInBaseUnits = BigInt(Math.floor(amount * 10 ** DIARY_TOKEN_DECIMALS));

  tx.moveCall({
    target: `${packageId}::${MODULE_NAME}::burn_from`,
    arguments: [
      tx.object(adminCapId),
      tx.object(treasuryCapId),
      tx.object(userCoinId),
      tx.pure.u64(Number(amountInBaseUnits)),
    ],
  });

  return tx;
}

/**
 * Mint tokens to a user (admin only, server-side)
 */
export async function mintTokens(userAddress: string, amount: number): Promise<string> {
  try {
    const keypair = getAdminKeypair();
    if (!keypair) {
      return 'mint_skipped_no_admin_key';
    }

    const adminAddress = keypair.toSuiAddress();
    const client = getSuiClient();
    const { packageId, treasuryCapId, adminCapId } = getTokenConfig();

    if (!adminCapId) {
      throw new Error('AdminCap ID is required for minting (TreasuryCap is now shared)');
    }

    let gasCoins: any[] = [];
    try {
      const gasObjects = await client.getCoins({
        owner: adminAddress,
        coinType: '0x2::sui::SUI',
      });
      gasCoins = gasObjects.data;
    } catch (error) {
      // Continue without explicit gas coins
    }

    // Create transaction with retry logic for version errors
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          try {
            const gasObjects = await client.getCoins({
              owner: adminAddress,
              coinType: '0x2::sui::SUI',
            });
            gasCoins = gasObjects.data;
          } catch (error) {
            // Continue without explicit gas coins
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }

        const tx = createMintRewardTx(packageId, treasuryCapId, adminCapId, amount, userAddress);

        if (gasCoins.length > 0) {
          const gasCoin = gasCoins[0];
          tx.setGasPayment([
            {
              objectId: gasCoin.coinObjectId,
              version: gasCoin.version,
              digest: gasCoin.digest,
            },
          ]);
        }

        const result = await client.signAndExecuteTransactionBlock({
          signer: keypair,
          transactionBlock: tx,
          options: {
            showEffects: true,
            showEvents: true,
          },
        });

        if (result.digest && result.effects?.status?.status === 'success') {
          return result.digest;
        } else if (result.digest) {
          return 'mint_failed_tx_error';
        }

        throw new Error('Transaction executed but no digest returned');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if this is a version error that can be retried
        const isVersionError =
          errorMessage.includes('not available for consumption') ||
          errorMessage.includes('current version') ||
          errorMessage.includes('Version');

        if (isVersionError && attempt < MAX_RETRIES) {
          continue;
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  } catch (error) {
    console.error('[mintTokens] Error:', error instanceof Error ? error.message : String(error));
    return 'mint_failed';
  }
}

/**
 * Burn tokens from a user (admin only, server-side)
 */
export async function burnTokens(userAddress: string, amount: number): Promise<string> {
  try {
    const keypair = getAdminKeypair();
    if (!keypair) {
      return 'burn_skipped_no_admin_key';
    }

    const adminAddress = keypair.toSuiAddress();
    const client = getSuiClient();
    const { packageId, treasuryCapId, adminCapId } = getTokenConfig();

    if (!adminCapId) {
      throw new Error('AdminCap ID is required');
    }

    const userCoins = await getUserCoins(userAddress, packageId);
    if (userCoins.length === 0) {
      return 'burn_skipped_no_coins';
    }

    const totalBalance = await getUserTokenBalance(userAddress, packageId);
    if (totalBalance < amount) {
      return 'burn_skipped_insufficient_balance';
    }

    const userCoinId = userCoins[0];

    try {
      const adminCapObject = await client.getObject({
        id: adminCapId,
        options: { showOwner: true },
      });

      if (adminCapObject.data?.owner) {
        const owner = (adminCapObject.data.owner as any).AddressOwner;
        if (owner !== adminAddress) {
          return 'burn_failed_wrong_owner';
        }
      }
    } catch (verifyError) {
      return 'burn_failed_verify_error';
    }

    const tx = createBurnFromTx(packageId, treasuryCapId, adminCapId, userCoinId, amount);
    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    if (result.digest && result.effects?.status?.status === 'success') {
      return result.digest;
    } else if (result.digest) {
      return 'burn_failed_tx_error';
    }

    throw new Error('Transaction executed but no digest returned');
  } catch (error) {
    console.error('[burnTokens] Error:', error instanceof Error ? error.message : String(error));
    return 'burn_failed';
  }
}

/**
 * Get token balance for a user (server-side)
 */
export async function getTokenBalance(userAddress: string): Promise<number> {
  try {
    return await getUserTokenBalance(userAddress);
  } catch (error) {
    console.error('Error getting token balance:', error);
    return 0;
  }
}

/**
 * Sync user balance from blockchain to database
 */
export async function syncUserBalance(userAddress: string, prisma: any): Promise<number> {
  try {
    // Get on-chain balance
    const onChainBalance = await getTokenBalance(userAddress);

    // Update database
    await prisma.user.update({
      where: { walletAddress: userAddress.toLowerCase() },
      data: { coinsBalance: onChainBalance },
    });

    return onChainBalance;
  } catch (error) {
    console.error('Error syncing user balance:', error);
    throw error;
  }
}
