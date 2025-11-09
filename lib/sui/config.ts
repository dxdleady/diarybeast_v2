import { getFullnodeUrl } from '@mysten/sui.js/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
    variables: {
      packageId: process.env.NEXT_PUBLIC_SUI_PACKAGE_ID || '',
      treasuryCapId: process.env.NEXT_PUBLIC_SUI_TREASURY_CAP_ID || '',
      adminCapId: process.env.NEXT_PUBLIC_SUI_ADMIN_CAP_ID || '',
    },
  },
  mainnet: {
    url: getFullnodeUrl('mainnet'),
    variables: {
      packageId: process.env.NEXT_PUBLIC_SUI_PACKAGE_ID_MAINNET || '',
      treasuryCapId: process.env.NEXT_PUBLIC_SUI_TREASURY_CAP_ID_MAINNET || '',
      adminCapId: process.env.NEXT_PUBLIC_SUI_ADMIN_CAP_ID_MAINNET || '',
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
