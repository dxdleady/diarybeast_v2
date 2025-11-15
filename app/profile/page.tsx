'use client';

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pet } from '@/components/Pet';
import { BottomNavOverlay } from '@/components/BottomNavOverlay';
import { formatAddress } from '@mysten/sui.js/utils';

type TabType = 'overview' | 'achievements' | 'analysis';

export default function Profile() {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const [userData, setUserData] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiAnalysisEnabled, setAiAnalysisEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  useEffect(() => {
    loadUserData();
  }, [address]);

  async function loadUserData() {
    if (!address) return;

    setLoading(true);
    try {
      // OPTIMIZATION: Use cache-busting timestamp and parallel requests
      const timestamp = Date.now();
      const [userRes, entriesRes] = await Promise.all([
        fetch(`/api/user/${address}?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/entries?userAddress=${address}&t=${timestamp}`, { cache: 'no-store' }),
      ]);

      const userData = await userRes.json();
      const entriesData = await entriesRes.json();

      setUserData(userData);
      setEntries(entriesData.entries || []);
      setAiAnalysisEnabled(userData.aiAnalysisEnabled || false);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAiAnalysis(enabled: boolean) {
    if (!address) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/user/${address}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiAnalysisEnabled: enabled }),
      });

      if (!res.ok) {
        throw new Error('Failed to update settings');
      }

      setAiAnalysisEnabled(enabled);
    } catch (error) {
      console.error('Failed to update:', error);
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-lg mb-4 animate-pulse">Loading...</div>
          <div className="text-primary/40 font-mono text-sm">Loading Profile</div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-bg-dark text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-lg mb-4">User not found</div>
          <Link href="/" className="text-primary/60 hover:text-primary font-mono text-sm">
            ← Return Home
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', iconPath: '/assets/pet-profile-tamagochi.svg' },
    {
      id: 'achievements' as TabType,
      label: 'Achievements',
      iconPath: '/assets/tamagochi-achievements-daily-crypto.svg',
    },
    {
      id: 'analysis' as TabType,
      label: 'Deep Analysis',
      iconPath: '/assets/get-hidden-insights-about-your-thoughts--tamagochi.svg',
    },
  ];

  return (
    <div className="min-h-screen bg-bg-dark text-white p-8 pb-40">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-display font-bold text-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">
            Profile
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-primary/20 pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-all font-mono ${
                  isActive
                    ? 'bg-primary/20 text-primary border-b-2 border-primary shadow-glow-cyan'
                    : 'text-primary/60 hover:bg-primary/10 hover:text-primary'
                }`}
              >
                <img
                  src={tab.iconPath}
                  alt={tab.label}
                  className="w-6 h-6"
                  style={{
                    filter: isActive
                      ? 'brightness(0) saturate(100%) invert(71%) sepia(86%) saturate(2872%) hue-rotate(155deg) brightness(101%) contrast(101%)'
                      : 'brightness(0) saturate(100%) invert(71%) sepia(86%) saturate(2872%) hue-rotate(155deg) brightness(101%) contrast(101%) opacity(0.6)',
                  }}
                />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Wallet Info */}
            <div className="bg-bg-card border border-primary/20 rounded-xl p-6 hover:border-primary/40 transition-all shadow-glow-cyan md:col-span-3">
              <h2 className="text-lg font-display font-semibold mb-4 text-primary">Wallet</h2>
              {address && (
                <div className="flex flex-col gap-1">
                  <div className="text-lg text-primary font-mono font-bold">
                    {formatAddress(address)}
                  </div>
                  <div className="text-sm text-primary/60 font-mono">{address}</div>
                </div>
              )}
            </div>

            {/* Pet - Current State */}
            <div className="bg-bg-card border border-primary/20 rounded-xl p-6 hover:border-primary/40 transition-all shadow-glow-cyan">
              <h2 className="text-lg font-display font-semibold mb-4 text-primary">Your Beast</h2>
              <Pet
                animal={userData.selectedAnimal}
                livesRemaining={userData.livesRemaining}
                petName={userData.petName}
                happiness={userData.happiness}
                lastFeedTime={userData.lastFeedTime}
                lastPlayTime={userData.lastPlayTime}
                inventory={userData.inventory || {}}
                petPersonality={userData.petPersonality}
                onStatsChange={loadUserData}
              />
            </div>

            {/* Stats - Compact */}
            <div className="bg-bg-card border border-primary/20 rounded-xl p-6 hover:border-primary/40 transition-all shadow-glow-cyan md:col-span-2">
              <h2 className="text-lg font-display font-semibold mb-4 text-primary">Statistics</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center p-3 bg-bg-lcd/30 rounded-lg border border-primary/10 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2">
                    <img
                      src="/assets/tamagochi-coin.svg"
                      alt="DIARY"
                      className="w-5 h-5"
                      style={{
                        filter:
                          'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                      }}
                    />
                    <span className="text-xs text-primary/70 font-mono">DIARY</span>
                  </div>
                  <span className="text-lg font-bold text-tokens font-mono drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
                    {userData.coinsBalance}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-lcd/30 rounded-lg border border-primary/10 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2">
                    <img
                      src="/assets/tamagochi-achievements-daily-crypto.svg"
                      alt="Streak"
                      className="w-5 h-5"
                      style={{
                        filter:
                          'brightness(0) saturate(100%) invert(69%) sepia(52%) saturate(2288%) hue-rotate(359deg) brightness(101%) contrast(101%)',
                      }}
                    />
                    <span className="text-xs text-primary/70 font-mono">STREAK</span>
                  </div>
                  <span className="text-lg font-bold text-streak font-mono drop-shadow-[0_0_6px_rgba(255,165,0,0.5)]">
                    {userData.currentStreak}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-lcd/30 rounded-lg border border-primary/10 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2">
                    <img
                      src="/assets/tamagochi-achievements-daily-crypto.svg"
                      alt="Best"
                      className="w-5 h-5"
                      style={{
                        filter:
                          'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                      }}
                    />
                    <span className="text-xs text-primary/70 font-mono">BEST</span>
                  </div>
                  <span className="text-lg font-bold text-tokens font-mono drop-shadow-[0_0_6px_rgba(255,215,0,0.5)]">
                    {userData.longestStreak}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-bg-lcd/30 rounded-lg border border-primary/10 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2">
                    <img
                      src="/assets/diary-beast-tamagochi.svg"
                      alt="Total"
                      className="w-5 h-5"
                      style={{
                        filter:
                          'brightness(0) saturate(100%) invert(71%) sepia(86%) saturate(2872%) hue-rotate(155deg) brightness(101%) contrast(101%)',
                      }}
                    />
                    <span className="text-xs text-primary/70 font-mono">TOTAL</span>
                  </div>
                  <span className="text-lg font-bold text-success font-mono drop-shadow-[0_0_6px_rgba(57,255,20,0.5)]">
                    {userData.totalEntries}
                  </span>
                </div>
              </div>
            </div>

            {/* Settings - Compact */}
            <div className="bg-bg-card border border-primary/20 rounded-xl p-6 md:col-span-3 hover:border-primary/40 transition-all shadow-glow-cyan">
              <h2 className="text-lg font-display font-semibold mb-4 text-primary">Settings</h2>
              <div className="space-y-4">
                {/* AI Analysis Toggle */}
                <div className="flex items-center justify-between p-4 bg-bg-lcd/30 rounded-lg border border-primary/10 hover:border-primary/30 transition-all">
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-sm text-primary mb-1">
                      AI Analysis
                    </h3>
                    <p className="text-xs text-primary/50 font-mono">
                      Enable AI-powered insights and mood tracking
                    </p>
                  </div>
                  <label className="relative inline-block w-12 h-6 ml-4">
                    <input
                      type="checkbox"
                      checked={aiAnalysisEnabled}
                      onChange={(e) => handleToggleAiAnalysis(e.target.checked)}
                      disabled={saving}
                      className="opacity-0 w-0 h-0 peer"
                    />
                    <span className="absolute cursor-pointer inset-0 bg-inactive rounded-full transition-colors peer-checked:bg-primary peer-disabled:opacity-50 border border-primary/20 peer-checked:shadow-glow-cyan">
                      <span className="absolute left-1 top-1 bg-bg-dark w-4 h-4 rounded-full transition-transform peer-checked:translate-x-6 border border-primary/40"></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === 'achievements' && (
          <div className="bg-bg-card border border-primary/20 rounded-xl p-8 hover:border-primary/40 transition-all shadow-glow-cyan">
            <div className="text-center py-12">
              <img
                src="/assets/tamagochi-achievements-daily-crypto.svg"
                alt="Achievements"
                className="w-24 h-24 mx-auto mb-6"
                style={{
                  filter:
                    'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                }}
              />
              <h2 className="text-2xl font-display font-bold text-primary mb-3">
                Achievements Coming Soon
              </h2>
              <p className="text-primary/60 font-mono text-sm max-w-md mx-auto">
                Track your milestones, streaks, and special accomplishments. Earn badges for your
                diary journey!
              </p>
              <div className="mt-6 flex gap-4 justify-center flex-wrap">
                <div className="bg-bg-lcd/30 rounded-lg p-4 border border-primary/10 w-32">
                  <div className="text-2xl mb-2">🔥</div>
                  <div className="text-xs text-primary/50 font-mono">Streak Master</div>
                </div>
                <div className="bg-bg-lcd/30 rounded-lg p-4 border border-primary/10 w-32">
                  <div className="text-2xl mb-2">✍️</div>
                  <div className="text-xs text-primary/50 font-mono">Prolific Writer</div>
                </div>
                <div className="bg-bg-lcd/30 rounded-lg p-4 border border-primary/10 w-32">
                  <div className="text-2xl mb-2">⭐</div>
                  <div className="text-xs text-primary/50 font-mono">First Entry</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deep Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="bg-bg-card border border-primary/20 rounded-xl p-8 hover:border-primary/40 transition-all shadow-glow-cyan">
            <div className="text-center py-12">
              <img
                src="/assets/get-hidden-insights-about-your-thoughts--tamagochi.svg"
                alt="Deep Analysis"
                className="w-24 h-24 mx-auto mb-6"
                style={{
                  filter:
                    'brightness(0) saturate(100%) invert(71%) sepia(86%) saturate(2872%) hue-rotate(155deg) brightness(101%) contrast(101%)',
                }}
              />
              <h2 className="text-2xl font-display font-bold text-primary mb-3">
                Deep Notes Analysis Coming Soon
              </h2>
              <p className="text-primary/60 font-mono text-sm max-w-md mx-auto mb-6">
                AI-powered insights into your writing patterns, emotional trends, and personal
                growth over time.
              </p>
              <div className="bg-bg-lcd/30 rounded-lg p-6 border border-primary/10 max-w-md mx-auto">
                <div className="space-y-3 text-sm font-mono text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-primary">✓</span>
                    <span className="text-primary/70">Sentiment analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary">✓</span>
                    <span className="text-primary/70">Writing pattern detection</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary">✓</span>
                    <span className="text-primary/70">Topic clustering</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-primary">✓</span>
                    <span className="text-primary/70">Growth tracking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
