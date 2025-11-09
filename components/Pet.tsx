'use client';

import { useEffect, useState } from 'react';
import { getPetState, type PetState as EmotionState } from '@/lib/gamification/lifeSystem';
import { AsciiPet } from './AsciiPet';
import type { PetState as AnimationState } from '@/lib/ascii/types';
import { usePetStore, formatCooldown } from '@/lib/stores/petStore';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useMusic } from '@/lib/contexts/MusicContext';
import { FoodSelectModal } from './FoodSelectModal';

interface PetProps {
  animal: 'cat' | 'dog';
  livesRemaining: number;
  useImage?: boolean;
  petName?: string;
  happiness?: number;
  lastFeedTime?: string | null;
  lastPlayTime?: string | null;
  inventory?: Record<string, number>;
  petPersonality?: any;
  onStatsChange?: () => void;
}

export function Pet({
  animal,
  livesRemaining,
  useImage = false,
  petName,
  happiness = 100,
  lastFeedTime,
  lastPlayTime,
  inventory = {},
  petPersonality,
  onStatsChange,
}: PetProps) {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const [emotion, setEmotion] = useState<EmotionState>('happy');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [showFoodModal, setShowFoodModal] = useState(false);

  // Zustand store
  const petStore = usePetStore();

  // Music context (with fallback if provider not available)
  let isMusicPlaying = false;
  try {
    const musicContext = useMusic();
    isMusicPlaying = musicContext.isPlaying;
  } catch {
    // MusicProvider not available, skip music animation
  }

  // Sync pet store with server data when props change
  useEffect(() => {
    petStore.initializePet({
      lives: livesRemaining,
      happiness,
      lastFeedTime,
      lastPlayTime,
    });
  }, [livesRemaining, happiness, lastFeedTime, lastPlayTime]);

  // Update cooldowns every minute
  useEffect(() => {
    const interval = setInterval(() => {
      petStore.updateCooldowns();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setEmotion(getPetState(livesRemaining));
  }, [livesRemaining]);

  // Map emotion to animation state with priority
  const getAnimationState = (): AnimationState => {
    // Priority 1: Action states (eating/playing from store)
    // These are temporary and set by feed/play actions
    if (petStore.state === 'eating' || petStore.state === 'playing') {
      return petStore.state;
    }

    // Priority 2: Critical state (0 lives = game over)
    if (livesRemaining === 0) {
      return 'critical';
    }

    // Priority 3: Music state (pet dances when music plays!)
    if (isMusicPlaying) {
      return 'playing';
    }

    // Priority 4: Sleep state (inactive >12 hours)
    if (petStore.state === 'sleeping') {
      return 'sleeping';
    }

    // Priority 5: Mood-based states (happiness + lives)
    // Very happy: high happiness AND good health
    if (petStore.happiness >= 70 && livesRemaining >= 5) {
      return 'happy';
    }

    // Sad: low happiness OR low health
    if (petStore.happiness < 30 || livesRemaining <= 2) {
      return 'sad';
    }

    // Priority 6: Idle (default calm state)
    return 'idle';
  };

  // Health status text
  const healthStatus =
    emotion === 'critical' ? 'Critical' : emotion === 'sad' ? 'Needs Care' : 'Healthy';

  const healthColor =
    emotion === 'critical'
      ? 'text-red-400'
      : emotion === 'sad'
        ? 'text-orange-400'
        : 'text-green-400';

  // Happiness status
  const getHappinessStatus = () => {
    if (happiness >= 80) return 'Very Happy';
    if (happiness >= 60) return 'Happy';
    if (happiness >= 40) return 'Neutral';
    if (happiness >= 20) return 'Unhappy';
    return 'Very Sad';
  };

  const getHappinessColor = () => {
    if (happiness >= 80) return 'text-green-400';
    if (happiness >= 60) return 'text-yellow-400';
    if (happiness >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  // Handle feed action - now opens food select modal
  const handleFeedClick = () => {
    if (!address || actionInProgress || !petStore.canFeed) return;

    // Check if has any food in inventory
    const hasFoodInInventory = Object.values(inventory).some((count) => count > 0);
    if (!hasFoodInInventory) {
      alert('No food in inventory! Buy food from the shop first.');
      return;
    }

    setShowFoodModal(true);
  };

  // Handle food selection from modal
  const handleFoodSelect = async (foodId: string) => {
    if (!address || actionInProgress) return;

    setActionInProgress(true);
    try {
      await petStore.feed(address, foodId);
      // Refresh userData after successful feed
      if (onStatsChange) {
        onStatsChange();
      }
    } catch (error: any) {
      console.error('Feed failed:', error);
      alert(error.message || 'Failed to feed pet');
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle play action
  const handlePlay = async () => {
    if (!address || actionInProgress || !petStore.canPlay) return;

    setActionInProgress(true);
    try {
      await petStore.play(address);
      // Refresh userData after successful play
      if (onStatsChange) {
        onStatsChange();
      }
    } catch (error: any) {
      console.error('Play failed:', error);
      alert(error.message || 'Failed to play with pet');
    } finally {
      setActionInProgress(false);
    }
  };

  // Critical health effect classes
  const getCriticalEffectClasses = () => {
    if (livesRemaining === 0) {
      return 'animate-shake border-error/60 shadow-[0_0_20px_rgba(255,23,68,0.5)]';
    }
    if (livesRemaining <= 1) {
      return 'animate-pulse border-error/40 shadow-[0_0_15px_rgba(255,23,68,0.3)]';
    }
    if (livesRemaining <= 2 || petStore.happiness < 30) {
      return 'border-warning/40';
    }
    return 'border-primary/30';
  };

  return (
    <div className="text-center">
      {/* Tamagotchi Screen Container - LCD Style */}
      <div
        className={`bg-bg-card border-4 rounded-lg p-3 mx-2 shadow-glow-cyan transition-all ${getCriticalEffectClasses()}`}
      >
        {/* Pet Display - LCD Screen */}
        <div className="lcd-screen rounded p-2 mb-3 relative overflow-hidden min-h-[120px] flex items-center justify-center">
          {/* Critical Warning Overlay */}
          {livesRemaining <= 1 && (
            <div className="absolute top-1 right-1 text-error text-xs font-mono font-bold animate-pulse drop-shadow-[0_0_4px_rgba(255,23,68,0.8)]">
              [!CRITICAL!]
            </div>
          )}
          {livesRemaining === 2 && (
            <div className="absolute top-1 right-1 text-warning text-xs font-mono font-bold animate-pulse drop-shadow-[0_0_4px_rgba(255,193,7,0.8)]">
              [WARNING]
            </div>
          )}
          <AsciiPet animal={animal} state={getAnimationState()} />
        </div>

        {petName && (
          <div className="mb-3 font-display text-sm">
            <div className="text-primary font-bold tracking-wide">{petName}</div>
            <div className="text-primary/60 text-xs capitalize">{animal}</div>
          </div>
        )}

        {/* Stats Section */}
        <div className="space-y-2 text-left">
          {/* Health (Lives) - Tamagotchi Style */}
          <div className="bg-bg-lcd/50 border border-primary/20 rounded p-2 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-primary font-mono font-bold">HP</span>
              <span
                className={`text-xs font-mono font-bold ${healthColor === 'text-green-400' ? 'text-success' : healthColor === 'text-orange-400' ? 'text-warning' : 'text-error'}`}
              >
                {livesRemaining}/7
              </span>
            </div>
            <div className="flex gap-1 justify-center">
              {Array.from({ length: 7 }).map((_, i) => {
                const isActive = i < livesRemaining;
                return (
                  <span
                    key={i}
                    className={`
                      text-lg font-mono leading-none transition-all
                      ${
                        isActive
                          ? 'text-error drop-shadow-[0_0_4px_rgba(255,23,68,0.6)]'
                          : 'text-transparent'
                      }
                    `}
                    style={
                      !isActive
                        ? {
                            WebkitTextStroke: '1px rgba(255,255,255,0.4)',
                          }
                        : undefined
                    }
                  >
                    {isActive ? '♥' : livesRemaining === 0 && i === 0 ? '×' : '♡'}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Happiness - ASCII Bar */}
          <div className="bg-bg-lcd/50 border border-primary/20 rounded p-2 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-primary font-mono font-bold">JOY</span>
              <span
                className={`text-xs font-mono font-bold ${petStore.happiness >= 80 ? 'text-success' : petStore.happiness >= 60 ? 'text-tokens' : petStore.happiness >= 40 ? 'text-warning' : 'text-error'}`}
              >
                {petStore.happiness}%
              </span>
            </div>
            <div className="font-mono text-xs flex items-center gap-0.5">
              <span className="text-primary/40">[</span>
              <div className="flex-1 flex gap-px">
                {Array.from({ length: 50 }).map((_, i) => {
                  const threshold = (i + 1) * 2; // Each block = 2%
                  const isActive = petStore.happiness >= threshold;

                  let colorClass = 'bg-inactive/30';
                  if (isActive) {
                    if (petStore.happiness >= 80) colorClass = 'bg-success';
                    else if (petStore.happiness >= 60) colorClass = 'bg-tokens';
                    else if (petStore.happiness >= 40) colorClass = 'bg-warning';
                    else colorClass = 'bg-error';
                  }

                  return (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-[1px] ${colorClass} transition-colors duration-300`}
                    />
                  );
                })}
              </div>
              <span className="text-primary/40">]</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 space-y-1.5">
          {/* Feed Button */}
          <button
            onClick={handleFeedClick}
            disabled={!petStore.canFeed || actionInProgress || livesRemaining >= 7}
            className="w-full px-3 py-2 bg-transparent hover:bg-primary/10 disabled:bg-transparent disabled:text-disabled disabled:border-inactive border border-primary/40 hover:border-primary disabled:hover:border-inactive text-primary rounded font-mono text-xs transition-all flex items-center justify-between group hover:shadow-glow-cyan disabled:shadow-none"
          >
            <span className="font-semibold">
              {actionInProgress && petStore.state === 'eating' ? '[FEEDING...]' : '[FEED]'}
            </span>
            <span className="text-[10px] opacity-70 group-hover:opacity-100">
              {livesRemaining >= 7
                ? 'MAX HP'
                : petStore.canFeed
                  ? '◆ READY'
                  : formatCooldown(petStore.feedCooldownRemaining)}
            </span>
          </button>

          {/* Play Button */}
          <button
            onClick={handlePlay}
            disabled={!petStore.canPlay || actionInProgress || petStore.happiness >= 100}
            className="w-full px-3 py-2 bg-transparent hover:bg-accent/10 disabled:bg-transparent disabled:text-disabled disabled:border-inactive border border-accent/40 hover:border-accent disabled:hover:border-inactive text-accent rounded font-mono text-xs transition-all flex items-center justify-between group hover:shadow-glow-green disabled:shadow-none"
          >
            <span className="font-semibold">
              {actionInProgress && petStore.state === 'playing' ? '[PLAYING...]' : '[PLAY] +10☺'}
            </span>
            <span className="text-[10px] opacity-70 group-hover:opacity-100">
              {petStore.happiness >= 100
                ? 'MAX JOY'
                : petStore.canPlay
                  ? '◆ READY'
                  : formatCooldown(petStore.playCooldownRemaining)}
            </span>
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-2 pt-2 border-t border-primary/10">
          <div className="text-xs text-primary/50 font-mono text-center space-x-3 flex items-center justify-center">
            <span className="flex items-center gap-1">
              <span className="text-error text-base">♥</span>
              <span>=active</span>
            </span>
            <span className="flex items-center gap-1">
              <span
                className="text-transparent text-base"
                style={{
                  WebkitTextStroke: '1px rgba(255,255,255,0.4)',
                }}
              >
                ♡
              </span>
              <span>=lost</span>
            </span>
          </div>
        </div>
      </div>

      {/* Food Select Modal */}
      <FoodSelectModal
        isOpen={showFoodModal}
        onClose={() => setShowFoodModal(false)}
        inventory={inventory}
        onSelectFood={handleFoodSelect}
        petPersonality={petPersonality}
      />
    </div>
  );
}
