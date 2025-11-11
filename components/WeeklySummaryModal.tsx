'use client';

interface PlutchikEmotions {
  joy: number;
  trust: number;
  fear: number;
  surprise: number;
  sadness: number;
  disgust: number;
  anger: number;
  anticipation: number;
}

interface WeeklySummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekLabel: string;
  emotions: PlutchikEmotions;
  summary: string;
  insights: string[];
  trend: 'improving' | 'stable' | 'declining';
  newBalance?: number;
}

const EMOTION_CONFIG = {
  joy: { emoji: '😊', color: 'bg-yellow-500', label: 'Joy' },
  trust: { emoji: '🤝', color: 'bg-green-500', label: 'Trust' },
  fear: { emoji: '😨', color: 'bg-purple-500', label: 'Fear' },
  surprise: { emoji: '😲', color: 'bg-orange-500', label: 'Surprise' },
  sadness: { emoji: '😢', color: 'bg-blue-500', label: 'Sadness' },
  disgust: { emoji: '🤢', color: 'bg-pink-500', label: 'Disgust' },
  anger: { emoji: '😡', color: 'bg-red-500', label: 'Anger' },
  anticipation: { emoji: '🎯', color: 'bg-cyan-500', label: 'Anticipation' },
};

const TREND_CONFIG = {
  improving: { emoji: '📈', label: 'Improving', color: 'text-green-400' },
  stable: { emoji: '➡️', label: 'Stable', color: 'text-blue-400' },
  declining: { emoji: '📉', label: 'Needs Attention', color: 'text-orange-400' },
};

export function WeeklySummaryModal({
  isOpen,
  onClose,
  weekLabel,
  emotions,
  summary,
  insights,
  trend,
  newBalance,
}: WeeklySummaryModalProps) {
  if (!isOpen) return null;

  // Sort emotions by intensity
  const sortedEmotions = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a)
    .map(([emotion, intensity]) => ({
      emotion: emotion as keyof PlutchikEmotions,
      intensity,
    }));

  const trendInfo = TREND_CONFIG[trend];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-bg-card rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-primary/20 shadow-glow-cyan">
        {/* Header */}
        <div className="flex-shrink-0 bg-bg-card border-b border-primary/20 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-primary flex items-center gap-2 drop-shadow-[0_0_6px_rgba(0,229,255,0.3)]">
              📊 Weekly Analysis
            </h2>
            <p className="text-primary/60 text-sm mt-1 font-mono">{weekLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="text-primary/60 hover:text-primary transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <div className="p-6 space-y-6 font-mono pb-32">
            {/* Cost Info */}
            {newBalance !== undefined && (
              <div className="bg-accent/20 border border-accent rounded-lg p-4 text-center">
                <div className="text-sm text-primary/70 flex items-center justify-center gap-2">
                  <span>Analysis Cost:</span>
                  <img
                    src="/assets/tamagochi-coin.svg"
                    alt="DIARY"
                    className="w-4 h-4 inline"
                    style={{
                      filter:
                        'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                    }}
                  />
                  <span>50 DIARY</span>
                </div>
                <div className="text-lg font-semibold text-primary mt-1 flex items-center justify-center gap-2">
                  <span>New Balance:</span>
                  <img
                    src="/assets/tamagochi-coin.svg"
                    alt="DIARY"
                    className="w-5 h-5 inline"
                    style={{
                      filter:
                        'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                    }}
                  />
                  <span>{newBalance} DIARY</span>
                </div>
              </div>
            )}

            {/* Emotion Wheel */}
            <section>
              <h3 className="text-xl font-display font-bold text-primary mb-4 flex items-center gap-2 drop-shadow-[0_0_4px_rgba(0,229,255,0.3)]">
                🎭 Plutchik&apos;s Emotions
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sortedEmotions.map(({ emotion, intensity }) => {
                  const config = EMOTION_CONFIG[emotion];
                  return (
                    <div
                      key={emotion}
                      className="bg-bg-lcd/50 border border-primary/20 rounded-lg p-3 text-center"
                    >
                      <div className="text-3xl mb-2">{config.emoji}</div>
                      <div className="text-sm font-medium text-primary mb-2">{config.label}</div>
                      <div className="w-full bg-bg-lcd/80 border border-primary/10 rounded-full h-2 mb-1">
                        <div
                          className={`h-2 rounded-full ${config.color} transition-all duration-300`}
                          style={{ width: `${intensity}%` }}
                        />
                      </div>
                      <div className="text-xs text-primary/60">{intensity}%</div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Summary */}
            <section>
              <h3 className="text-xl font-display font-bold text-primary mb-3 flex items-center gap-2 drop-shadow-[0_0_4px_rgba(0,229,255,0.3)]">
                📝 Summary
              </h3>
              <div className="bg-bg-lcd/50 border border-primary/20 rounded-lg p-4">
                <p className="text-primary/90 leading-relaxed">{summary}</p>
              </div>
            </section>

            {/* Key Insights */}
            <section>
              <h3 className="text-xl font-display font-bold text-primary mb-3 flex items-center gap-2 drop-shadow-[0_0_4px_rgba(0,229,255,0.3)]">
                💡 Key Insights
              </h3>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    className="bg-bg-lcd/50 border border-primary/20 rounded-lg p-4 flex items-start gap-3"
                  >
                    <span className="text-primary font-bold">#{index + 1}</span>
                    <p className="text-primary/90 flex-1">{insight}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Emotional Trend */}
            <section>
              <h3 className="text-xl font-display font-bold text-primary mb-3 flex items-center gap-2 drop-shadow-[0_0_4px_rgba(0,229,255,0.3)]">
                📊 Emotional Trend
              </h3>
              <div className="bg-bg-lcd/50 border border-primary/20 rounded-lg p-4 text-center">
                <div className="text-4xl mb-2">{trendInfo.emoji}</div>
                <div className={`text-2xl font-bold ${trendInfo.color}`}>{trendInfo.label}</div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 bg-bg-card border-t border-primary/20 p-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 btn-primary rounded-lg font-semibold transition-colors"
          >
            [CLOSE]
          </button>
        </div>
      </div>
    </div>
  );
}
