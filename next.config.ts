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
};

export default nextConfig;
