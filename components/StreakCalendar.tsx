'use client';

import { getNextMilestone } from '@/lib/gamification/streakRewards';

interface Entry {
  id: string;
  date: string;
}

interface StreakCalendarProps {
  entries: Entry[];
  currentStreak: number;
}

export function StreakCalendar({ entries, currentStreak }: StreakCalendarProps) {
  // Get last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date;
  });

  // Check which days have entries
  const hasEntry = (date: Date) => {
    return entries.some((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === date.getTime();
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date.getTime() === today.getTime();
  };

  return (
    <div>
      <div className="text-xs text-primary/60 mb-2 text-center font-mono font-bold tracking-wider">
        LAST 7 DAYS
      </div>
      <div className="flex items-center justify-center gap-1">
        {last7Days.map((date, index) => {
          const hasEntryForDay = hasEntry(date);
          const isTodayDate = isToday(date);
          const dayNumber = date.getDate();

          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-all font-mono border ${
                  hasEntryForDay
                    ? 'bg-success/20 text-success border-success/40 drop-shadow-[0_0_4px_rgba(57,255,20,0.4)]'
                    : isTodayDate
                      ? 'bg-warning/20 text-warning border-warning animate-pulse drop-shadow-[0_0_4px_rgba(255,165,0,0.4)]'
                      : 'bg-bg-lcd/30 text-primary/40 border-primary/20'
                }`}
                title={date.toLocaleDateString()}
              >
                {hasEntryForDay ? '✓' : dayNumber}
              </div>
            </div>
          );
        })}
      </div>
      {currentStreak > 0 && (
        <div className="text-xs text-center mt-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <div className="text-streak font-semibold font-mono drop-shadow-[0_0_4px_rgba(255,165,0,0.4)] flex items-center gap-1.5">
              <img
                src="/assets/tamagochi-achievements-daily-crypto.svg"
                alt="Streak"
                className="w-5 h-5"
                style={{
                  filter:
                    'brightness(0) saturate(100%) invert(69%) sepia(52%) saturate(2288%) hue-rotate(359deg) brightness(101%) contrast(101%)',
                }}
              />
              <span>{currentStreak} day streak!</span>
            </div>
            {(() => {
              const nextMilestone = getNextMilestone(currentStreak);
              if (!nextMilestone) {
                return (
                  <div className="text-tokens font-mono drop-shadow-[0_0_4px_rgba(255,215,0,0.4)]">
                    🏆 Max milestone reached!
                  </div>
                );
              }
              const daysLeft = nextMilestone.streak - currentStreak;
              return (
                <div className="text-primary/60 font-mono flex items-center gap-1.5">
                  <span>
                    {daysLeft} more for +{nextMilestone.bonus}
                  </span>
                  <img
                    src="/assets/tamagochi-coin.svg"
                    alt="DIARY"
                    className="w-5 h-5"
                    style={{
                      filter:
                        'brightness(0) saturate(100%) invert(80%) sepia(48%) saturate(1000%) hue-rotate(2deg) brightness(104%) contrast(101%)',
                    }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
