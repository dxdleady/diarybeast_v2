'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { ReactNode } from 'react';
import { networkConfig } from '@/lib/sui/config';
import '@mysten/dapp-kit/dist/index.css';
import { EncryptionKeyProvider } from '@/lib/EncryptionKeyContext';
import { LifeCheckWrapper } from '@/components/LifeCheckWrapper';
import { MusicProvider } from '@/lib/contexts/MusicContext';
import { GlobalMusicProvider } from '@/components/GlobalMusicPlayer';
import { PawPlayer } from '@/components/GlobalMusicPlayer/PawPlayer';
import { GamificationProvider } from '@/lib/contexts/GamificationContext';
import { BottomNavOverlay } from '@/components/BottomNavOverlay';
import { AuthGuard } from '@/components/AuthGuard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <EncryptionKeyProvider>
            <MusicProvider>
              <GlobalMusicProvider>
                <GamificationProvider>
                  <AuthGuard />
                  <LifeCheckWrapper>{children}</LifeCheckWrapper>
                  <PawPlayer />
                  <BottomNavOverlay />
                </GamificationProvider>
              </GlobalMusicProvider>
            </MusicProvider>
          </EncryptionKeyProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
