import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tell Next.js to skip bundling for Walrus packages (required for WASM)
  serverExternalPackages: ['@mysten/walrus', '@mysten/walrus-wasm'],

  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    return config;
  },
};

export default nextConfig;
