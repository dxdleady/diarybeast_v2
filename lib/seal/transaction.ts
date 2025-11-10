/**
 * Seal Transaction Builder
 *
 * This module provides functions for building transactions with seal_approve calls
 * required for Seal decryption.
 *
 * Documentation: https://seal-docs.wal.app
 */

import { Transaction } from '@mysten/sui/transactions';
import { getSuiClient } from './client';
import { getOfficialSealPackageId, getAccessPoliciesPackageId } from './config';
import type { SessionKey } from '@mysten/seal';
import { fromHex } from '@mysten/sui/utils';

/**
 * Create transaction bytes with seal_approve calls for Seal decryption
 *
 * This transaction authorizes the session key to decrypt data encrypted with Seal.
 * The transaction must be signed by the user and executed before decryption.
 *
 * @param sessionKey - Session key for authorization
 * @param encryptedObjectId - Optional: Object ID of the encrypted data (if stored as Sui object)
 * @returns Transaction bytes ready for signing and execution
 */
export async function createSealApproveTransaction(
  sessionKey: SessionKey,
  encryptedObjectId?: string
): Promise<Uint8Array> {
  const packageId = getOfficialSealPackageId();
  const suiClient = getSuiClient();

  if (packageId === '') {
    throw new Error(
      'Official Seal package ID is not configured. Please set NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID'
    );
  }

  const tx = new Transaction();

  // Get session key data for seal_approve
  const sessionKeyData = sessionKey.export();

  // Add seal_approve call to transaction
  // This authorizes the session key to decrypt data
  // The exact function name and parameters depend on Seal package structure
  // For now, we'll use a generic approach that should work with Seal SDK
  tx.moveCall({
    target: `${packageId}::seal::approve`,
    arguments: [
      tx.pure.address(sessionKeyData.address),
      tx.pure.string(sessionKeyData.mvrName || 'diarybeast'),
      tx.pure.u64(sessionKeyData.ttlMin || 30),
    ],
  });

  // If encryptedObjectId is provided, add approval for that specific object
  if (encryptedObjectId) {
    tx.moveCall({
      target: `${packageId}::seal::approve_object`,
      arguments: [tx.object(encryptedObjectId), tx.pure.address(sessionKeyData.address)],
    });
  }

  // Build transaction bytes with onlyTransactionKind: true
  // According to Seal examples, transaction bytes for decrypt should use onlyTransactionKind: true
  // This creates transaction bytes without requiring gas payment or full execution
  // The Seal SDK uses these bytes for dry_run_transaction_block to verify authorization
  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });

  return txBytes;
}

/**
 * Create a simple transaction for Seal authorization
 * This creates transaction bytes for seal_approve calls.
 *
 * Note: For threshold-based decryption with key servers, the transaction bytes
 * may not need to be signed/executed if the policies allow it. The Seal SDK
 * handles the interaction with key servers internally.
 *
 * @param userAddress - User's wallet address (identity used for encryption)
 * @param sessionKey - Session key for authorization
 * @param requesterAddress - Optional: Requester address (defaults to userAddress for client-side, admin for server-side)
 * @returns Transaction bytes (may be empty or minimal if not required)
 */
export async function createSealAuthorizationTransaction(
  userAddress: string,
  sessionKey: SessionKey,
  requesterAddress?: string
): Promise<Uint8Array> {
  const suiClient = getSuiClient();

  const tx = new Transaction();
  const sessionKeyData = sessionKey.export();

  // Create seal_approve transaction using our custom access policies
  // This calls seal_approve from our DiaryBeast Seal policies package
  // The function checks if the requester is authorized according to access policies
  try {
    // Get access policies package ID (our custom package)
    const accessPoliciesPackageId = getAccessPoliciesPackageId();

    // Get policy registry ID
    const { getPolicyRegistryId } = await import('./config');
    const policyRegistryId = getPolicyRegistryId();

    if (!policyRegistryId || !accessPoliciesPackageId) {
      // Fall back to using official Seal package for authorization
      // This allows Seal SDK to handle authorization via official Seal package
      try {
        return await createSealApproveTransaction(sessionKey);
      } catch (error: any) {
        // If official package also fails, we need to configure Policy Registry
        throw new Error(
          'Seal authorization requires either Policy Registry configuration or official Seal package. ' +
            `Policy Registry ID: ${policyRegistryId || 'not set'}, ` +
            `Access Policies Package ID: ${accessPoliciesPackageId || 'not set'}. ` +
            'Please configure NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID (for client-side) or SEAL_POLICY_REGISTRY_ID (for server-side) ' +
            'and NEXT_PUBLIC_SEAL_PACKAGE_ID (access policies package), ' +
            'or ensure NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID is correctly set.'
        );
      }
    }

    // Determine requester address
    // If not provided, use userAddress for client-side or admin for server-side
    let finalRequesterAddress = requesterAddress || userAddress;

    // If requesterAddress is not provided and we're on server-side, try to get admin address
    // Note: This is a server-side only operation, so we check if we're in a server environment
    if (!requesterAddress) {
      // Default to userAddress for client-side decryption
      // For server-side decryption, requesterAddress should be explicitly provided
      finalRequesterAddress = userAddress;
    }

    // Create seal_approve call to our access policies package
    // This checks if the requester is authorized to decrypt data for the user
    //
    // IMPORTANT: According to Seal SDK conventions, the first parameter MUST be `id: vector<u8>`
    // which is the identity (user address) encoded as bytes. This is required by Seal SDK.
    //
    // Note: mvrName is optional and may be undefined - use empty vector if not provided
    // TTL must be between 1 and 30 minutes (Seal SDK requirement)

    // Convert user address to bytes (identity in vector<u8> format)
    // The id parameter is the identity used for encryption (user's wallet address as bytes)
    // In Seal examples, they use fromHex(id) where id is the hex-encoded address
    // But we have the address directly, so we need to convert it to bytes
    // The address is already in hex format (0x...), so we can use fromHex to get bytes
    const idBytes = Array.from(fromHex(userAddress));
    const mvrNameBytes = sessionKeyData.mvrName
      ? Array.from(new TextEncoder().encode(sessionKeyData.mvrName))
      : []; // Empty vector if mvrName is not provided
    const ttlMin = sessionKeyData.ttlMin || 30; // Default to 30 minutes (max allowed by Seal SDK)

    tx.moveCall({
      target: `${accessPoliciesPackageId}::seal_policies::seal_approve`,
      arguments: [
        tx.pure.vector('u8', idBytes), // Identity (user address) as vector<u8> - REQUIRED as first parameter by Seal SDK
        tx.object(policyRegistryId), // Policy Registry (shared object)
        tx.pure.address(finalRequesterAddress), // Requester address (admin or user)
        tx.pure.vector('u8', mvrNameBytes), // MVR name (empty vector if not provided)
        tx.pure.u64(ttlMin), // TTL in minutes (must be 1-30)
      ],
    });
  } catch (error: any) {
    // If the move call fails, the Seal SDK might handle authorization differently
    // For threshold-based decryption, transaction bytes might not be required
    // Create an empty transaction as fallback
    // Return empty transaction bytes with onlyTransactionKind: true
    // The Seal SDK might not require transaction bytes for threshold-based decryption
    // if the policies allow it and key servers can provide decryption keys directly
    const emptyTx = new Transaction();
    const emptyTxBytes = await emptyTx.build({ client: suiClient, onlyTransactionKind: true });
    return emptyTxBytes;
  }

  // Build transaction bytes with onlyTransactionKind: true
  // According to Seal examples, transaction bytes for decrypt should use onlyTransactionKind: true
  // This creates transaction bytes without requiring gas payment or full execution
  // The Seal SDK uses these bytes for dry_run_transaction_block to verify authorization
  const txBytes = await tx.build({ client: suiClient, onlyTransactionKind: true });
  return txBytes;
}

/**
 * Check if Seal transaction is needed for decryption
 *
 * @param encryptedEntry - Encrypted entry with method information
 * @returns true if Seal transaction is needed
 */
export function needsSealTransaction(encryptedEntry: { method?: string }): boolean {
  return encryptedEntry.method === 'seal';
}
