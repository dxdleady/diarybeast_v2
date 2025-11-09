'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { getEncryptionKey } from './encryption';

interface EncryptionKeyContextType {
  encryptionKey: string | null;
  isLoading: boolean;
}

const EncryptionKeyContext = createContext<EncryptionKeyContextType | undefined>(undefined);

/**
 * Simplified encryption context for DiaryBeast
 * Uses deterministic key derivation from wallet address
 * No signatures required, works across all devices
 */
export function EncryptionKeyProvider({ children }: { children: ReactNode }) {
  const currentAccount = useCurrentAccount();

  const encryptionKey = useMemo(() => {
    if (!currentAccount?.address) return null;
    return getEncryptionKey(currentAccount.address);
  }, [currentAccount?.address]);

  return (
    <EncryptionKeyContext.Provider value={{ encryptionKey, isLoading: false }}>
      {children}
    </EncryptionKeyContext.Provider>
  );
}

export function useEncryptionKey() {
  const context = useContext(EncryptionKeyContext);
  if (context === undefined) {
    throw new Error('useEncryptionKey must be used within EncryptionKeyProvider');
  }
  return context;
}
