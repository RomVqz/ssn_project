/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["gateway.pinata.cloud"],
  },
  webpack: (config) => {
    // Needed for @solana/web3.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};

module.exports = nextConfig;
