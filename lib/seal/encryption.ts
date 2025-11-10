/**
 * Seal Encryption Module
 *
 * This module provides functions for encrypting and decrypting data using Seal.
 * Seal enables identity-based encryption with threshold-based decryption using key servers.
 *
 * IMPORTANT: This is a work in progress. Seal requires:
 * 1. Key servers configured on Sui (object IDs)
 * 2. Package ID for Seal policies
 * 3. SessionKey for authorization
 * 4. Transaction bytes for seal_approve functions
 *
 * Until these are configured, this module will fall back to crypto-js encryption.
 */

import { getSealClient, isSealConfigured } from './client';
import { sealConfig, getAccessPoliciesPackageId, getKeyServerConfigs } from './config';
import type { SessionKey } from '@mysten/seal';
import { DemType } from '@mysten/seal';
import { normalizeSuiObjectId } from '@mysten/sui/utils';

export interface SealEncryptionResult {
  encryptedData: Uint8Array;
  encryptedObject: Uint8Array;
  key: Uint8Array;
  packageId: string;
  id: string;
  threshold: number;
}

export interface SealDecryptionOptions {
  encryptedObject: Uint8Array;
  sessionKey: SessionKey;
  txBytes: Uint8Array;
  id: string;
  threshold?: number; // Optional: threshold used during encryption (if not provided, uses defaultThreshold)
}

/**
 * Encrypt data using Seal
 *
 * @param data - Data to encrypt (as Uint8Array)
 * @param identity - Identity to use for encryption (typically wallet address)
 * @param threshold - Threshold for threshold-based decryption (default: from config)
 * @returns Encrypted object and metadata
 */
export async function encryptWithSeal(
  data: Uint8Array,
  identity: string,
  threshold?: number
): Promise<SealEncryptionResult> {
  // Check if Seal is configured
  if (!isSealConfigured()) {
    throw new Error(
      'Seal is not configured. Please configure key servers and package ID in lib/seal/config.ts'
    );
  }

  const client = getSealClient();
  // Use access policies package ID for encryption/decryption
  // This package must contain seal_approve* functions
  // According to Seal docs: "Package ID used in PTB must contain seal_approve* functions"
  let packageId = getAccessPoliciesPackageId();
  if (!packageId) {
    throw new Error(
      'Access policies package ID is not configured. Please set NEXT_PUBLIC_SEAL_PACKAGE_ID (our custom package with seal_approve functions)'
    );
  }

  // Normalize package ID to ensure correct format (remove 0x prefix if needed, or ensure it's present)
  // Seal SDK may expect a specific format
  try {
    // Try to normalize the package ID using Sui utils
    packageId = normalizeSuiObjectId(packageId);
  } catch (normalizeError) {
    // Continue with original package ID
  }

  const encryptionThreshold = threshold || sealConfig.defaultThreshold;

  // Encrypt data using Seal
  // Note: kemType is optional and defaults to BLS12381
  // demType defaults to AES256_GCM
  let result;
  try {
    result = await client.encrypt({
      demType: DemType.AesGcm256, // Use AES-256-GCM for data encryption
      threshold: encryptionThreshold,
      packageId,
      id: identity,
      data,
    });
  } catch (encryptError: any) {
    throw encryptError;
  }

  return {
    encryptedData: data, // Original data (for compatibility)
    encryptedObject: result.encryptedObject,
    key: result.key,
    packageId,
    id: identity,
    threshold: encryptionThreshold,
  };
}

/**
 * Decrypt data using Seal
 *
 * @param options - Decryption options including encrypted object, session key, and transaction bytes
 * @returns Decrypted data
 */
export async function decryptWithSeal(options: SealDecryptionOptions): Promise<Uint8Array> {
  // Check if Seal is configured
  if (!isSealConfigured()) {
    throw new Error(
      'Seal is not configured. Please configure key servers and package ID in lib/seal/config.ts'
    );
  }

  const client = getSealClient();
  // Use threshold from options (saved during encryption) or fallback to defaultThreshold
  const threshold = options.threshold || sealConfig.defaultThreshold;

  // According to Seal examples, we should fetch keys first before decrypting
  // This ensures key servers are queried and keys are available for decryption
  // The threshold parameter tells Seal SDK how many key servers are needed
  // IMPORTANT: fetchKeys requires the identity ID (user address), not the sealId
  // The identity ID is the address that was used for encryption
  try {
    const keyServers = getKeyServerConfigs();

    // Fetch keys from key servers using the transaction bytes for authorization
    // This is required before decryption can proceed
    // Note: ids parameter should be the identity ID (user address), not sealId
    await client.fetchKeys({
      ids: [options.id], // Array of identity IDs (user address used for encryption)
      txBytes: options.txBytes,
      sessionKey: options.sessionKey,
      threshold,
    });
  } catch (fetchError: any) {
    // If fetchKeys fails, we might still be able to decrypt if keys are cached
    // But this is unlikely - usually fetchKeys must succeed first
    throw new Error(`Failed to fetch decryption keys: ${fetchError.message || fetchError}`);
  }

  // Decrypt data using Seal
  // After fetchKeys succeeds, decrypt should work
  // NOTE: fetchKeys may return success even if not enough shares are available
  // The actual share validation happens during decrypt()
  try {
    const decryptedData = await client.decrypt({
      data: options.encryptedObject,
      sessionKey: options.sessionKey,
      txBytes: options.txBytes,
      checkShareConsistency: false, // Set to true for enhanced security
      checkLEEncoding: false,
    });
    return decryptedData;
  } catch (decryptError: any) {
    throw decryptError;
  }
}

/**
 * Convert string to Uint8Array
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert Uint8Array to string
 */
export function uint8ArrayToString(data: Uint8Array): string {
  return new TextDecoder().decode(data);
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
