'use client';

import { useState, useEffect } from 'react';
import { Pet } from './Pet';
import { formatLastActive } from '@/lib/gamification/lifeSystem';
import { getNextMilestone } from '@/lib/gamification/streakRewards';
import { useUserStore } from '@/lib/stores/userStore';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { formatAddress } from '@mysten/sui.js/utils';
import { useNetworkVariable } from '@/lib/sui/config';

interface Entry {
  id: string;
  date: string;
}

interface RightSidebarProps {
  userData?: any; // Keep for backward compatibility but will use store
  entries?: Entry[];
  onStatsChange?: () => void;
}

export function RightSidebar({ entries = [], onStatsChange }: RightSidebarProps) {
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRecentTxs, setShowRecentTxs] = useState(true);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const { user: userData } = useUserStore();
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const packageId = useNetworkVariable('packageId');

  // Load rewards with transaction hashes
  useEffect(() => {
    async function loadRewards() {
      if (!address) return;
      setLoadingRewards(true);
      try {
        const res = await fetch(`/api/rewards?userAddress=${address}&t=${Date.now()}`);
        if (res.ok) {
          try {
            const data = await res.json();
            setRewards(data.rewards || []);
          } catch (parseError) {
            console.error('Failed to parse rewards response:', parseError);
            setRewards([]);
          }
        } else {
          try {
            const errorData = await res.json();
            console.error('Failed to load rewards:', errorData);
          } catch {
            console.error('Failed to load rewards: non-JSON response');
          }
          setRewards([]);
        }
      } catch (error) {
        console.error('Failed to load rewards:', error);
        setRewards([]);
      } finally {
        setLoadingRewards(false);
      }
    }
    loadRewards();
  }, [address, userData?.coinsBalance]);

  // Get Sui Explorer URL for testnet/mainnet
  const getSuiExplorerUrl = (id: string, type: 'object' | 'tx' | 'account' = 'object') => {
    // Sui Explorer uses different URL format
    // For addresses (accounts): /testnet/account/0x...
    // For objects: /testnet/object/0x...
    // For transactions: /testnet/txblock/0x...
    const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet';
    if (type === 'tx') {
      return `https://suiscan.xyz/${network}/txblock/${id}`;
    } else if (type === 'account') {
      return `https://suiscan.xyz/${network}/account/${id}`;
    } else {
      return `https://suiscan.xyz/${network}/object/${id}`;
    }
  };

  // Check if user has written today
  const hasWrittenToday = userData?.lastEntryDate
    ? new Date(userData.lastEntryDate).toDateString() === new Date().toDateString()
    : false;

  return (
    <>
      <div className="h-full bg-bg-dark border-l border-primary/20 flex flex-col">
        {/* Statistics - Scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase tracking-wider text-primary/80 font-display font-semibold">
                Statistics
              </h3>
            </div>
            <div className="space-y-2">
              {/* Balance - Always Visible */}
              <div className="flex items-center justify-between p-2 bg-bg-lcd/30 rounded border border-primary/10 hover:border-primary/30 transition-all">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/tamagochi-coin.svg"
                    alt="DIARY Token"
                    className="w-10 h-10"
                    style={{
                      filter:
                        'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                    }}
                  />
                  <span className="text-xs text-primary/70 font-mono">DIARY</span>
                </div>
                <span className="text-sm font-bold text-tokens font-mono drop-shadow-[0_0_4px_rgba(255,215,0,0.4)]">
                  {userData?.coinsBalance ?? 0}
                </span>
              </div>

              {/* Contract Address & Transactions */}
              <div className="p-2 bg-bg-lcd/50 rounded border border-primary/10 space-y-1.5">
                {packageId && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary/60 font-mono">Package:</span>
                    <a
                      href={getSuiExplorerUrl(packageId, 'object')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-accent font-mono transition-colors"
                      title={packageId}
                    >
                      {formatAddress(packageId)} ↗
                    </a>
                  </div>
                )}
                {address && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary/60 font-mono">Wallet:</span>
                    <a
                      href={getSuiExplorerUrl(address, 'account')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-accent font-mono transition-colors"
                      title={address}
                    >
                      {formatAddress(address)} ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Recent Transactions - Collapsible */}
              {(() => {
                const visibleRewards = rewards.filter((reward: any) => {
                  const hasValidTxHash =
                    reward.txHash &&
                    reward.txHash !== 'mint_failed' &&
                    reward.txHash !== 'mint_skipped_no_admin_key' &&
                    reward.txHash !== 'burn_failed';
                  return hasValidTxHash || reward.type === 'welcome_bonus';
                });

                if (visibleRewards.length === 0) {
                  return null;
                }

                return (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowRecentTxs(!showRecentTxs)}
                      className="w-full px-3 py-2 bg-bg-lcd/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded text-xs font-mono text-primary transition-all flex items-center justify-center gap-2"
                    >
                      <span>{showRecentTxs ? '▼' : '▶'}</span>
                      <span>RECENT TXS ({visibleRewards.length})</span>
                    </button>

                    {showRecentTxs && (
                      <div className="p-2 bg-bg-lcd/50 rounded border border-primary/10 space-y-1 animate-in fade-in duration-200">
                        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                          {visibleRewards.map((reward: any) => {
                            const hasValidTxHash =
                              reward.txHash &&
                              reward.txHash !== 'mint_failed' &&
                              reward.txHash !== 'mint_skipped_no_admin_key' &&
                              reward.txHash !== 'burn_failed';

                            if (hasValidTxHash) {
                              return (
                                <a
                                  key={reward.id}
                                  href={getSuiExplorerUrl(reward.txHash, 'tx')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block text-xs text-primary/70 hover:text-accent font-mono transition-colors truncate px-1 py-0.5 rounded hover:bg-primary/5"
                                  title={`${reward.description} - ${reward.txHash}`}
                                >
                                  {reward.amount > 0 ? '+' : ''}
                                  {reward.amount} DIARY ↗
                                </a>
                              );
                            } else {
                              return (
                                <div
                                  key={reward.id}
                                  className="block text-xs text-primary/70 font-mono truncate px-1 py-0.5"
                                  title={reward.description}
                                >
                                  {reward.amount > 0 ? '+' : ''}
                                  {reward.amount} DIARY
                                </div>
                              );
                            }
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Toggle Button */}
              <button
                onClick={() => setShowAchievements(!showAchievements)}
                className="w-full px-3 py-2 bg-bg-lcd/50 hover:bg-primary/10 border border-primary/20 hover:border-primary/40 rounded text-xs font-mono text-primary transition-all flex items-center justify-center gap-2"
              >
                <span>{showAchievements ? '▼' : '▶'}</span>
                <span>ACHIEVEMENTS</span>
              </button>

              {/* Achievements - Collapsible */}
              {showAchievements && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between p-2 bg-bg-lcd/30 rounded border border-primary/10 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/tamagochi-achievements-daily-crypto.svg"
                        alt="Streak"
                        className="w-10 h-10"
                        style={{
                          filter:
                            'brightness(0) saturate(100%) invert(69%) sepia(52%) saturate(2288%) hue-rotate(359deg) brightness(101%) contrast(101%)',
                        }}
                      />
                      <span className="text-xs text-primary/70 font-mono">STREAK</span>
                    </div>
                    <span className="text-sm font-bold text-streak font-mono drop-shadow-[0_0_4px_rgba(255,215,0,0.4)]">
                      {userData?.currentStreak ?? 0}
                    </span>
                  </div>

                  {/* Next Milestone Progress */}
                  {userData &&
                    (() => {
                      const nextMilestone = getNextMilestone(userData.currentStreak);
                      if (!nextMilestone) return null;

                      const progress = (userData.currentStreak / nextMilestone.streak) * 100;
                      const daysLeft = nextMilestone.streak - userData.currentStreak;

                      return (
                        <div className="p-2 bg-bg-lcd/50 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-primary/60 font-mono">
                              → {nextMilestone.label}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-tokens font-semibold font-mono">
                                +{nextMilestone.bonus}
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
                            </div>
                          </div>
                          <div className="w-full bg-inactive/30 rounded-full h-1.5 mb-1 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-streak to-tokens h-1.5 rounded-full transition-all duration-300 shadow-glow-cyan"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="text-xs text-primary/40 text-center font-mono">
                            {daysLeft}d to go
                          </div>
                        </div>
                      );
                    })()}

                  <div className="flex items-center justify-between p-2 bg-bg-lcd/30 rounded border border-primary/10 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-2">
                      <img
                        src="/assets/tamagochi-achievements-daily-crypto.svg"
                        alt="Best Streak"
                        className="w-10 h-10"
                        style={{
                          filter:
                            'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                        }}
                      />
                      <span className="text-xs text-primary/70 font-mono">BEST</span>
                    </div>
                    <span className="text-sm font-bold text-tokens font-mono drop-shadow-[0_0_4px_rgba(255,215,0,0.4)]">
                      {userData?.longestStreak ?? 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 bg-bg-lcd/30 rounded border border-primary/10 hover:border-primary/30 transition-all">
                    <span className="text-xs text-primary/70 font-mono">📝 TOTAL</span>
                    <span className="text-sm font-bold text-success font-mono drop-shadow-[0_0_4px_rgba(57,255,20,0.4)]">
                      {userData?.totalEntries ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pet - Fixed at bottom, always visible */}
        <div className="flex-shrink-0 p-4 border-t border-primary/20 bg-bg-dark">
          {userData && userData.selectedAnimal && (
            <Pet
              animal={userData.selectedAnimal as 'cat' | 'dog'}
              livesRemaining={userData.livesRemaining}
              petName={userData.petName || undefined}
              happiness={userData.happiness}
              lastFeedTime={userData.lastFeedTime}
              lastPlayTime={userData.lastPlayTime}
              inventory={userData.inventory || {}}
              petPersonality={userData.petPersonality}
              onStatsChange={onStatsChange}
            />
          )}
        </div>
      </div>
    </>
  );
}
