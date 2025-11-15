'use client';

import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import { encryptContent, hashContent } from '@/lib/encryption';
import { hybridEncrypt, isSealAvailable } from '@/lib/seal';
import { WeeklyHistory } from '@/components/WeeklyHistory';
import { RightSidebar } from '@/components/RightSidebar';
import { EntryViewer } from '@/components/EntryViewer';
import { TextEditor } from '@/components/TextEditor';
import { useEncryptionKey } from '@/lib/EncryptionKeyContext';
import { EntrySuccessModal } from '@/components/EntrySuccessModal';
import { DailyTimer } from '@/components/DailyTimer';
import { WeeklySummaryModal } from '@/components/WeeklySummaryModal';
import { GamificationModal } from '@/components/GamificationModal';
import { useGamification } from '@/lib/contexts/GamificationContext';
import { useUserStore } from '@/lib/stores/userStore';
import { StreakCalendar } from '@/components/StreakCalendar';

export default function Diary() {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const { encryptionKey } = useEncryptionKey();
  const { showGamificationModal, closeGamificationModal } = useGamification();
  const { user: userData, refreshUser, initializeUser } = useUserStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [loadingEntry, setLoadingEntry] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  // Seal encryption option - disabled by default, user can choose to enable it
  const [useSealEncryption, setUseSealEncryption] = useState(false);

  // Handle entry click - load full entry content from Walrus/PostgreSQL
  async function handleEntryClick(entry: any) {
    // If entry already has encryptedContent, use it directly
    if (entry.encryptedContent) {
      setSelectedEntry(entry);
      return;
    }

    // Otherwise, load full entry content from API
    setLoadingEntry(true);
    try {
      const response = await fetch(`/api/entries/${entry.id}`);
      if (!response.ok) {
        throw new Error('Failed to load entry');
      }
      const data = await response.json();
      if (data.success && data.entry) {
        setSelectedEntry(data.entry);
      }
    } catch (error) {
      // Error loading entry
    } finally {
      setLoadingEntry(false);
    }
  }

  // Function to reload data (used by Pet component when stats change)
  async function reloadData() {
    if (!address) return;

    try {
      // Refresh user from store (updates balance globally)
      await refreshUser(address);

      // Reload entries
      const entriesRes = await fetch(`/api/entries?userAddress=${address}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      const entriesData = await entriesRes.json();
      setEntries(entriesData.entries || []);
    } catch (error) {
      // Failed to reload data
    }
  }

  // Load data on mount and when address changes
  useEffect(() => {
    async function loadData() {
      if (!address) return;

      try {
        // Use store's refreshUser instead of direct fetch to avoid duplication
        await refreshUser(address);

        // Load entries
        const entriesRes = await fetch(`/api/entries?userAddress=${address}&t=${Date.now()}`, {
          cache: 'no-store',
        });
        const entriesData = await entriesRes.json();
        setEntries(entriesData.entries || []);
      } catch (error) {
        // Failed to load data
      } finally {
        setLoading(false);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  async function handleSummaryGenerated(summary: any) {
    // Refresh user data from store to update balance
    if (address) {
      await refreshUser(address);
    }
    // Show modal with updated balance
    setSummaryData(summary);
    setShowSummaryModal(true);
  }

  async function handleSave() {
    if (!address || !content.trim() || !encryptionKey) return;

    setSaving(true);
    setSuccessMessage('');

    try {
      // 1. Hash content (needed for signature and verification)
      const contentHash = hashContent(content);

      // 2. Sign hash using Sui wallet
      const messageBytes = new TextEncoder().encode(contentHash);
      const signResult = await signPersonalMessage({
        message: messageBytes,
      });

      // 3. Encrypt content using hybrid encryption (Seal if available, otherwise crypto-js)
      let encryptedContent: string;
      let encryptionMethod: 'crypto-js' | 'seal' = 'crypto-js';
      let sealMetadata: any = {};

      // Use Seal encryption only if user explicitly chose it AND Seal is available
      if (useSealEncryption && isSealAvailable()) {
        try {
          // Use Seal encryption
          const hybridResult = await hybridEncrypt(content, address, signResult.signature);
          encryptedContent = hybridResult.encryptedData;
          encryptionMethod = hybridResult.method;

          // Store Seal metadata if using Seal
          if (hybridResult.method === 'seal') {
            sealMetadata = {
              sealEncryptedObject: hybridResult.sealEncryptedObject,
              sealKey: hybridResult.sealKey,
              sealPackageId: hybridResult.sealPackageId,
              sealId: hybridResult.sealId,
              sealThreshold: hybridResult.sealThreshold,
            };
          }
        } catch (sealError) {
          // Fall back to crypto-js if Seal encryption fails
          encryptedContent = encryptContent(content, encryptionKey);
          encryptionMethod = 'crypto-js';
        }
      } else {
        // Use crypto-js encryption (default method)
        encryptedContent = encryptContent(content, encryptionKey);
        encryptionMethod = 'crypto-js';
      }

      // 4. Save to API
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          encryptedContent,
          signature: signResult.signature,
          contentHash,
          messageBytes: Array.from(messageBytes),
          wordCount: content.split(/\s+/).filter(Boolean).length,
          encryptionMethod, // Include encryption method
          ...sealMetadata, // Include Seal metadata if using Seal
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save');
      }

      const data = await res.json();

      // Show success modal with data
      setSuccessData({
        tokensEarned: data.reward.amount,
        streakBonus: data.reward.streakBonus || 0,
        milestone: data.reward.milestone || null,
        livesRestored: data.livesRestored || 0,
        oldLives: data.oldLives || 0,
        newLives: data.updatedUser.livesRemaining,
        baseAmount: data.reward.baseAmount,
        multiplier: data.reward.multiplier,
        multiplierReason: data.reward.multiplierReason,
      });
      setShowSuccessModal(true);
      setContent('');

      // OPTIMIZATION: Optimistically add the new entry to the list immediately
      // This makes the UI feel instant - entry appears right away
      if (data.entry) {
        const entryDate = data.entry.date
          ? typeof data.entry.date === 'string'
            ? data.entry.date
            : new Date(data.entry.date).toISOString()
          : new Date().toISOString();
        const newEntry = {
          id: data.entry.id,
          date: entryDate,
          wordCount: content.split(/\s+/).filter(Boolean).length,
          signature: data.entry.signature || '',
          contentHash: data.entry.contentHash || '',
          walrusBlobId: data.entry.blobId || null,
          walrusTxDigest: data.entry.txDigest || null,
          storageType: data.entry.storageType || 'walrus',
          adminAddress: data.entry.adminAddress || null,
          // encryptedContent is not included - will be loaded on-demand when clicked
          encryptedContent: undefined,
        };
        setEntries((prevEntries) => [newEntry, ...prevEntries]);
      }

      // Refresh user data (balance, streak, etc.)
      if (address) {
        await refreshUser(address);
      }

      // Reload entries in background to ensure we have the latest data
      // This is done after optimistic update so UI feels instant
      try {
        const entriesRes = await fetch(`/api/entries?userAddress=${address}&t=${Date.now()}`, {
          cache: 'no-store',
        });
        const entriesData = await entriesRes.json();
        // Only update if we got valid data (don't overwrite with empty array on error)
        if (entriesData.entries && entriesData.entries.length > 0) {
          setEntries(entriesData.entries || []);
        }
      } catch (error) {
        // Silently fail - we already have optimistic update
        console.error('Failed to reload entries:', error);
      }
    } catch (error: any) {
      alert(error.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen bg-bg-dark text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-lg mb-4 animate-pulse">Loading...</div>
          <div className="text-primary/40 font-mono text-sm">Initializing DiaryBeast</div>
        </div>
      </div>
    );
  }

  // Background colors based on activeBackground
  const getBackgroundClass = () => {
    if (!userData?.activeBackground) return 'bg-bg-dark';

    const bgMap: Record<string, string> = {
      'bg-default': 'bg-bg-dark',
      'bg-sunset': 'bg-gradient-to-br from-orange-900 via-purple-900 to-[var(--bg-dark)]',
      'bg-ocean': 'bg-gradient-to-br from-secondary via-primary/20 to-[var(--bg-dark)]',
      'bg-forest': 'bg-gradient-to-br from-green-900 via-accent/20 to-[var(--bg-dark)]',
      'bg-space': 'bg-gradient-to-br from-secondary via-purple-900 to-black',
    };

    return bgMap[userData.activeBackground] || 'bg-bg-dark';
  };

  // Check if user has written today
  const hasWrittenToday = userData?.lastEntryDate
    ? new Date(userData.lastEntryDate).toDateString() === new Date().toDateString()
    : false;

  // Check if entry exists for today in entries list
  const todayEntry = entries.find((entry) => {
    const entryDate = new Date(entry.date);
    const today = new Date();
    return (
      entryDate.getDate() === today.getDate() &&
      entryDate.getMonth() === today.getMonth() &&
      entryDate.getFullYear() === today.getFullYear()
    );
  });

  return (
    <>
      <div className={`h-screen text-white flex overflow-hidden ${getBackgroundClass()}`}>
        {/* Left Sidebar - Weekly History */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <WeeklyHistory
            entries={entries}
            onEntryClick={handleEntryClick}
            onSummaryGenerated={handleSummaryGenerated}
            userBalance={userData?.coinsBalance || 0}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Daily Timer - Fixed in top right of content area */}
          <div className="absolute top-4 right-4 z-40">
            <DailyTimer hasWrittenToday={hasWrittenToday} />
          </div>

          {loadingEntry ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="font-mono text-lg mb-4 animate-pulse text-primary">
                  Loading entry...
                </div>
              </div>
            </div>
          ) : selectedEntry ? (
            <EntryViewer entry={selectedEntry} onBack={() => setSelectedEntry(null)} />
          ) : (
            <div className="h-full pt-4 relative">
              {/* Loading Overlay - блокирует экран при сохранении */}
              {saving && (
                <div className="absolute inset-0 bg-bg-dark/90 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
                    </div>
                    <div className="font-mono text-lg text-primary mb-2 animate-pulse">
                      Saving Entry...
                    </div>
                    <div className="font-mono text-sm text-primary/60">Encrypting & Signing</div>
                  </div>
                </div>
              )}
              <div className="w-full px-8">
                <div className="mb-6 flex items-start gap-6 pr-40">
                  <div>
                    <h1 className="text-4xl font-display font-bold mb-2 text-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">
                      Today&apos;s Entry
                    </h1>
                    <p className="text-primary/60 font-mono text-sm">
                      {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Streak Calendar - Last 7 Days - Positioned to avoid DailyTimer */}
                  {userData && (
                    <div className="flex-shrink-0 mt-1 ml-auto">
                      <StreakCalendar entries={entries} currentStreak={userData.currentStreak} />
                    </div>
                  )}
                </div>

                {/* Show message if entry already exists for today */}
                {todayEntry ? (
                  <div className="bg-bg-card border border-primary/30 rounded-xl p-8 text-center">
                    <div className="mb-4">
                      <div className="text-6xl mb-4">✅</div>
                      <h2 className="text-2xl font-display font-bold text-primary mb-2">
                        Entry Already Created
                      </h2>
                      <p className="text-primary/60 font-mono text-sm mb-6">
                        You&apos;ve already written your diary entry for today.
                      </p>
                      <div className="flex items-center justify-center gap-4 text-sm text-primary/50 font-mono mb-6">
                        <span>{todayEntry.wordCount} words</span>
                        <span>•</span>
                        <span>
                          {new Date(todayEntry.date).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleEntryClick(todayEntry)}
                        className="btn-primary px-6 py-3 rounded-lg font-mono text-sm font-semibold hover:shadow-glow-cyan transition-all"
                      >
                        [VIEW TODAY&apos;S ENTRY]
                      </button>
                    </div>
                  </div>
                ) : (
                  <TextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="How was your day? Write your thoughts here..."
                    wordCount={content.split(/\s+/).filter(Boolean).length}
                    sealEncryptionEnabled={useSealEncryption}
                    onSealEncryptionChange={setUseSealEncryption}
                    isSealAvailable={isSealAvailable()}
                    actionButton={
                      <button
                        onClick={handleSave}
                        disabled={!content.trim() || saving}
                        className="btn-primary px-6 py-2 rounded-lg font-mono text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? '[SAVING...]' : '[SAVE & SIGN]'}
                      </button>
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Stats, Pet, Menu */}
        <div className="w-80 flex-shrink-0 overflow-hidden">
          <RightSidebar userData={userData} entries={entries} onStatsChange={reloadData} />
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && successData && (
        <EntrySuccessModal
          isOpen={showSuccessModal}
          tokensEarned={successData.tokensEarned}
          streakBonus={successData.streakBonus}
          milestone={successData.milestone}
          livesRestored={successData.livesRestored}
          oldLives={successData.oldLives}
          newLives={successData.newLives}
          baseAmount={successData.baseAmount}
          multiplier={successData.multiplier}
          multiplierReason={successData.multiplierReason}
          onClose={() => setShowSuccessModal(false)}
        />
      )}

      {/* Weekly Summary Modal */}
      {showSummaryModal && summaryData && (
        <WeeklySummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          weekLabel={summaryData.weekLabel}
          emotions={summaryData.emotions}
          summary={summaryData.summary}
          insights={summaryData.insights}
          trend={summaryData.trend}
          newBalance={summaryData.newBalance}
        />
      )}

      {/* Gamification Modal */}
      <GamificationModal isOpen={showGamificationModal} onClose={closeGamificationModal} />
    </>
  );
}
