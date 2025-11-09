'use client';

import { useState } from 'react';
import {
  useCurrentAccount,
  useCurrentWallet,
  useSuiClientContext,
  useSuiClient,
} from '@mysten/dapp-kit';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { fromB64 } from '@mysten/sui.js/utils';
import { useUserStore } from '@/lib/stores/userStore';
import { getWalrusEntryExplorerUrl, formatTxDigest } from '@/lib/walrus/explorer';

interface Entry {
  id: string;
  date: string;
  wordCount: number;
  encryptedContent: string;
  walrusTxDigest?: string | null; // Transaction digest for blockchain verification
  walrusBlobId?: string | null; // Blob ID for fallback
  storageType?: string; // Storage type
  adminAddress?: string | null; // Admin address for explorer link fallback
}

interface WeekGroup {
  weekLabel: string;
  startDate: Date;
  endDate: Date;
  entries: Entry[];
  isCurrentWeek: boolean;
}

interface WeeklyHistoryProps {
  entries: Entry[];
  onEntryClick: (entry: Entry) => void;
  onSummaryGenerated?: (summary: any) => void;
  userBalance?: number;
  onOpenGamification?: () => void;
}

function groupEntriesByWeek(entries: Entry[]): WeekGroup[] {
  if (!entries || entries.length === 0) return [];

  const now = new Date();
  const groups: WeekGroup[] = [];
  const weekMap = new Map<string, Entry[]>();

  entries.forEach((entry) => {
    const entryDate = new Date(entry.date);
    const weekStart = getWeekStart(entryDate);
    const weekKey = weekStart.toISOString();

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, []);
    }
    weekMap.get(weekKey)!.push(entry);
  });

  const currentWeekStart = getWeekStart(now);

  Array.from(weekMap.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .forEach(([weekKey, weekEntries]) => {
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const isCurrentWeek = weekStart.toISOString() === currentWeekStart.toISOString();

      groups.push({
        weekLabel: formatWeekLabel(weekStart, weekEnd, isCurrentWeek),
        startDate: weekStart,
        endDate: weekEnd,
        entries: weekEntries.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        ),
        isCurrentWeek,
      });
    });

  return groups;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

function formatWeekLabel(start: Date, end: Date, isCurrentWeek: boolean): string {
  if (isCurrentWeek) return 'This Week';

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

function formatEntryDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function WeeklyHistory({
  entries,
  onEntryClick,
  onSummaryGenerated,
  userBalance = 0,
  onOpenGamification,
}: WeeklyHistoryProps) {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const { user, updateBalance, refreshUser } = useUserStore();
  const balance = user?.coinsBalance ?? userBalance;
  const weekGroups = groupEntriesByWeek(entries);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(
    new Set(weekGroups.find((w) => w.isCurrentWeek)?.weekLabel ? [weekGroups[0].weekLabel] : [])
  );
  const [generatingWeek, setGeneratingWeek] = useState<string | null>(null);
  const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

  const toggleWeek = (weekLabel: string) => {
    setExpandedWeeks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(weekLabel)) {
        newSet.delete(weekLabel);
      } else {
        newSet.add(weekLabel);
      }
      return newSet;
    });
  };

  const { currentWallet } = useCurrentWallet();
  const { network } = useSuiClientContext(); // Get network for chain identifier

  const handleGenerateSummary = async (week: WeekGroup) => {
    if (!address || balance < 50) {
      alert('You need 50 DIARY tokens to generate a summary');
      return;
    }

    setGeneratingWeek(week.weekLabel);
    try {
      // Step 1: Create sponsored transaction and get analysis
      const res = await fetch('/api/summary/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          weekStart: week.startDate.toISOString(),
          weekEnd: week.endDate.toISOString(),
        }),
      });

      // Try to parse JSON response
      let data;
      try {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          // If response is not JSON, it's probably an HTML error page
          console.error('Failed to parse response as JSON. Response:', text.substring(0, 500));
          throw new Error(
            `Server returned non-JSON response (status ${res.status}). This usually indicates a server error.`
          );
        }
      } catch (error) {
        console.error('Error reading response:', error);
        throw new Error(error instanceof Error ? error.message : 'Failed to read server response');
      }

      if (!res.ok) {
        console.error('Summary generation failed:', { status: res.status, data });
        // Handle specific error cases
        if (data.error === 'No entries found for this week') {
          alert('No diary entries found for this week. Please write some entries first!');
          return;
        }
        if (
          data.error === 'Insufficient balance' ||
          data.error === 'Insufficient balance on blockchain'
        ) {
          alert(
            `Insufficient balance. You need ${data.required || 50} DIARY tokens, but you have ${data.current || data.onChainBalance || balance}.`
          );
          return;
        }
        if (data.error === 'No tokens on blockchain') {
          alert(
            `No tokens found on blockchain. ${data.details || 'Tokens may not have been minted yet.'}`
          );
          return;
        }
        throw new Error(
          data.error || data.details || `Failed to generate summary (status ${res.status})`
        );
      }

      if (!data.requiresSignature || !data.sponsoredTransaction) {
        throw new Error('Invalid response: sponsored transaction required');
      }

      // Step 2: Sign the sponsored transaction
      const { transactionBytes, sponsorSignature } = data.sponsoredTransaction;

      if (!currentWallet || !address) {
        throw new Error('Wallet not connected');
      }

      // EXACT scallop-io approach (from src/shinami-sponsored-tx/index.ts, line 79-81):
      // 1. sponsorTxn.txBytes is base64 string from sponsor
      // 2. this.signTxn(TransactionBlock.from(sponsorTxn.txBytes)) - sign the restored TransactionBlock
      // 3. Execute with sponsorTxn.txBytes (original base64 string)
      //
      // Scallop-io's signTxn uses keypair.signTransactionBlock() internally
      // We need to sign the bytes directly using wallet's signTransactionBlock
      // But wallet expects TransactionBlock or bytes, so we restore it first

      // EXACT scallop-io approach:
      // In scallop-io's signTxn: it accepts TransactionBlock, then calls build() to get bytes, then signs bytes
      // Key insight: we must sign the EXACT same bytes that the sponsor signed
      //
      // Problem: If we pass TransactionBlock to wallet, wallet might rebuild it, changing the bytes
      // Solution: Pass the bytes directly (Uint8Array) to the wallet
      //
      // However, Sui wallet standard requires TransactionBlock object or bytes in specific format
      // Let's try passing bytes directly as Uint8Array

      if (!currentWallet?.features['sui:signTransactionBlock']) {
        throw new Error('Wallet does not support signTransactionBlock');
      }

      const chain = network === 'mainnet' ? 'sui:mainnet' : 'sui:testnet';

      // Step 2: User signs the TransactionData
      // According to Sui documentation on sponsored transactions:
      // - User receives TransactionData (with GasData) and sponsor Signature from sponsor
      // - User verifies the transaction and signs the same TransactionData
      // - User must sign because they own objects used in the transaction (userCoinId)
      //
      // Restore TransactionBlock from base64 string to sign it
      // TransactionBlock.from() preserves all transaction data including GasData.owner
      const txBlock = TransactionBlock.from(transactionBytes); // Restore TransactionData from base64 string

      // Sign TransactionData as user (sender in user-initiated transactions)
      // The wallet will sign the TransactionData, verifying that:
      // - TransactionData.sender matches user's address
      // - User owns the objects used in the transaction (userCoinId after split)
      const signResult = await (
        currentWallet.features['sui:signTransactionBlock'] as any
      ).signTransactionBlock({
        transactionBlock: txBlock, // TransactionData with GasData (restored from sponsor bytes)
        account: currentWallet.accounts[0],
        chain,
      });

      const userSignature = signResult.signature;

      // Step 3: Execute dual-signed transaction
      // Send both signatures (user and sponsor) to execute the transaction
      // Sui will validate that both signatures are correct and all objects are owned by the correct signers
      const executeRes = await fetch('/api/sponsored/burn/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionBytes: transactionBytes, // Original sponsor bytes (base64) with gasOwner=admin
          userSignature,
          sponsorSignature,
        }),
      });

      const executeData = await executeRes.json();

      if (!executeRes.ok) {
        console.error('Transaction execution failed:', {
          status: executeRes.status,
          data: executeData,
        });
        throw new Error(executeData.error || 'Failed to execute transaction');
      }

      if (!executeData.digest) {
        throw new Error('Transaction executed but no digest returned');
      }

      // Step 4: Complete summary generation
      const completeRes = await fetch('/api/summary/generate/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          weekStart: week.startDate.toISOString(),
          weekEnd: week.endDate.toISOString(),
          analysis: data.analysis,
          txHash: executeData.digest,
        }),
      });

      const completeData = await completeRes.json();

      if (!completeRes.ok) {
        console.error('Summary completion failed:', {
          status: completeRes.status,
          data: completeData,
        });
        throw new Error(completeData.error || 'Failed to complete summary generation');
      }

      // Update balance in store (this will trigger rewards reload in RightSidebar)
      if (completeData.newBalance !== undefined) {
        updateBalance(completeData.newBalance);
      }

      // Refresh full user data to ensure everything is in sync
      // This will also trigger rewards reload in RightSidebar due to coinsBalance dependency
      if (address) {
        await refreshUser(address);
      }

      if (onSummaryGenerated) {
        onSummaryGenerated({
          ...completeData.summary,
          weekLabel: week.weekLabel,
          newBalance: completeData.newBalance,
        });
      }
    } catch (error: any) {
      console.error('Summary generation failed:', error);
      // Only show alert if error message is meaningful (not already handled above)
      if (
        error.message &&
        !error.message.includes('No entries found') &&
        !error.message.includes('Insufficient balance')
      ) {
        alert(error.message || 'Failed to generate summary');
      }
    } finally {
      setGeneratingWeek(null);
    }
  };

  if (weekGroups.length === 0) {
    return (
      <div className="h-full bg-bg-dark border-r border-primary/20 p-4">
        {/* Logo */}
        <div className="mb-6 flex items-center gap-3">
          <img
            src="/assets/diary-beast-tamagochi.svg"
            alt="DiaryBeast"
            className="w-10 h-10 object-contain"
            style={{
              filter:
                'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(160deg) brightness(103%) contrast(101%)',
            }}
          />
          <h1 className="text-xl font-display font-bold text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
            DiaryBeast
          </h1>
        </div>

        <h2 className="text-lg font-mono font-semibold mb-4 text-white">History</h2>
        <p className="text-sm text-primary/50 font-mono">No entries yet</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-bg-dark border-r border-primary/20 flex flex-col">
      {/* Logo */}
      <div className="p-4 pb-3 flex items-center gap-3">
        <img
          src="/assets/diary-beast-tamagochi.svg"
          alt="DiaryBeast"
          className="w-10 h-10 object-contain"
          style={{
            filter:
              'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(160deg) brightness(103%) contrast(101%)',
          }}
        />
        <h1 className="text-xl font-display font-bold text-primary drop-shadow-[0_0_8px_rgba(0,229,255,0.3)]">
          DiaryBeast
        </h1>
      </div>

      <div className="px-4 pb-3 pt-6 border-b border-primary/20 flex items-center justify-between">
        <h2 className="text-lg font-mono font-semibold text-white">History</h2>
        <button
          onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
          className="px-3 py-2 bg-gradient-to-r from-accent/20 to-primary/20 hover:from-accent/30 hover:to-primary/30 border-2 border-primary/60 hover:border-primary rounded-lg text-primary hover:shadow-[0_0_10px_rgba(0,229,255,0.4)] transition-all flex items-center gap-2"
          title={isHistoryCollapsed ? 'Expand history to view all entries' : 'Collapse history'}
        >
          <span className="text-lg font-bold">{isHistoryCollapsed ? '▶' : '▼'}</span>
          <span className="text-xs font-mono hidden sm:inline">
            {isHistoryCollapsed ? 'Show' : 'Hide'}
          </span>
        </button>
      </div>

      {!isHistoryCollapsed && (
        <div className="flex-1 overflow-y-auto p-2">
          {weekGroups.map((week) => {
            const isExpanded = expandedWeeks.has(week.weekLabel);

            return (
              <div key={week.weekLabel} className="mb-2">
                <div>
                  <button
                    onClick={() => toggleWeek(week.weekLabel)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-primary font-mono">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <span className="font-display font-medium text-sm text-primary">
                        {week.weekLabel}
                      </span>
                      {week.isCurrentWeek && (
                        <span className="text-xs bg-primary/20 text-primary border border-primary/40 px-2 py-0.5 rounded-full font-mono">
                          CURRENT
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Generate Summary Button */}
                  {week.entries.length > 0 && (
                    <div className="px-3 pb-2 space-y-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateSummary(week);
                        }}
                        disabled={generatingWeek === week.weekLabel || userBalance < 50}
                        className={`w-full px-4 py-3 rounded-lg text-xs font-mono font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all border-2 ${
                          userBalance >= 50 && generatingWeek !== week.weekLabel
                            ? 'bg-gradient-to-r from-accent/30 via-primary/30 to-accent/30 hover:from-accent/40 hover:via-primary/40 hover:to-accent/40 border-primary/60 hover:border-primary shadow-[0_0_20px_rgba(0,229,255,0.4)] hover:shadow-[0_0_25px_rgba(0,229,255,0.6)] text-white'
                            : 'bg-bg-lcd/30 border-primary/20 text-primary/50'
                        }`}
                        title={
                          userBalance < 50
                            ? `You need 50 DIARY tokens to generate a summary. You currently have ${userBalance} tokens.`
                            : '🤖 AI Summary - Get intelligent analysis of your week: emotions, insights, trends, and personalized recommendations. Costs 50 DIARY tokens.'
                        }
                      >
                        {generatingWeek === week.weekLabel ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-pulse">⚡</span>
                            <span>[ANALYZING...]</span>
                          </span>
                        ) : (
                          <>
                            <span className="text-base">🤖</span>
                            <span>AI SUMMARY</span>
                            <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold">
                              -50
                            </span>
                            <img
                              src="/assets/tamagochi-coin.svg"
                              alt="DIARY"
                              className="w-4 h-4"
                              style={{
                                filter:
                                  'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                              }}
                            />
                          </>
                        )}
                      </button>
                      {userBalance >= 50 && week.entries.length > 0 && (
                        <div className="text-xs text-accent/80 font-mono px-2 py-1 bg-accent/10 border border-accent/30 rounded text-center">
                          💡 Get AI-powered analysis: emotions, insights & trends
                        </div>
                      )}
                      {userBalance < 50 && (
                        <div className="text-xs text-warning/80 font-mono px-2 py-1 bg-warning/10 border border-warning/20 rounded text-center">
                          ⚠️ Need {50 - userBalance} more DIARY tokens to generate summary
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div className="ml-6 mt-2 space-y-2">
                    {/* Entry List - Scrollable */}
                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                      {week.entries.map((entry) => {
                        const explorerUrl =
                          entry.walrusTxDigest || entry.walrusBlobId || entry.adminAddress
                            ? getWalrusEntryExplorerUrl(
                                entry.walrusTxDigest || null,
                                entry.walrusBlobId || null,
                                entry.adminAddress || null,
                                network === 'mainnet' ? 'mainnet' : 'testnet'
                              )
                            : null;

                        return (
                          <div
                            key={entry.id}
                            onClick={() => onEntryClick(entry)}
                            className="p-2 rounded-lg hover:bg-primary/10 border border-transparent hover:border-primary/20 cursor-pointer transition-all"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-primary font-mono">
                                  {formatEntryDate(entry.date)}
                                </div>
                                <div className="text-xs text-primary/50 mt-0.5 font-mono">
                                  {entry.wordCount} words
                                </div>
                              </div>
                              {explorerUrl && entry.storageType === 'walrus' && (
                                <a
                                  href={explorerUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-shrink-0 px-1.5 py-0.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded text-primary/70 hover:text-primary font-mono text-[10px] transition-all"
                                  title="View on blockchain"
                                >
                                  🔗
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
