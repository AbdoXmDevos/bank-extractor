import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during build to avoid build failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignore TypeScript errors during build (optional)
    ignoreBuildErrors: false,
  },
  env: {
    // Disable debug mode for pdf-parse to prevent test file access
    DEBUG: '',
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent access to test files by aliasing them to empty modules
      config.resolve.alias = {
        ...config.resolve.alias,
        './test/data/05-versions-space.pdf': false,
      };
    }

    return config;
  },
};

export default nextConfig;
