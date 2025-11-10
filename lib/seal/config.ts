/**
 * Seal Configuration
 *
 * Seal is a decentralized secrets management (DSM) product that enables
 * identity-based encryption and decryption with access controlled by
 * onchain policies on Sui.
 *
 * Documentation: https://seal-docs.wal.app
 * GitHub: https://github.com/MystenLabs/seal
 */

import type { KeyServerConfig } from '@mysten/seal';

export const sealConfig = {
  // Enable/disable Seal encryption
  // Set to false to disable Seal and use only crypto-js encryption
  // Default: true (enabled if configured)
  enabled: process.env.SEAL_ENABLED !== 'false',

  // Network configuration
  network: (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet',

  // IMPORTANT: There are TWO different package IDs:
  // 1. Official Seal Package ID (from MystenLabs) - for encryption/decryption
  // 2. Access Policies Package ID (our custom) - for access control
  //
  // For encryption/decryption, we need the OFFICIAL Seal package ID
  // For access control, we use our custom access policies package ID

  // Official Seal Package ID (from MystenLabs) - for encryption/decryption
  // This is the official Seal package that provides encryption/decryption functionality
  // Testnet: 0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682
  // Mainnet: 0xa212c4c6c7183b911d0be8768f4cb1df7a383025b5d0ba0c014009f0f30f5f8d
  // Source: https://seal-docs.wal.app/UsingSeal/
  officialSealPackageId:
    process.env.NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID ||
    (process.env.NEXT_PUBLIC_SUI_NETWORK === 'mainnet'
      ? '0xa212c4c6c7183b911d0be8768f4cb1df7a383025b5d0ba0c014009f0f30f5f8d'
      : '0x927a54e9ae803f82ebf480136a9bcff45101ccbe28b13f433c89f5181069d682'),

  // Access Policies Package ID (our custom) - for access control
  // This is our custom package for access policies (already deployed)
  // Package ID: 0x59d6f8a422d826e6f3489d81947c5f258b9997eb363d7b555a8641dbb2e853de
  accessPoliciesPackageId:
    process.env.NEXT_PUBLIC_SEAL_ACCESS_POLICIES_PACKAGE_ID ||
    process.env.NEXT_PUBLIC_SEAL_PACKAGE_ID ||
    '',

  // Policy Registry object ID (shared object for access policies)
  // This is read from environment variable SEAL_POLICY_REGISTRY_ID
  policyRegistryId: '', // Will be read from environment variable in getPolicyRegistryId()

  // Admin Cap object ID (for managing access policies)
  // This is read from environment variable SEAL_ADMIN_CAP_ID
  adminCapId: '', // Will be read from environment variable in getAdminCapId()

  // Key server configurations
  // These are the key servers that will participate in threshold-based decryption
  // Default: Mysten Labs testnet key servers (Open mode)
  // Source: https://seal-docs.wal.app/Pricing/
  //
  // Available testnet key servers:
  // - Mysten Labs: mysten-testnet-1, mysten-testnet-2 (Open mode)
  // - Ruby Nodes: Open mode + Permissioned mode
  // - NodeInfra: Open mode + Permissioned mode
  // - Studio Mirai: Open mode + Permissioned mode
  // - Overclock: Open mode + Permissioned mode
  // - H2O Nodes: Open mode + Permissioned mode
  // - Triton One: Open mode + Permissioned mode
  // - Natsai: Open mode + Permissioned mode
  // - Mhax.io: Open mode + Permissioned mode
  keyServers: [
    // Default: Mysten Labs testnet key servers (Open mode, free for testing)
    // These are configured via environment variables (SEAL_KEY_SERVER_OBJECT_IDS)
  ] as KeyServerConfig[],

  // Threshold for threshold-based decryption
  // This determines how many key servers are needed to decrypt data
  // For example, if threshold is 2 and there are 3 key servers,
  // at least 2 key servers must participate in decryption
  defaultThreshold: parseInt(
    process.env.NEXT_PUBLIC_SEAL_DEFAULT_THRESHOLD || process.env.SEAL_DEFAULT_THRESHOLD || '2'
  ),

  // Whether to verify key servers' authenticity
  verifyKeyServers: process.env.SEAL_VERIFY_KEY_SERVERS === 'true',

  // Timeout for network requests (milliseconds)
  timeout: parseInt(process.env.SEAL_TIMEOUT || '30000'),

  // Encryption algorithm types
  // Note: These will be imported from @mysten/seal when used
  // kemType: KemType.BonehFranklinBLS12381DemCCA
  // demType: DemType.AesGcm256
};

/**
 * Get key server configurations for the current network
 * Reads from environment variables or uses default config
 */
export function getKeyServerConfigs(): KeyServerConfig[] {
  // First, try to get from NEXT_PUBLIC_ environment variables (for client-side)
  // Then try server-side environment variables (for server-side)
  const envObjectIds =
    process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_OBJECT_IDS?.split(',')
      .map((id) => id.trim())
      .filter(Boolean) ||
    process.env.SEAL_KEY_SERVER_OBJECT_IDS?.split(',')
      .map((id) => id.trim())
      .filter(Boolean) ||
    [];
  const envWeights =
    process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_WEIGHTS?.split(',')
      .map((w) => parseInt(w.trim()))
      .filter((w) => !isNaN(w)) ||
    process.env.SEAL_KEY_SERVER_WEIGHTS?.split(',')
      .map((w) => parseInt(w.trim()))
      .filter((w) => !isNaN(w)) ||
    [];
  const apiKeyName =
    process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_API_KEY_NAME ||
    process.env.SEAL_KEY_SERVER_API_KEY_NAME;
  const apiKey =
    process.env.NEXT_PUBLIC_SEAL_KEY_SERVER_API_KEY || process.env.SEAL_KEY_SERVER_API_KEY;

  if (envObjectIds.length > 0) {
    // Use environment variables if provided
    return envObjectIds.map((objectId, index) => ({
      objectId,
      weight: envWeights[index] || 1,
      apiKeyName,
      apiKey,
    }));
  }

  // Fall back to config file
  return sealConfig.keyServers;
}

/**
 * Get Official Seal Package ID for encryption/decryption
 * This is the official Seal package from MystenLabs
 *
 * @returns Official Seal package ID
 */
export function getOfficialSealPackageId(): string {
  if (sealConfig.network === 'mainnet') {
    return (
      process.env.NEXT_PUBLIC_SEAL_OFFICIAL_PACKAGE_ID_MAINNET || sealConfig.officialSealPackageId
    );
  }
  return sealConfig.officialSealPackageId;
}

/**
 * Get Access Policies Package ID for access control
 * This is our custom package for access policies
 *
 * @returns Access policies package ID
 */
export function getAccessPoliciesPackageId(): string {
  // First, try environment variable (NEXT_PUBLIC_SEAL_PACKAGE_ID is our access policies package)
  const envPackageId = process.env.NEXT_PUBLIC_SEAL_PACKAGE_ID;
  if (envPackageId) {
    return envPackageId;
  }

  // Then try network-specific environment variable
  if (sealConfig.network === 'mainnet') {
    return process.env.NEXT_PUBLIC_SEAL_PACKAGE_ID_MAINNET || sealConfig.accessPoliciesPackageId;
  }

  // Finally, fall back to config
  return sealConfig.accessPoliciesPackageId;
}

/**
 * Get Seal package ID for the current network
 *
 * @deprecated Use getOfficialSealPackageId() or getAccessPoliciesPackageId() instead
 * This function returns the access policies package ID for backward compatibility
 *
 * @returns Package ID (access policies package ID for backward compatibility)
 */
export function getSealPackageId(): string {
  // For backward compatibility, return access policies package ID
  // But for encryption/decryption, we should use official Seal package ID
  // Check if official package ID is configured, otherwise use access policies package ID
  const officialPackageId = getOfficialSealPackageId();
  if (officialPackageId) {
    return officialPackageId;
  }
  return getAccessPoliciesPackageId();
}

/**
 * Get Policy Registry object ID for the current network
 *
 * NOTE: Policy Registry ID needs to be accessible on the client-side for transaction building.
 * Use NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID for client-side access.
 */
export function getPolicyRegistryId(): string {
  // First, try NEXT_PUBLIC_ environment variable (for client-side access)
  const nextPublicPolicyRegistryId = process.env.NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID;
  if (nextPublicPolicyRegistryId) {
    return nextPublicPolicyRegistryId;
  }

  // Then try server-side environment variable (for server-side access)
  const envPolicyRegistryId = process.env.SEAL_POLICY_REGISTRY_ID;
  if (envPolicyRegistryId) {
    return envPolicyRegistryId;
  }

  // Then try network-specific environment variable
  if (sealConfig.network === 'mainnet') {
    return (
      process.env.NEXT_PUBLIC_SEAL_POLICY_REGISTRY_ID_MAINNET ||
      process.env.SEAL_POLICY_REGISTRY_ID_MAINNET ||
      sealConfig.policyRegistryId
    );
  }

  // Finally, fall back to config
  return sealConfig.policyRegistryId;
}

/**
 * Get Admin Cap object ID for the current network
 */
export function getAdminCapId(): string {
  // First, try environment variable
  const envAdminCapId = process.env.SEAL_ADMIN_CAP_ID;
  if (envAdminCapId) {
    return envAdminCapId;
  }

  // Then try network-specific environment variable
  if (sealConfig.network === 'mainnet') {
    return process.env.SEAL_ADMIN_CAP_ID_MAINNET || sealConfig.adminCapId;
  }

  // Finally, fall back to config
  return sealConfig.adminCapId;
}

/**
 * Check if Seal is enabled in configuration
 * Returns false if SEAL_ENABLED=false, otherwise returns true (default: enabled)
 * This function reads the environment variable directly to support runtime changes
 */
export function isSealEnabled(): boolean {
  // Read environment variable directly (not from sealConfig.enabled)
  // This allows runtime changes to SEAL_ENABLED
  const envValue = process.env.SEAL_ENABLED;
  // If explicitly set to 'false', disable Seal
  // Otherwise, enable Seal (default behavior)
  return envValue !== 'false';
}

/**
 * Check if Seal is properly configured for encryption/decryption
 * Requires:
 * 1. Seal enabled (SEAL_ENABLED !== 'false')
 * 2. Official Seal package ID (for encryption/decryption)
 * 3. Key servers (for threshold-based decryption)
 */
export function isSealConfigured(): boolean {
  // First check if Seal is enabled
  if (!isSealEnabled()) {
    return false;
  }

  try {
    const keyServerConfigs = getKeyServerConfigs();
    const accessPoliciesPackageId = getAccessPoliciesPackageId();
    const officialPackageId = getOfficialSealPackageId();

    // For Seal encryption/decryption, we need:
    // 1. Access policies package ID (with seal_approve functions) - REQUIRED for encrypt/decrypt
    // 2. Official Seal package ID - REQUIRED for SessionKey and core functionality
    // 3. Key servers (for threshold-based decryption) - REQUIRED
    const configured =
      keyServerConfigs.length > 0 && accessPoliciesPackageId !== '' && officialPackageId !== '';

    return configured;
  } catch (error) {
    return false;
  }
}

/**
 * Check if access policies are configured
 * Requires:
 * 1. Access policies package ID (our custom package)
 * 2. Policy Registry ID (shared object)
 */
export function isAccessPoliciesConfigured(): boolean {
  try {
    const accessPoliciesPackageId = getAccessPoliciesPackageId();
    const policyRegistryId = getPolicyRegistryId();
    return accessPoliciesPackageId !== '' && policyRegistryId !== '';
  } catch {
    return false;
  }
}
