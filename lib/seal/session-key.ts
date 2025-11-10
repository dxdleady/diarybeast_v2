/**
 * Seal Session Key Management
 *
 * SessionKey is required for Seal decryption. It represents user authorization
 * and is used to create transaction bytes for seal_approve functions.
 *
 * Documentation: https://seal-docs.wal.app
 */

import { SessionKey, type ExportedSessionKey } from '@mysten/seal';
import type { Signer } from '@mysten/sui/cryptography';
import { normalizeSuiObjectId } from '@mysten/sui/utils';
import { getSuiClient } from './client';
import { getAccessPoliciesPackageId } from './config';

/**
 * Create a SessionKey for a user
 *
 * @param address - User's wallet address
 * @param mvrName - Optional: Human-readable name for the MVR (Multi-Version Registry)
 * @param ttlMin - Time-to-live in minutes (default: 30 minutes, range: 1-30)
 * @param signer - Optional: Signer for creating the session key
 * @returns SessionKey instance
 */
export async function createSessionKey(
  address: string,
  mvrName?: string,
  ttlMin: number = 30, // Default: 30 minutes (max allowed by Seal SDK, range: 1-30)
  signer?: Signer
): Promise<SessionKey> {
  // Use access policies package ID for SessionKey
  // According to Seal examples, SessionKey.create() should use the same package ID
  // that contains seal_approve functions (our access policies package)
  let packageId = getAccessPoliciesPackageId();
  const suiClient = getSuiClient();

  if (packageId === '') {
    throw new Error(
      'Access policies package ID is not configured. Please set NEXT_PUBLIC_SEAL_PACKAGE_ID (our custom package with seal_approve functions)'
    );
  }

  // Normalize package ID to ensure correct format
  try {
    packageId = normalizeSuiObjectId(packageId);
  } catch (normalizeError) {
    // Continue with original package ID
  }

  try {
    // Build SessionKey.create parameters
    // mvrName is optional - only include it if provided
    const sessionKeyParams: any = {
      address,
      packageId,
      ttlMin,
      signer,
      suiClient,
    };

    // Only include mvrName if it's provided
    // According to Seal examples, mvrName should be in format like '@pkg/package-name-1234'
    // For our use case, we can omit it if not needed
    if (mvrName) {
      sessionKeyParams.mvrName = mvrName;
    }

    const sessionKey = await SessionKey.create(sessionKeyParams);
    return sessionKey;
  } catch (error: any) {
    throw error;
  }
}

/**
 * Export SessionKey to store in IndexedDB or other storage
 *
 * @param sessionKey - SessionKey instance to export
 * @returns Exported session key data
 */
export function exportSessionKey(sessionKey: SessionKey): ExportedSessionKey {
  return sessionKey.export();
}

/**
 * Import SessionKey from stored data
 *
 * @param data - Exported session key data
 * @param signer - Optional: Signer for the session key
 * @returns SessionKey instance
 */
export function importSessionKey(data: ExportedSessionKey, signer?: Signer): SessionKey {
  const suiClient = getSuiClient();
  return SessionKey.import(data, suiClient, signer);
}

/**
 * Check if SessionKey is expired
 *
 * @param sessionKey - SessionKey instance to check
 * @returns true if expired
 */
export function isSessionKeyExpired(sessionKey: SessionKey): boolean {
  return sessionKey.isExpired();
}
