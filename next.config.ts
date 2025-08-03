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

  webpack: (config, { isServer }) => {
    if (isServer) {
      // Redirect test file access to public directory
      config.resolve.alias = {
        ...config.resolve.alias,
        './test/data/05-versions-space.pdf': require.resolve('./public/test-data/05-versions-space.pdf'),
      };
    }

    return config;
  },
};

export default nextConfig;
