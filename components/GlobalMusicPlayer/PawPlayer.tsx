'use client';

import React from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { usePathname } from 'next/navigation';
import { useMusicPlayerStore, type Genre as GenreType } from '@/lib/stores/musicPlayerStore';

export const PawPlayer: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const pathname = usePathname();
  const { currentGenre, isPlaying, setGenre, togglePlay } = useMusicPlayerStore();

  // Don't show player if not connected, on home page, or during onboarding
  if (!currentAccount || pathname === '/' || pathname === '/onboarding') {
    return null;
  }

  const genres: {
    id: GenreType;
    label: string;
    iconPath: string;
    colorFilter: string;
    glowColor: string;
  }[] = [
    {
      id: 'ambient',
      label: 'Ambient',
      iconPath: '/assets/-ambient-genre-music-tamagochi.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(39%) sepia(93%) saturate(6472%) hue-rotate(245deg) brightness(99%) contrast(97%)', // purple
      glowColor: 'rgba(168, 85, 247, 0.4)', // purple glow
    },
    {
      id: 'lofi',
      label: 'Lo-Fi',
      iconPath: '/assets/tamagochi-player-lofi-genre.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(69%) sepia(52%) saturate(2288%) hue-rotate(359deg) brightness(101%) contrast(101%)', // orange
      glowColor: 'rgba(255, 140, 0, 0.4)', // orange glow
    },
    {
      id: 'nature',
      label: 'Nature',
      iconPath: '/assets/nature-genre-music-tamagochi.svg',
      colorFilter:
        'brightness(0) saturate(100%) invert(78%) sepia(61%) saturate(464%) hue-rotate(45deg) brightness(103%) contrast(106%)', // green
      glowColor: 'rgba(200, 230, 109, 0.4)', // green glow
    },
  ];

  return (
    <div className="fixed bottom-4 left-16 z-40 pointer-events-none">
      <div className="pointer-events-auto relative w-48 h-48">
        {/* Rotating text */}
        <div
          className="absolute left-0 right-0 flex items-center justify-center pointer-events-none top-[25px] animate-rotate-slow"
          style={{ animationPlayState: isPlaying ? 'running' : 'paused' }}
        >
          <svg viewBox="0 0 200 200" className="w-48 h-48">
            <defs>
              <path
                id="circlePath"
                d="M 100, 100 m -80, 0 a 80,80 0 1,1 160,0 a 80,80 0 1,1 -160,0"
              />
            </defs>
            <text className="text-[10px] fill-white/40 font-mono uppercase tracking-widest">
              <textPath href="#circlePath" startOffset="0%">
                enjoy music powered by{' '}
                <tspan fill="#FC018C" fillOpacity="0.8">
                  mubert
                </tspan>{' '}
                ★ ★ ★ enjoy music powered by{' '}
                <tspan fill="#FC018C" fillOpacity="0.8">
                  mubert
                </tspan>{' '}
                ★ ★ ★
              </textPath>
            </text>
          </svg>
        </div>
        {/* Ambient (left, lower) */}
        <button
          onClick={() => setGenre('ambient')}
          className="absolute left-7 top-20 transition-all duration-200 hover:scale-110"
        >
          <div
            className={`
              rounded-full flex items-center justify-center
              backdrop-blur-md border border-primary/20
              transition-all duration-300
              ${currentGenre === 'ambient' && isPlaying ? 'animate-pulse-slower' : ''}
            `}
            style={{
              width: currentGenre === 'ambient' ? '48px' : '44px',
              height: currentGenre === 'ambient' ? '48px' : '44px',
              backgroundColor:
                currentGenre === 'ambient' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 229, 255, 0.3)',
              boxShadow: currentGenre === 'ambient' ? `0 0 12px ${genres[0].glowColor}` : 'none',
            }}
          >
            <img
              src={genres[0].iconPath}
              alt="Ambient"
              className="w-9 h-9 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
              style={{
                filter: genres[0].colorFilter,
              }}
            />
          </div>
        </button>

        {/* Lo-Fi (center, higher) */}
        <button
          onClick={() => setGenre('lofi')}
          className="absolute left-1/2 -translate-x-1/2 top-14 transition-all duration-200 hover:scale-110"
        >
          <div
            className={`
              rounded-full flex items-center justify-center
              backdrop-blur-md border border-primary/20
              transition-all duration-300
              ${currentGenre === 'lofi' && isPlaying ? 'animate-pulse-slower' : ''}
            `}
            style={{
              width: currentGenre === 'lofi' ? '48px' : '44px',
              height: currentGenre === 'lofi' ? '48px' : '44px',
              backgroundColor:
                currentGenre === 'lofi' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 229, 255, 0.3)',
              boxShadow: currentGenre === 'lofi' ? `0 0 12px ${genres[1].glowColor}` : 'none',
            }}
          >
            <img
              src={genres[1].iconPath}
              alt="Lo-Fi"
              className="w-9 h-9 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
              style={{
                filter: genres[1].colorFilter,
              }}
            />
          </div>
        </button>

        {/* Nature (right, lower) */}
        <button
          onClick={() => setGenre('nature')}
          className="absolute right-7 top-20 transition-all duration-200 hover:scale-110"
        >
          <div
            className={`
              rounded-full flex items-center justify-center
              backdrop-blur-md border border-primary/20
              transition-all duration-300
              ${currentGenre === 'nature' && isPlaying ? 'animate-pulse-slower' : ''}
            `}
            style={{
              width: currentGenre === 'nature' ? '48px' : '44px',
              height: currentGenre === 'nature' ? '48px' : '44px',
              backgroundColor:
                currentGenre === 'nature' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 229, 255, 0.3)',
              boxShadow: currentGenre === 'nature' ? `0 0 12px ${genres[2].glowColor}` : 'none',
            }}
          >
            <img
              src={genres[2].iconPath}
              alt="Nature"
              className="w-9 h-9 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]"
              style={{
                filter: genres[2].colorFilter,
              }}
            />
          </div>
        </button>

        {/* Play/Pause button (center bottom - "подушечка лапы") */}
        <button
          onClick={togglePlay}
          className="absolute left-1/2 -translate-x-1/2 bottom-0 transition-all hover:scale-110"
        >
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center backdrop-blur-md border ${
              isPlaying ? 'border-primary animate-pulse-slow' : 'border-primary/40'
            }`}
            style={{
              backgroundColor: isPlaying ? 'rgba(0, 229, 255, 0.4)' : 'rgba(0, 229, 255, 0.2)',
              boxShadow: isPlaying ? '0 0 20px rgba(0, 229, 255, 0.6)' : 'none',
            }}
          >
            <img
              src="/assets/tamagochi-player-mainbutton.svg"
              alt={isPlaying ? 'Pause' : 'Play'}
              className="w-16 h-16 object-contain"
              style={{
                filter: isPlaying
                  ? 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(160deg) brightness(103%) contrast(101%)'
                  : 'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(160deg) brightness(80%) contrast(101%)',
              }}
            />
          </div>
        </button>
      </div>
    </div>
  );
};
