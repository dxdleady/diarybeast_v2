'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { decryptContent } from '@/lib/encryption';
import {
  hybridDecrypt,
  isSealAvailable,
  createSessionKey,
  createSealAuthorizationTransaction,
} from '@/lib/seal';
import { useEncryptionKey } from '@/lib/EncryptionKeyContext';
import { getWalrusEntryExplorerUrl, formatTxDigest } from '@/lib/walrus/explorer';
import {
  useSuiClientContext,
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
} from '@mysten/dapp-kit';
import type { HybridDecryptionOptions } from '@/lib/seal';

interface Entry {
  id: string;
  date: string;
  wordCount: number;
  encryptedContent: string;
  walrusTxDigest?: string | null; // Transaction digest for blockchain verification
  walrusBlobId?: string | null; // Blob ID for fallback
  storageType?: string; // Storage type
  adminAddress?: string | null; // Admin address for explorer link fallback
  // Seal-specific fields (optional)
  method?: 'crypto-js' | 'seal';
  sealEncryptedObject?: string;
  sealKey?: string;
  sealPackageId?: string;
  sealId?: string;
  sealThreshold?: number;
}

interface EntryViewerProps {
  entry: Entry;
  onBack: () => void;
}

export function EntryViewer({ entry, onBack }: EntryViewerProps) {
  const { encryptionKey } = useEncryptionKey();
  const { network } = useSuiClientContext();
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [decryptedContent, setDecryptedContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState('sans');
  const [decrypting, setDecrypting] = useState(false);
  const decryptingRef = useRef(false); // Защита от повторных вызовов

  // Get explorer URL for blockchain verification
  // Prefers txDigest, then blobObjectId, then admin address
  const explorerUrl =
    entry.walrusTxDigest || entry.walrusBlobId || entry.adminAddress
      ? getWalrusEntryExplorerUrl(
          entry.walrusTxDigest || null,
          entry.walrusBlobId || null,
          entry.adminAddress || null,
          network === 'mainnet' ? 'mainnet' : 'testnet'
        )
      : null;

  // Determine encryption method for display
  const encryptionMethod = entry.method || 'crypto-js';
  const isSealEncrypted = encryptionMethod === 'seal';

  // Load font preference
  useEffect(() => {
    const saved = localStorage.getItem('diary-font');
    if (saved) setFontFamily(saved);
  }, []);

  useEffect(() => {
    // Reset state when entry changes
    setDecryptedContent('');
    setError(null);
    setDecrypting(false);
    decryptingRef.current = false; // Сброс флага при изменении entry

    if (!entry) return;

    // Защита от повторных вызовов (React Strict Mode)
    if (decryptingRef.current) {
      return;
    }
    decryptingRef.current = true;

    // Determine encryption method
    const encryptionMethod = entry.method || 'crypto-js'; // Default to crypto-js for backward compatibility

    // Decrypt based on encryption method
    const decryptEntry = async () => {
      setDecrypting(true);
      try {
        if (encryptionMethod === 'seal') {
          // Use Seal decryption
          if (!isSealAvailable()) {
            throw new Error('Seal is not configured. Cannot decrypt Seal-encrypted entry.');
          }

          if (!address) {
            throw new Error(
              'Wallet not connected. Please connect your wallet to decrypt Seal-encrypted entry.'
            );
          }

          if (!entry.sealEncryptedObject || !entry.sealId) {
            throw new Error('Missing Seal metadata. Entry may be corrupted.');
          }

          try {
            // Create session key for Seal decryption
            const sessionKey = await createSessionKey(
              address,
              undefined, // mvrName - optional, not needed for basic Seal usage
              30 // ttlMin (30 minutes - max allowed by Seal SDK)
            );

            // IMPORTANT: Seal requires personal message signature before decryption
            // Подпись запрашивается ОДИН раз здесь
            const personalMessage = sessionKey.getPersonalMessage();

            // Sign personal message using wallet (ОДИН раз)
            const signatureResult = await signPersonalMessage({
              message: personalMessage,
            });

            // Set signature in SessionKey (required for Seal decryption)
            await sessionKey.setPersonalMessageSignature(signatureResult.signature);

            // Create transaction bytes for seal_approve
            // NOTE: txBytes создается с onlyTransactionKind: true, поэтому НЕ требует подписи
            const txBytes = await createSealAuthorizationTransaction(address, sessionKey, address);

            // Decrypt using Seal
            // fetchKeys и decrypt внутри Seal SDK используют уже подписанный sessionKey
            // и txBytes (который не требует подписи, т.к. onlyTransactionKind: true)
            const decrypted = await hybridDecrypt({
              encryptedData: entry.encryptedContent,
              method: 'seal',
              walletAddress: address,
              sealEncryptedObject: entry.sealEncryptedObject,
              sessionKey,
              txBytes,
              sealId: entry.sealId,
              sealThreshold: entry.sealThreshold, // Use threshold saved during encryption
            });

            setDecryptedContent(decrypted);
          } catch (sealError: any) {
            // If Seal decryption fails, try to fall back to crypto-js if available
            if (encryptionKey && entry.encryptedContent) {
              try {
                const decrypted = decryptContent(entry.encryptedContent, encryptionKey);
                setDecryptedContent(decrypted);
              } catch (cryptoError) {
                throw new Error(
                  `Seal decryption failed: ${sealError.message}. Fallback to crypto-js also failed.`
                );
              }
            } else {
              throw sealError;
            }
          }
        } else {
          // Use crypto-js decryption (legacy method)
          if (!encryptionKey) {
            throw new Error('Encryption key not available');
          }

          const decrypted = decryptContent(entry.encryptedContent, encryptionKey);
          setDecryptedContent(decrypted);
        }
      } catch (err: any) {
        setError(`Decryption failed: ${err.message || err}`);
      } finally {
        setDecrypting(false);
        decryptingRef.current = false; // Сброс флага после завершения
      }
    };

    decryptEntry();
    // React Strict Mode в development вызывает useEffect дважды
    // Защита через decryptingRef предотвращает повторный вызов
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry, encryptionKey, address]);

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Show loading state while decrypting
  if (decrypting) {
    return (
      <div className="max-w-3xl mx-auto p-8">
        <div className="text-center">
          <div className="font-mono text-lg mb-4 animate-pulse text-primary">
            Decrypting entry...
          </div>
          <div className="text-primary/40 font-mono text-sm mb-2">
            {isSealEncrypted ? '🔐 Using Seal encryption' : '🔒 Using crypto-js encryption'}
          </div>
          {isSealEncrypted && (
            <div className="text-primary/30 font-mono text-xs">
              Creating session key and authorization transaction...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-bg-lcd/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded text-primary transition-all flex items-center gap-2 font-mono text-sm hover:shadow-glow-cyan"
        >
          <span>←</span> [BACK]
        </button>
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-display font-bold text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">
                {formattedDate}
              </h1>
              {/* Encryption Method Badge */}
              {isSealEncrypted ? (
                <div
                  className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded text-xs font-mono text-primary border border-primary/20"
                  title="Encrypted with Seal (threshold-based decryption)"
                >
                  🔐 Seal
                </div>
              ) : (
                <div
                  className="flex items-center gap-1 px-2 py-1 bg-primary/5 rounded text-xs font-mono text-primary/60 border border-primary/10"
                  title="Encrypted with crypto-js (legacy method)"
                >
                  🔒 crypto-js
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-primary/60 font-mono">
              <span>{entry.wordCount} words</span>
              {isSealEncrypted && entry.sealThreshold && (
                <span className="text-primary/40" title="Threshold for Seal decryption">
                  Threshold: {entry.sealThreshold}
                </span>
              )}
            </div>
          </div>
          {explorerUrl && entry.storageType === 'walrus' && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 rounded-lg text-primary font-mono text-xs transition-all hover:shadow-glow-cyan"
              title="View transaction on Sui Explorer"
            >
              <span>🔗</span>
              <span>
                {entry.walrusTxDigest
                  ? `Tx: ${formatTxDigest(entry.walrusTxDigest)}`
                  : 'View on Explorer'}
              </span>
              <span className="opacity-60">↗</span>
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-bg-card border border-primary/20 rounded-xl p-6 min-h-[400px] shadow-glow-cyan">
        {error && (
          <div className="bg-error/20 border border-error rounded-lg p-4 text-error font-mono text-sm">
            {error}
          </div>
        )}

        {!error && decryptedContent && (
          <div
            className={`prose prose-invert max-w-none ${
              fontFamily === 'sans'
                ? 'font-sans'
                : fontFamily === 'serif'
                  ? 'font-serif'
                  : 'font-mono'
            }`}
          >
            <div className="text-primary leading-relaxed text-base">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-4 whitespace-pre-wrap text-primary">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-primary drop-shadow-[0_0_2px_rgba(0,229,255,0.3)]">
                      {children}
                    </strong>
                  ),
                  em: ({ children }) => <em className="italic text-primary/90">{children}</em>,
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 text-primary">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 text-primary">{children}</ol>
                  ),
                  li: ({ children }) => <li className="mb-1 text-primary">{children}</li>,
                }}
              >
                {decryptedContent}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {!error && !decryptedContent && (
          <div className="text-primary/50 font-mono text-sm">No content to display</div>
        )}
      </div>
    </div>
  );
}
