/**
 * Hybrid Encryption Module
 *
 * This module provides a hybrid encryption system that supports both:
 * 1. crypto-js (legacy) - for backward compatibility
 * 2. Seal (new) - for enhanced security with threshold-based decryption
 *
 * The system automatically uses Seal when configured, otherwise falls back to crypto-js.
 */

import { getEncryptionKey, encryptContent, decryptContent, hashContent } from '@/lib/encryption';
import { isSealEnabled, isSealConfigured } from './config';
import { encryptWithSeal, decryptWithSeal } from './encryption';
import type { SessionKey } from '@mysten/seal';
import {
  stringToUint8Array,
  uint8ArrayToString,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from './encryption';
import type { SealDecryptionOptions } from './encryption';

export type EncryptionMethod = 'crypto-js' | 'seal';

export interface HybridEncryptionResult {
  encryptedData: string; // Base64 encoded encrypted data
  method: EncryptionMethod;
  // Seal-specific fields
  sealEncryptedObject?: string; // Base64 encoded Seal encrypted object
  sealKey?: string; // Base64 encoded Seal key (for backup)
  sealPackageId?: string;
  sealId?: string;
  sealThreshold?: number;
  // crypto-js fields (for compatibility)
  contentHash: string;
  signature?: string;
}

export interface HybridDecryptionOptions {
  encryptedData: string;
  method: EncryptionMethod;
  walletAddress: string;
  // Seal-specific fields
  sealEncryptedObject?: string;
  sessionKey?: SessionKey;
  txBytes?: Uint8Array;
  sealId?: string;
  sealThreshold?: number; // Threshold used during encryption (should match encryption threshold)
}

/**
 * Encrypt data using the best available method (Seal if configured, otherwise crypto-js)
 *
 * @param content - Plaintext content to encrypt
 * @param walletAddress - User's wallet address (used as identity)
 * @param signature - Optional: Signature for content verification
 * @returns Encrypted data with metadata
 */
export async function hybridEncrypt(
  content: string,
  walletAddress: string,
  signature?: string
): Promise<HybridEncryptionResult> {
  // Check if Seal is available (enabled AND configured)
  if (isSealAvailable()) {
    try {
      const result = await encryptWithSealHybrid(content, walletAddress, signature);
      return result;
    } catch (error) {
      // Fall back to crypto-js
    }
  }

  // Use crypto-js (legacy method or when Seal is disabled/not configured)
  // This happens when:
  // 1. Seal is disabled (SEAL_ENABLED=false)
  // 2. Seal is not configured (missing package ID or key servers)
  // 3. Seal encryption failed (error during encryption)
  const result = await encryptWithCryptoJsHybrid(content, walletAddress, signature);
  return result;
}

/**
 * Decrypt data using the appropriate method based on encryption method
 *
 * @param options - Decryption options
 * @returns Decrypted plaintext content
 */
export async function hybridDecrypt(options: HybridDecryptionOptions): Promise<string> {
  if (options.method === 'seal') {
    if (!options.sealEncryptedObject || !options.sessionKey || !options.txBytes) {
      throw new Error('Seal decryption requires sealEncryptedObject, sessionKey, and txBytes');
    }

    try {
      const result = await decryptWithSealHybrid(options);
      return result;
    } catch (error) {
      throw error;
    }
  }

  // Use crypto-js (legacy method)
  return await decryptWithCryptoJsHybrid(options);
}

/**
 * Encrypt with Seal (hybrid wrapper)
 */
async function encryptWithSealHybrid(
  content: string,
  walletAddress: string,
  signature?: string
): Promise<HybridEncryptionResult> {
  const data = stringToUint8Array(content);
  const encrypted = await encryptWithSeal(data, walletAddress);

  // Generate content hash for verification
  const contentHash = hashContent(content);

  return {
    encryptedData: uint8ArrayToBase64(encrypted.encryptedObject), // Store Seal encrypted object
    method: 'seal',
    sealEncryptedObject: uint8ArrayToBase64(encrypted.encryptedObject),
    sealKey: uint8ArrayToBase64(encrypted.key), // Backup key (should be stored securely)
    sealPackageId: encrypted.packageId,
    sealId: encrypted.id,
    sealThreshold: encrypted.threshold,
    contentHash,
    signature,
  };
}

/**
 * Decrypt with Seal (hybrid wrapper)
 */
async function decryptWithSealHybrid(options: HybridDecryptionOptions): Promise<string> {
  if (!options.sealEncryptedObject || !options.sessionKey || !options.txBytes || !options.sealId) {
    throw new Error('Missing required Seal decryption parameters');
  }

  if (!options.walletAddress) {
    throw new Error('Missing walletAddress (identity ID) for Seal decryption');
  }

  const encryptedObject = base64ToUint8Array(options.sealEncryptedObject);
  const txBytes = options.txBytes;

  // IMPORTANT: For fetchKeys, we need the identity ID (user address), not sealId
  // The identity ID is the address that was used for encryption
  // sealId is just a unique identifier for this encrypted object
  // Use sealThreshold from options (saved during encryption) to ensure consistency
  const decrypted = await decryptWithSeal({
    encryptedObject,
    sessionKey: options.sessionKey,
    txBytes,
    id: options.walletAddress, // Identity ID (user address), NOT sealId
    threshold: options.sealThreshold, // Use threshold from encryption (if provided)
  });

  return uint8ArrayToString(decrypted);
}

/**
 * Encrypt with crypto-js (legacy method)
 */
async function encryptWithCryptoJsHybrid(
  content: string,
  walletAddress: string,
  signature?: string
): Promise<HybridEncryptionResult> {
  const key = getEncryptionKey(walletAddress);
  const encrypted = encryptContent(content, key);
  const contentHash = hashContent(content);

  return {
    encryptedData: encrypted,
    method: 'crypto-js',
    contentHash,
    signature,
  };
}

/**
 * Decrypt with crypto-js (legacy method)
 */
async function decryptWithCryptoJsHybrid(options: HybridDecryptionOptions): Promise<string> {
  const key = getEncryptionKey(options.walletAddress);
  return decryptContent(options.encryptedData, key);
}

/**
 * Check if Seal is available and configured
 */
export function isSealAvailable(): boolean {
  return isSealConfigured();
}

/**
 * Get recommended encryption method
 */
export function getRecommendedEncryptionMethod(): EncryptionMethod {
  return isSealAvailable() ? 'seal' : 'crypto-js';
}
