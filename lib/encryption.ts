import CryptoJS from 'crypto-js';

/**
 * Deterministic encryption key derivation for DiaryBeast
 * Uses wallet address + salt to generate consistent encryption key
 * Works with Sui wallets across all devices
 */
export function getEncryptionKey(address: string): string {
  const salt = 'DiaryBeast_v1_encryption';
  const combined = `${address.toLowerCase()}_${salt}`;
  // Use SHA256 from crypto-js instead of keccak256
  return CryptoJS.SHA256(combined).toString();
}

export function encryptContent(content: string, key: string): string {
  return CryptoJS.AES.encrypt(content, key).toString();
}

export function decryptContent(encrypted: string, key: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function hashContent(content: string): string {
  // Use SHA256 for content hashing
  return CryptoJS.SHA256(content).toString();
}
