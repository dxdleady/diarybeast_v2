export const walrusConfig = {
  // Walrus Testnet Aggregator
  aggregatorUrl:
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
    'https://aggregator.walrus-testnet.walrus.space',

  // Walrus Publisher
  publisherUrl:
    process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space',

  // Storage epochs (duration in epochs)
  defaultEpochs: parseInt(process.env.NEXT_PUBLIC_WALRUS_STORAGE_EPOCHS || '5'),

  // Maximum blob size (100MB)
  maxBlobSize: 100 * 1024 * 1024,

  // Content types
  defaultContentType: 'application/json',
};

// Helper to get network-specific URLs
export function getWalrusUrls(network: 'testnet' | 'mainnet' = 'testnet') {
  if (network === 'mainnet') {
    return {
      aggregatorUrl:
        process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL_MAINNET || 'https://aggregator.walrus.space',
      publisherUrl:
        process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL_MAINNET || 'https://publisher.walrus.space',
    };
  }

  return {
    aggregatorUrl: walrusConfig.aggregatorUrl,
    publisherUrl: walrusConfig.publisherUrl,
  };
}
