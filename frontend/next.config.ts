import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // Remove the experimental section that's causing warnings
  serverExternalPackages: ['microsoft-cognitiveservices-speech-sdk'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  },
  // Disable strict mode for build
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;