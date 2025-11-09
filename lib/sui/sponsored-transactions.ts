/**
 * Sponsored Transactions - Admin pays gas, user signs transaction
 *
 * This module implements sponsored transactions for burning user tokens.
 * The flow:
 * 1. User creates transaction to burn their tokens (without gas)
 * 2. Admin sponsors the transaction by adding gas payment
 * 3. Both user and admin sign the transaction
 * 4. Transaction is executed
 */

import { TransactionBlock } from '@mysten/sui.js/transactions';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64, toB64 } from '@mysten/sui.js/utils';
const DIARY_TOKEN_DECIMALS = 9;
const MODULE_NAME = 'diary_token';

// Helper to decode bech32 suiprivkey format
function decodeSuiprivkey(suiprivkey: string): Uint8Array {
  const bech32 = require('bech32');
  const decoded = bech32.bech32.decode(suiprivkey);
  const words = decoded.words;
  const bytes = bech32.bech32.fromWords(words);
  return new Uint8Array(bytes.slice(0, 32));
}

function getAdminKeypair(): Ed25519Keypair | null {
  const privateKey = process.env.SUI_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    return null;
  }
  try {
    if (privateKey.startsWith('suiprivkey1')) {
      const secretKeyBytes = decodeSuiprivkey(privateKey);
      return Ed25519Keypair.fromSecretKey(secretKeyBytes);
    } else {
      return Ed25519Keypair.fromSecretKey(fromB64(privateKey));
    }
  } catch (error) {
    console.error(
      '[getAdminKeypair] Error:',
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
}

export function getSuiClient(): SuiClient {
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
  return new SuiClient({ url: getFullnodeUrl(network as 'testnet' | 'mainnet') });
}

export function getTokenConfig() {
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

  if (!packageId || !treasuryCapId) {
    throw new Error(
      'Missing Sui token configuration in environment variables (packageId, treasuryCapId required)'
    );
  }

  // adminCapId is optional (not needed for burn function, only for burn_from)
  return { packageId, treasuryCapId, adminCapId: adminCapId || undefined };
}

/**
 * Create a user-initiated transaction to burn user's tokens (without gas)
 *
 * According to Sui documentation on user-initiated sponsored transactions:
 * 1. User creates GasLessTransactionData (TransactionKind without GasData)
 * 2. User sends GasLessTransactionData to sponsor
 * 3. Sponsor validates, constructs TransactionData with GasData, signs it
 * 4. Sponsor returns sole-signed SenderSignedData to user
 * 5. User signs and submits dual-signed transaction
 *
 * IMPORTANT: In user-initiated transactions:
 * - sender = user - user initiates the transaction
 * - gas_data.owner = sponsor (admin) - sponsor pays for gas
 * - User signs because they are sender and own userCoinId
 * - Sponsor signs only for gas payment (gasOwner), NOT for TreasuryCap
 *
 * NOTE: TreasuryCap is now a shared object, so it doesn't require owner signature.
 * This enables true user-initiated sponsored transactions where:
 * - All objects in transaction belong to sender (user)
 * - Sponsor only pays for gas (gasOwner)
 * - Only one signature needed from user (as sender)
 * - Only one signature needed from sponsor (as gasOwner)
 */
export function createUserBurnTransaction(
  packageId: string,
  treasuryCapId: string,
  userCoinId: string,
  amount: number,
  userAddress: string
): TransactionBlock {
  const tx = new TransactionBlock();

  // Set sender to user address (user initiates the transaction)
  // According to Sui docs for user-initiated: sender is the user
  tx.setSender(userAddress);

  // Convert amount to base units (9 decimals)
  const amountInBaseUnits = BigInt(Math.floor(amount * 10 ** DIARY_TOKEN_DECIMALS));
  const amountU64 = Number(amountInBaseUnits);

  // Split user's coin to get the exact amount to burn
  // splitCoins returns a TransactionResult that represents the split coin(s)
  // When we pass [amount], it returns a single split coin with that amount
  // The original coin's balance is reduced by the split amount
  const coinToBurn = tx.splitCoins(tx.object(userCoinId), [amountU64]);

  // User-initiated transaction to burn user's tokens using burn
  // Note:
  // - User is sender (initiates transaction)
  // - User must sign because they are sender and own userCoinId
  // - TreasuryCap is shared object, so no admin signature needed for the object itself
  // - Sponsor (admin) only needs to sign for gas payment (gasOwner)
  // - This enables true user-initiated sponsored transactions
  // For shared objects, use tx.object() - Sui SDK automatically detects shared objects by ID
  // TreasuryCap is now a shared object, so it doesn't require owner signature
  tx.moveCall({
    target: `${packageId}::${MODULE_NAME}::burn`,
    arguments: [
      tx.object(treasuryCapId), // TreasuryCap is shared object (no owner signature needed)
      coinToBurn, // User's split coin (requires user signature)
    ],
  });

  return tx;
}

/**
 * Sponsor a user-initiated transaction: add gas payment and sign as sponsor
 *
 * According to Sui documentation on user-initiated sponsored transactions:
 * 1. User creates GasLessTransactionData (TransactionKind without GasData)
 * 2. User sends GasLessTransactionData to sponsor (this function)
 * 3. Sponsor validates, constructs TransactionData with GasData, signs it
 * 4. Sponsor returns sole-signed SenderSignedData to user
 * 5. User signs and submits dual-signed transaction
 *
 * IMPORTANT: In user-initiated transactions:
 * - sender = user - user initiates the transaction
 * - gas_data.owner = sponsor (admin) - sponsor pays for gas
 * - User signs because they are sender and own userCoinId
 * - Sponsor signs because they own TreasuryCap and pay for gas
 *
 * GasData structure:
 * - payment: Vec<ObjectRef> - gas coins to pay for transaction
 * - owner: SuiAddress - who pays for gas (sponsor/admin)
 * - price: u64 - gas price
 * - budget: u64 - gas budget
 *
 * Returns the sponsored transaction bytes and sponsor signature (sole-signed SenderSignedData)
 */
export async function sponsorTransaction(
  transactionKindBytes: Uint8Array,
  userAddress: string
): Promise<{
  transactionBytes: string;
  sponsorSignature: string;
}> {
  const adminKeypair = getAdminKeypair();
  if (!adminKeypair) {
    throw new Error('Admin keypair not available');
  }

  const adminAddress = adminKeypair.toSuiAddress();
  const client = getSuiClient();

  const sponsoredTx = TransactionBlock.fromKind(transactionKindBytes);
  sponsoredTx.setSender(userAddress);
  sponsoredTx.setGasOwner(adminAddress);

  const gasObjects = await client.getCoins({
    owner: adminAddress,
    coinType: '0x2::sui::SUI',
  });

  if (gasObjects.data.length === 0) {
    throw new Error('Admin has no SUI coins for gas payment');
  }

  const gasCoin = gasObjects.data[0];
  sponsoredTx.setGasPayment([
    {
      objectId: gasCoin.coinObjectId,
      version: gasCoin.version,
      digest: gasCoin.digest,
    },
  ]);

  sponsoredTx.setGasBudget(10000000);

  const transactionBytes = await sponsoredTx.build({ client });
  const sponsorSignResult = await adminKeypair.signTransactionBlock(transactionBytes);

  return {
    transactionBytes: toB64(transactionBytes),
    sponsorSignature: sponsorSignResult.signature,
  };
}

/**
 * Execute a dual-signed sponsored transaction (user-initiated)
 *
 * According to Sui documentation on user-initiated sponsored transactions:
 * 1. User creates GasLessTransactionData and sends it to sponsor
 * 2. Sponsor validates, constructs TransactionData with GasData, signs it
 * 3. Sponsor returns sole-signed SenderSignedData to user
 * 4. User verifies and signs TransactionData
 * 5. User submits dual-signed TransactionData to Sui network
 *
 * Both user and sponsor must sign the same TransactionData:
 * - User signs because they are sender and own objects used in the transaction (userCoinId)
 * - Sponsor signs because they pay for gas (GasData.owner = sponsor)
 * - TreasuryCap is shared object, so it doesn't require owner signature
 * - Only gas coins require sponsor's signature (as gasOwner)
 *
 * @param transactionBytes - Full TransactionData with GasData (base64 string from sponsorTransaction)
 * @param userSignature - User's signature on TransactionData (base64 encoded)
 * @param sponsorSignature - Sponsor's signature on TransactionData (base64 encoded)
 */
export async function executeSponsoredTransaction(
  transactionBytes: Uint8Array | string,
  userSignature: string,
  sponsorSignature: string
): Promise<string> {
  const client = getSuiClient();

  let txBytesBase64: string;
  if (typeof transactionBytes === 'string') {
    txBytesBase64 = transactionBytes;
  } else {
    txBytesBase64 = toB64(transactionBytes);
  }

  try {
    const result = await client.executeTransactionBlock({
      transactionBlock: txBytesBase64,
      signature: [userSignature, sponsorSignature],
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    if (result.digest && result.effects?.status?.status === 'success') {
      return result.digest;
    } else if (result.digest) {
      const errorDetails = result.effects?.status?.error || result.effects?.status;
      throw new Error(`Transaction failed: ${JSON.stringify(errorDetails)}`);
    }

    throw new Error('Transaction executed but no digest returned');
  } catch (error) {
    console.error(
      '[executeSponsoredTransaction] Error:',
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
