'use client';

import Image from 'next/image';
import { WalletConnect } from '@/components/WalletConnect';
import { PetEvolution } from '@/components/PetEvolution';
import { useAuth } from '@/lib/useAuth';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useEffect, useState } from 'react';

export default function Home() {
  const { loading, error, authenticate } = useAuth();
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-authenticate when wallet connects (only once per address)
  useEffect(() => {
    if (!mounted || !address) return;

    // Check if we already tried to authenticate for this address
    const authKey = `auth_attempted_${address.toLowerCase()}`;
    const hasAttempted = sessionStorage.getItem(authKey);

    if (!hasAttempted) {
      sessionStorage.setItem(authKey, 'true');
      // Use setTimeout to ensure it only runs once even if effect runs multiple times
      const timeoutId = setTimeout(() => {
        authenticate();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [mounted, address, authenticate]);

  // Clear auth attempt flag when address changes
  useEffect(() => {
    if (address) {
      const authKey = `auth_attempted_${address.toLowerCase()}`;
      return () => {
        sessionStorage.removeItem(authKey);
      };
    }
  }, [address]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bg-dark text-primary px-4 py-6">
      <div className="text-center max-w-5xl w-full space-y-4">
        {/* Logo + Brand Name */}
        <div className="flex items-center justify-center gap-4">
          <div
            className="relative w-20 h-20 md:w-24 md:h-24 drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]"
            style={{
              filter:
                'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(160deg) brightness(103%) contrast(101%)',
            }}
          >
            <Image
              src="/assets/diary-beast-logo-mono.svg"
              alt="DiaryBeast"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="text-left">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-primary drop-shadow-[0_0_15px_rgba(0,229,255,0.4)] leading-tight">
              DIARY
            </h1>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-primary drop-shadow-[0_0_15px_rgba(0,229,255,0.4)] leading-tight">
              BEAST
            </h1>
          </div>
        </div>

        {/* Main Question */}
        <h2 className="text-lg md:text-xl font-display font-semibold text-primary/90 leading-tight">
          What if your mental health had a face?
        </h2>

        {/* Pet Evolution Timeline */}
        <div className="py-3">
          <PetEvolution />
        </div>

        {/* Connection Message */}
        <p className="text-sm font-mono text-primary/80 italic">
          Your consistency & curiosity. Their evolution.
        </p>

        {/* Simple Process */}
        <div className="flex items-center justify-center gap-4 md:gap-6 font-mono text-sm">
          <div className="flex flex-col items-center gap-1">
            <div
              className="relative w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_10px_rgba(0,229,255,0.5)]"
              style={{
                filter:
                  'brightness(0) saturate(100%) invert(70%) sepia(98%) saturate(2476%) hue-rotate(160deg) brightness(103%) contrast(101%)',
              }}
            >
              <Image
                src="/assets/diary-beast-tamagochi.svg"
                alt="Write"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xs" style={{ color: '#00E5FF' }}>
              Write
            </span>
          </div>
          <span className="text-xl text-primary/50">→</span>
          <div className="flex flex-col items-center gap-1">
            <div
              className="relative w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_10px_rgba(57,255,20,0.5)]"
              style={{
                filter:
                  'brightness(0) saturate(100%) invert(78%) sepia(61%) saturate(464%) hue-rotate(45deg) brightness(103%) contrast(106%)',
              }}
            >
              <Image src="/assets/tamagochi-coin.svg" alt="Earn" fill className="object-contain" />
            </div>
            <span className="text-xs" style={{ color: '#C8E66D' }}>
              Earn
            </span>
          </div>
          <span className="text-xl text-primary/50">→</span>
          <div className="flex flex-col items-center gap-1">
            <div
              className="relative w-10 h-10 md:w-12 md:h-12 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]"
              style={{
                filter:
                  'brightness(0) saturate(100%) invert(56%) sepia(93%) saturate(6472%) hue-rotate(245deg) brightness(99%) contrast(97%)',
              }}
            >
              <Image
                src="/assets/pet-profile-tamagochi.svg"
                alt="Evolve"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-xs" style={{ color: '#A855F7' }}>
              Evolve
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2 flex flex-col items-center">
          {error && (
            <div className="text-error text-xs font-mono border border-error/20 bg-error/10 rounded-lg p-2 max-w-md mx-auto mb-2">
              {error}
            </div>
          )}
          {!mounted || loading ? (
            <button className="btn-primary font-semibold py-3 px-8 rounded-lg transition-colors font-mono">
              {loading ? '[AUTHENTICATING...]' : 'Play & Grow'}
            </button>
          ) : (
            <WalletConnect />
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 flex items-center justify-center gap-4 text-primary/40 text-xs font-mono">
          <a
            href="https://base.org"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-primary transition-colors group"
          >
            <div className="relative w-5 h-5">
              <Image
                src="/assets/base.png"
                alt="Base"
                fill
                sizes="20px"
                className="object-contain group-hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
              />
            </div>
            Base
          </a>
          <span>•</span>
          <a
            href="https://onchainkit.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            OnchainKit
          </a>
          <span>•</span>
          <a
            href="https://mubert.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-primary transition-colors group"
          >
            <div className="relative w-5 h-5">
              <Image
                src="/assets/mubert.png"
                alt="Mubert"
                fill
                sizes="20px"
                className="object-contain group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
              />
            </div>
            Mubert
          </a>
        </div>
      </div>
    </div>
  );
}
