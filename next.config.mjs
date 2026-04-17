/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  /* config options here */
  devIndicators: {
    appIsrStatus: false,
  },
  // Place allowedDevOrigins at the top level as requested by Next.js
  allowedDevOrigins: ['192.168.1.18'],
  
  turbopack: {},
  
  // Ensure HMR works correctly over the network
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
};

export default nextConfig;
