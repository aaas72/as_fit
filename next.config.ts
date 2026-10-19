import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Standalone output only for the Docker image (Dockerfile sets NEXT_OUTPUT); `next start` needs the regular build.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  poweredByHeader: false,
};

export default nextConfig;
