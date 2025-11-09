'use client';

import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  walletAddress: string;
  selectedAnimal: string | null;
  coinsBalance: number;
  livesRemaining: number;
  currentStreak: number;
  longestStreak: number;
}

export function useAuth() {
  const currentAccount = useCurrentAccount();
  const address = currentAccount?.address;
  const { mutateAsync: signPersonalMessage, isPending: isSigning } = useSignPersonalMessage();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const prevAddressRef = useRef<string | undefined>(undefined);
  const isAuthenticatingRef = useRef(false);

  const authenticate = useCallback(async () => {
    if (!address || isAuthenticatingRef.current) {
      return;
    }

    isAuthenticatingRef.current = true;
    setLoading(true);
    setError(null);

    const message = 'Sign this message to authenticate with DiaryBeast';
    setPendingMessage(message);

    try {
      // Sign message using Sui wallet
      const messageBytes = new TextEncoder().encode(message);
      const result = await signPersonalMessage({
        message: messageBytes,
      });

      // Verify signature with backend
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          message,
          signature: result.signature,
          messageBytes: Array.from(messageBytes),
        }),
      });

      if (!res.ok) {
        let errorMessage = 'Authentication failed';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = `HTTP ${res.status}: ${res.statusText || 'Unknown error'}`;
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();

      if (!data.user) {
        throw new Error('Invalid response: user data missing');
      }

      setUser(data.user);
      setPendingMessage(null);

      // Redirect to onboarding if new user or onboarding not completed
      if (data.isNewUser || !data.user.onboardingCompleted) {
        router.push('/onboarding');
      } else {
        // Existing user with completed onboarding
        router.push('/diary');
      }
    } catch (err: any) {
      if (err.message?.includes('User rejected') || err.message?.includes('rejected')) {
        setError('Signature rejected. Please try again.');
      } else {
        setError(err.message || 'Failed to sign message. Please try again.');
      }
      setPendingMessage(null);
    } finally {
      isAuthenticatingRef.current = false;
      setLoading(false);
    }
  }, [address, signPersonalMessage, router]);

  // Reset states when address changes (logout is handled by AuthGuard globally)
  useEffect(() => {
    const currentAddress = address?.toLowerCase();
    const prevAddress = prevAddressRef.current;

    if (prevAddress !== currentAddress) {
      isAuthenticatingRef.current = false;
      setError(null);
      setPendingMessage(null);
      setUser(null); // Clear user when address changes
      prevAddressRef.current = currentAddress;
    }
  }, [address]);

  return {
    user,
    loading: loading || isSigning,
    error,
    isAuthenticated: !!user && !!address,
    authenticate,
  };
}
