/**
 * Seal Integration - Main Export
 *
 * This module exports all Seal-related functionality for DiaryBeast.
 * Seal provides identity-based encryption with threshold-based decryption.
 */

// Configuration
export {
  sealConfig,
  getKeyServerConfigs,
  getSealPackageId, // Deprecated: Use getOfficialSealPackageId() or getAccessPoliciesPackageId()
  getOfficialSealPackageId,
  getAccessPoliciesPackageId,
  getPolicyRegistryId,
  getAdminCapId,
  isSealEnabled,
  isSealConfigured,
  isAccessPoliciesConfigured,
} from './config';

// Client
export { getSealClient, clearSealClient, getSuiClient } from './client';
// Note: isSealConfigured is exported from config, not client (to avoid duplication)

// Encryption
export {
  encryptWithSeal,
  decryptWithSeal,
  stringToUint8Array,
  uint8ArrayToString,
  uint8ArrayToBase64,
  base64ToUint8Array,
  type SealEncryptionResult,
  type SealDecryptionOptions,
} from './encryption';

// Session Key
export {
  createSessionKey,
  exportSessionKey,
  importSessionKey,
  isSessionKeyExpired,
} from './session-key';

// Hybrid Encryption (Seal + crypto-js)
export {
  hybridEncrypt,
  hybridDecrypt,
  isSealAvailable,
  getRecommendedEncryptionMethod,
  type EncryptionMethod,
  type HybridEncryptionResult,
  type HybridDecryptionOptions,
} from './hybrid-encryption';

// Transaction Builder
export {
  createSealApproveTransaction,
  createSealAuthorizationTransaction,
  needsSealTransaction,
} from './transaction';
