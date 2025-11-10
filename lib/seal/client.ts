/**
 * Seal Client
 *
 * This module provides a Seal client for identity-based encryption and decryption.
 * Seal enables threshold-based decryption with key servers and onchain policies.
 *
 * Documentation: https://seal-docs.wal.app
 */

import { SealClient, type SealClientOptions, type SealCompatibleClient } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { sealConfig, getKeyServerConfigs } from './config';

// Cache for Seal client instances
let sealClient: SealClient | null = null;
let suiClient: SuiCompatibleClient | null = null;

/**
 * Get or create a Sui client compatible with Seal
 * Exported for use in other modules (e.g., session-key.ts)
 */
export function getSuiClient(): SealCompatibleClient {
  if (suiClient) {
    return suiClient;
  }

  const network = sealConfig.network;
  const fullnodeUrl = getFullnodeUrl(network);

  // Create Sui client
  suiClient = new SuiClient({
    url: fullnodeUrl,
  }) as SealCompatibleClient;

  return suiClient;
}

/**
 * Get or create a Seal client instance
 *
 * The client is cached to avoid recreating it on every request.
 * Key servers must be configured before using the client.
 */
export function getSealClient(): SealClient {
  if (sealClient) {
    return sealClient;
  }

  const keyServerConfigs = getKeyServerConfigs();

  if (keyServerConfigs.length === 0) {
    throw new Error(
      'No key servers configured. Please configure key servers in lib/seal/config.ts or environment variables.'
    );
  }

  const suiClient = getSuiClient();

  const options: SealClientOptions = {
    suiClient,
    serverConfigs: keyServerConfigs,
    verifyKeyServers: sealConfig.verifyKeyServers,
    timeout: sealConfig.timeout,
  };

  sealClient = new SealClient(options);
  return sealClient;
}

/**
 * Clear the cached Seal client
 * Useful when configuration changes or for testing
 */
export function clearSealClient(): void {
  sealClient = null;
  suiClient = null;
}

/**
 * Check if Seal is properly configured
 * Re-exported from config.ts for convenience
 */
export { isSealConfigured } from './config';

// Type alias for Seal-compatible Sui client
type SuiCompatibleClient = SealCompatibleClient;
