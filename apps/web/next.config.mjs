/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: '/api/journal', destination: 'http://localhost:3001/journal' },
    ];
  },
  webpack: (config, { isServer }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'rpc-websockets': false,
      'eth-json-rpc-filters/subscriptionManager': false,
      'keccak/js': false,
      'socket.io-parser': false,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    };
    return config;
  },
};

export default nextConfig;
