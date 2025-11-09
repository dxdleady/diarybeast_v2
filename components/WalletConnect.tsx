'use client';

import { ConnectButton, useCurrentAccount } from '@mysten/dapp-kit';
import { formatAddress } from '@mysten/sui.js/utils';

export function WalletConnect() {
  const currentAccount = useCurrentAccount();

  return (
    <div className="flex items-center gap-4">
      {currentAccount ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-mono">
            {formatAddress(currentAccount.address)}
          </span>
          <ConnectButton />
        </div>
      ) : (
        <ConnectButton />
      )}
    </div>
  );
}
