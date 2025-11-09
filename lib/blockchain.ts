/**
 * Blockchain integration for Sui network
 * This file re-exports functions from lib/sui/token.ts for backward compatibility
 */

export { mintTokens, burnTokens, getTokenBalance, syncUserBalance } from './sui/token';
