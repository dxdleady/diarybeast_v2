'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { formatAddress } from '@mysten/sui.js/utils';

export function WalletConnect() {
  const currentAccount = useCurrentAccount();

  if (currentAccount) {
    return (
      <div className="flex items-center gap-3">
        <div
          className="px-4 py-2.5 rounded-lg border-2 border-primary/50 bg-primary/10 backdrop-blur-sm"
          style={{
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.3), inset 0 0 10px rgba(0, 229, 255, 0.1)',
          }}
        >
          <span className="text-sm text-primary font-mono font-semibold tracking-wide">
            {formatAddress(currentAccount.address)}
          </span>
        </div>
        <div className="wallet-connect-connected">
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connect-wrapper">
      <ConnectButton />
    </div>
  );
}
