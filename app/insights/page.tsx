'use client';

import { useEffect, useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from 'next/navigation';
import { WeeklySummaryModal } from '@/components/WeeklySummaryModal';
import { BottomNavOverlay } from '@/components/BottomNavOverlay';

interface WeeklySummary {
  id: string;
  weekStart: string;
  weekEnd: string;
  emotions: any;
  summary: string;
  insights: string[];
  trend: 'improving' | 'stable' | 'declining';
  createdAt: string;
}

const TREND_CONFIG = {
  improving: { emoji: '📈', label: 'Improving', color: 'text-success' },
  stable: { emoji: '➡️', label: 'Stable', color: 'text-primary' },
  declining: { emoji: '📉', label: 'Needs Attention', color: 'text-warning' },
};

export default function InsightsPage() {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const router = useRouter();
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSummary, setSelectedSummary] = useState<WeeklySummary | null>(null);

  useEffect(() => {
    if (!address) {
      router.push('/');
      return;
    }

    loadSummaries();
  }, [address, router]);

  async function loadSummaries() {
    if (!address) return;

    try {
      const res = await fetch(`/api/summary/history?userAddress=${address}`);
      const data = await res.json();

      if (res.ok) {
        setSummaries(data.summaries || []);
      }
    } catch (error) {
      console.error('Failed to load summaries:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function getWeekLabel(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-dark text-primary flex items-center justify-center">
        <div className="text-center">
          <div className="font-mono text-lg mb-4 animate-pulse">Loading...</div>
          <div className="text-primary/40 font-mono text-sm">Loading Insights</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-bg-dark text-white p-8 pb-40">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold mb-2 text-primary drop-shadow-[0_0_10px_rgba(0,229,255,0.3)] flex items-center gap-3">
              <img
                src="/assets/tamagochi-total-score.svg"
                alt="Insights"
                className="w-10 h-10"
                style={{
                  filter:
                    'brightness(0) saturate(100%) invert(71%) sepia(86%) saturate(2872%) hue-rotate(155deg) brightness(101%) contrast(101%)',
                }}
              />
              Your Insights
            </h1>
            <p className="text-primary/60 font-mono">All your weekly emotional analyses</p>
          </div>

          {/* Summaries List */}
          {summaries.length === 0 ? (
            <div className="text-center py-12 bg-bg-card rounded-xl border border-primary/20 shadow-glow-cyan">
              <div className="mb-4 flex justify-center">
                <img
                  src="/assets/tamagochi-total-score.svg"
                  alt="Insights"
                  className="w-20 h-20"
                  style={{
                    filter:
                      'brightness(0) saturate(100%) invert(71%) sepia(86%) saturate(2872%) hue-rotate(155deg) brightness(101%) contrast(101%)',
                  }}
                />
              </div>
              <h2 className="text-2xl font-display font-bold mb-2 text-primary">No Insights Yet</h2>
              <p className="text-primary/60 font-mono mb-4">
                Generate your first weekly analysis to see insights here
              </p>
              <button
                onClick={() => router.push('/diary')}
                className="btn-primary px-6 py-3 rounded-lg font-mono font-semibold transition-all"
              >
                [GO TO DIARY]
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-40">
              {summaries.map((summary) => {
                const trendInfo = TREND_CONFIG[summary.trend];
                const topEmotion = Object.entries(summary.emotions).sort(
                  ([, a], [, b]) => (b as number) - (a as number)
                )[0];

                return (
                  <div
                    key={summary.id}
                    onClick={() => setSelectedSummary(summary)}
                    className="bg-bg-card border border-primary/20 rounded-xl p-6 cursor-pointer hover:border-primary/60 transition-all hover:scale-105 shadow-glow-cyan"
                  >
                    {/* Date */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-primary/60 font-mono">
                        {getWeekLabel(summary.weekStart, summary.weekEnd)}
                      </div>
                      <div className={`text-xl ${trendInfo.color}`}>{trendInfo.emoji}</div>
                    </div>

                    {/* Summary Preview */}
                    <p className="text-sm text-primary/70 mb-4 line-clamp-3 font-mono leading-relaxed">
                      {summary.summary}
                    </p>

                    {/* Top Emotion */}
                    <div className="flex items-center gap-2 mb-3 bg-bg-lcd/30 p-2 rounded border border-primary/10">
                      <span className="text-xs text-primary/50 font-mono">Top Emotion:</span>
                      <span className="text-sm font-bold capitalize text-primary font-mono">
                        {topEmotion[0]} ({Number(topEmotion[1])}%)
                      </span>
                    </div>

                    {/* Insights Count */}
                    <div className="flex items-center gap-2 text-xs text-primary/40 font-mono">
                      <div className="flex items-center gap-1">
                        <img
                          src="/assets/tamagochi-info-about-gamification.svg"
                          alt="Insights"
                          className="w-3 h-3"
                          style={{
                            filter:
                              'brightness(0) saturate(100%) invert(71%) sepia(86%) saturate(2872%) hue-rotate(155deg) brightness(101%) contrast(101%) opacity(0.4)',
                          }}
                        />
                        <span>{summary.insights.length} insights</span>
                      </div>
                      <span>•</span>
                      <span>{formatDate(summary.createdAt)}</span>
                    </div>

                    {/* View Button */}
                    <button className="mt-4 w-full px-4 py-2 bg-transparent hover:bg-primary/10 border border-primary/40 hover:border-primary rounded-lg text-sm font-mono font-semibold transition-all text-primary hover:shadow-glow-cyan">
                      [VIEW DETAILS]
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Summary Modal */}
      {selectedSummary && (
        <WeeklySummaryModal
          isOpen={!!selectedSummary}
          onClose={() => setSelectedSummary(null)}
          weekLabel={getWeekLabel(selectedSummary.weekStart, selectedSummary.weekEnd)}
          emotions={selectedSummary.emotions}
          summary={selectedSummary.summary}
          insights={selectedSummary.insights}
          trend={selectedSummary.trend}
        />
      )}
    </>
  );
}
