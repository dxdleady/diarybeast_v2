/**
 * Walrus Client using TypeScript SDK
 * This client uses @mysten/walrus SDK to create transactions and pay with our signer
 * Instead of HTTP API which requires publisher to pay
 *
 * The SDK requires @mysten/sui (new package), but we're using @mysten/sui.js (old package)
 * We need to check compatibility or update dependencies
 */

import { walrus } from '@mysten/walrus';
// @mysten/walrus uses @mysten/sui (new package), which is installed as a dependency
// getFullnodeUrl and SuiClient (alias for SuiJsonRpcClient) are exported from @mysten/sui/client
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/sui/utils';

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
    console.error('[getAdminKeypair] Error:', error);
    return null;
  }
}

export interface WalrusUploadResponse {
  blobId: string;
  endEpoch: number;
  cost: number;
  txDigest?: string; // Transaction digest for blockchain verification
  blobObjectId?: string; // Blob object ID for explorer link
}

export interface WalrusBlob {
  blobId: string;
  data: Uint8Array;
  contentType?: string;
}

// Cache for client instances to avoid recreating them
// Key format: network-signerAddress to ensure clients are per-signer
// NOTE: We clear cache on each request to avoid issues with stale clients
let clientCache: Map<string, any> = new Map();

/**
 * Clear client cache (useful when signer changes or to avoid stale clients)
 */
function clearClientCache() {
  clientCache.clear();
}

/**
 * Get Walrus client instance
 * Uses the new @mysten/sui client extended with walrus SDK
 * Based on official documentation: https://docs.wal.app/
 *
 * IMPORTANT: Client is cached per network and signer address to avoid issues
 * with multiple signers or address changes
 */
function getWalrusClient(signerAddress?: string) {
  const network = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet';

  // Create cache key with signer address to avoid conflicts
  // If signer address is not provided, we'll create a new client (not cached)
  const cacheKey = signerAddress ? `${network}-${signerAddress}` : `${network}-${Date.now()}`;

  // Return cached client if available and signer address matches
  if (signerAddress && clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey);
  }

  try {
    // Get fullnode URL for the network
    const fullnodeUrl = getFullnodeUrl(network);

    // Create Sui client and extend with walrus
    // SuiClient is an alias for SuiJsonRpcClient in @mysten/sui/client
    const suiClient = new SuiClient({
      url: fullnodeUrl,
      network, // Required for walrus to work correctly
    });

    // Extend client with walrus SDK using upload relay
    // Upload relay simplifies uploads and requires tip in MIST (SUI), not WAL tokens!
    // Tip config: https://upload-relay.testnet.walrus.space/v1/tip-config
    // Returns: {"send_tip":{"address":"0x4b6a...","kind":{"const":105}}}
    // This means tip = 105 MIST (very little SUI) - we have SUI for gas!
    const extendedClient = suiClient.$extend(
      walrus({
        // Load WASM from CDN to avoid Next.js/Turbopack issues
        wasmUrl: 'https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm',
        // Use upload relay to simplify uploads and pay with SUI (not WAL tokens!)
        uploadRelay: {
          host: 'https://upload-relay.testnet.walrus.space',
          sendTip: {
            max: 1_000, // MIST (very little SUI - we have this for gas!)
          },
        },
      })
    );

    // Cache the client only if signer address is provided
    if (signerAddress) {
      clientCache.set(cacheKey, extendedClient);
    }

    return extendedClient;
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    throw new Error(
      `Failed to create Walrus client: ${errorMessage}. Make sure @mysten/walrus and @mysten/sui are installed.`
    );
  }
}

/**
 * Get signer keypair from admin private key
 * The signer must have WAL tokens to pay for storage
 */
function getSignerKeypair(): Ed25519Keypair {
  const adminKeypair = getAdminKeypair();
  if (!adminKeypair) {
    throw new Error('Signer keypair not available. SUI_ADMIN_PRIVATE_KEY required.');
  }
  return adminKeypair;
}

/**
 * Get signer from keypair (for SDK compatibility)
 */
function getSigner(): Signer {
  return getSignerKeypair();
}

/**
 * Upload data to Walrus using SDK
 * @param data - Data to upload (string or Uint8Array)
 * @param contentType - MIME type of the data
 * @param epochs - Number of epochs to store (default: 5)
 * @param network - Network to use ('testnet' | 'mainnet')
 * @param sendObjectTo - Optional: Address to send blob object to (for sponsored transactions)
 * @returns Upload response with blobId
 */
export async function uploadToWalrusSDK(
  data: string | Uint8Array,
  contentType: string = 'application/octet-stream',
  epochs: number = 5,
  network: 'testnet' | 'mainnet' = 'testnet',
  sendObjectTo?: string
): Promise<WalrusUploadResponse> {
  try {
    // Convert string to Uint8Array if needed
    const blobData = typeof data === 'string' ? new TextEncoder().encode(data) : data;

    // Clear cache to avoid using stale clients with wrong signer
    // This ensures we always use the current signer address
    clearClientCache();

    // Get signer first to ensure we have the correct address
    // This is important to avoid using cached client with wrong signer
    let signer;
    let signerAddress;
    try {
      signer = getSigner();
      signerAddress = getSignerKeypair().toSuiAddress();
    } catch (signerError: any) {
      console.error('[Walrus SDK] Failed to initialize signer:', signerError);
      throw new Error(
        `Failed to initialize signer: ${signerError.message}. Make sure SUI_ADMIN_PRIVATE_KEY is set.`
      );
    }

    // Get Walrus client (extended Sui client) with signer address for proper caching
    // Pass signer address to ensure client is created/cached for the correct signer
    let client;
    try {
      client = getWalrusClient(signerAddress);
    } catch (clientError: any) {
      console.error('[Walrus SDK] Failed to initialize client:', clientError);
      throw new Error(`Failed to initialize Walrus client: ${clientError.message}`);
    }

    // Upload blob using SDK
    // The SDK will create transactions and pay with our signer (address with WAL tokens)
    // writeBlob returns: { blobId, blobObject }
    // Note: walrus methods are available at client.walrus.*
    let result;
    try {
      result = await client.walrus.writeBlob({
        blob: blobData,
        epochs,
        deletable: true, // Allow deletion
        signer,
        // If sendObjectTo is specified, the blob object will be sent to that address
        // Otherwise, it will be owned by the signer
        ...(sendObjectTo ? { owner: sendObjectTo } : {}),
      });
    } catch (uploadError: any) {
      // Check if error message contains HTML (indicates wrong endpoint or server error)
      if (
        uploadError?.message?.includes('<!DOCTYPE') ||
        uploadError?.message?.includes('Unexpected token')
      ) {
        throw new Error(
          `Walrus SDK received HTML response instead of JSON. This usually means:\n` +
            `1. Network URL is incorrect\n` +
            `2. Storage nodes are unavailable\n` +
            `3. SDK configuration is wrong\n` +
            `Original error: ${uploadError.message}`
        );
      }

      // Check for specific error types
      if (uploadError?.message?.includes('WAL') || uploadError?.message?.includes('balance')) {
        throw new Error(
          `Insufficient WAL tokens. The signer address (${signerAddress}) needs WAL tokens to pay for storage. ` +
            `Error: ${uploadError.message}`
        );
      }

      throw new Error(`Walrus upload failed: ${uploadError.message || uploadError}`);
    }

    // Extract end epoch from blob object storage
    const endEpoch = result.blobObject.storage.end_epoch;

    // Get blob object ID for explorer link
    // blobObject.id can be a string (object ID) or an object with id and transactionDigest
    let blobObjectId: string | undefined;
    let txDigest: string | undefined;

    if (result.blobObject?.id) {
      if (typeof result.blobObject.id === 'string') {
        // Simple string ID
        blobObjectId = result.blobObject.id;
      } else if (result.blobObject.id.id) {
        // Object with id property
        blobObjectId = result.blobObject.id.id;
        // Check for transaction digest in the object
        if (result.blobObject.id.transactionDigest) {
          txDigest = result.blobObject.id.transactionDigest;
        } else if (result.blobObject.id.digest) {
          txDigest = result.blobObject.id.digest;
        }
      }
    }

    // Try to get transaction digest from result object directly
    if (!txDigest) {
      if ((result as any).txDigest) {
        txDigest = (result as any).txDigest;
      } else if ((result as any).digest) {
        txDigest = (result as any).digest;
      } else if ((result as any).transactionDigest) {
        txDigest = (result as any).transactionDigest;
      }
    }

    // If we have blobObjectId but no txDigest, try to get it from Sui client
    // Get transaction digest from object's previous transaction
    if (!txDigest && blobObjectId && client) {
      try {
        const objectInfo = await client.getObject({
          id: blobObjectId,
          options: {
            showPreviousTransaction: true,
          },
        });

        // Get transaction digest from object's previous transaction
        if (objectInfo.data?.previousTransaction) {
          txDigest = objectInfo.data.previousTransaction;
        }
      } catch (error) {
        // If we can't get transaction digest, continue without it
        // We'll use blobObjectId or admin address for explorer link
      }
    }

    return {
      blobId: result.blobId,
      endEpoch,
      cost: 0, // Cost is paid by signer, we don't track it here
      txDigest, // Transaction digest if available
      blobObjectId, // Blob object ID for explorer link
    };
  } catch (error: any) {
    // Re-throw if it's already our formatted error
    if (error.message && error.message.includes('Walrus')) {
      throw error;
    }
    console.error('[Walrus SDK] Upload error:', error?.message || error);
    throw new Error(`Walrus upload failed: ${error.message || error}`);
  }
}

/**
 * Download data from Walrus using SDK
 * @param blobId - Blob ID to download
 * @param network - Network to use ('testnet' | 'mainnet')
 * @returns Blob data
 */
export async function downloadFromWalrusSDK(
  blobId: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<WalrusBlob> {
  try {
    // Get signer address for client caching (downloads don't need signer, but for consistency)
    // NOTE: Downloads don't clear cache - we only clear cache for uploads to avoid stale clients
    let signerAddress: string | undefined;
    try {
      signerAddress = getSignerKeypair().toSuiAddress();
    } catch {
      // Signer not required for downloads, but if available, use it for caching
    }

    const client = getWalrusClient(signerAddress);

    // Read blob using SDK
    // readBlob returns Uint8Array
    // Note: walrus methods are available at client.walrus.*
    const blobData = await client.walrus.readBlob({ blobId });

    return {
      blobId,
      data: blobData,
      contentType: 'application/octet-stream',
    };
  } catch (error: any) {
    console.error('Walrus SDK download error:', error);
    throw new Error(`Walrus download failed: ${error.message}`);
  }
}

/**
 * Check if blob exists in Walrus
 * @param blobId - Blob ID to check
 * @param network - Network to use ('testnet' | 'mainnet')
 * @returns True if blob exists
 */
export async function blobExistsSDK(
  blobId: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): Promise<boolean> {
  try {
    // Use download function which handles client initialization properly
    await downloadFromWalrusSDK(blobId, network);
    return true;
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return false;
    }
    // Re-throw other errors
    throw error;
  }
}
