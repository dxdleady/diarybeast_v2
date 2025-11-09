/**
 * Sui Explorer utilities for generating blockchain explorer links
 */

/**
 * Get Sui Explorer URL for a transaction
 * Uses suiscan.xyz (correct explorer)
 * @param txDigest - Transaction digest
 * @param network - Network ('testnet' | 'mainnet')
 * @returns Explorer URL
 */
export function getSuiExplorerTxUrl(
  txDigest: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): string {
  if (network === 'mainnet') {
    return `https://suiscan.xyz/mainnet/tx/${txDigest}`;
  }
  return `https://suiscan.xyz/testnet/tx/${txDigest}`;
}

/**
 * Get Sui Explorer URL for an object
 * Uses suiscan.xyz (correct explorer)
 * @param objectId - Object ID
 * @param network - Network ('testnet' | 'mainnet')
 * @returns Explorer URL
 */
export function getSuiExplorerObjectUrl(
  objectId: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): string {
  if (network === 'mainnet') {
    return `https://suiscan.xyz/mainnet/object/${objectId}`;
  }
  return `https://suiscan.xyz/testnet/object/${objectId}`;
}

/**
 * Get Sui Explorer URL for an account/address
 * Uses suiscan.xyz (correct explorer)
 * Shows all transactions for the address
 * @param address - Account address
 * @param network - Network ('testnet' | 'mainnet')
 * @returns Explorer URL
 */
export function getSuiExplorerAccountUrl(
  address: string,
  network: 'testnet' | 'mainnet' = 'testnet'
): string {
  if (network === 'mainnet') {
    return `https://suiscan.xyz/mainnet/account/${address}`;
  }
  return `https://suiscan.xyz/testnet/account/${address}`;
}

/**
 * Get explorer URL for a Walrus entry
 * Prefers transaction digest, falls back to blob object ID, then admin address
 * @param txDigest - Transaction digest (optional)
 * @param blobObjectId - Blob object ID (optional)
 * @param adminAddress - Admin address that created the blob (optional, fallback)
 * @param network - Network ('testnet' | 'mainnet')
 * @returns Explorer URL or null if none available
 */
export function getWalrusEntryExplorerUrl(
  txDigest?: string | null,
  blobObjectId?: string | null,
  adminAddress?: string | null,
  network: 'testnet' | 'mainnet' = 'testnet'
): string | null {
  // Prefer transaction digest (most specific)
  if (txDigest) {
    return getSuiExplorerTxUrl(txDigest, network);
  }
  // Fallback to blob object (shows object and creation transaction)
  if (blobObjectId) {
    return getSuiExplorerObjectUrl(blobObjectId, network);
  }
  // Final fallback: admin address (shows all transactions)
  if (adminAddress) {
    return getSuiExplorerAccountUrl(adminAddress, network);
  }
  return null;
}

/**
 * Format transaction digest for display (short version)
 * @param digest - Transaction digest
 * @returns Shortened digest (first 8 chars...last 8 chars)
 */
export function formatTxDigest(digest: string): string {
  if (digest.length <= 16) {
    return digest;
  }
  return `${digest.substring(0, 8)}...${digest.substring(digest.length - 8)}`;
}
