import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // A stray package-lock.json in Code_Projects makes Turbopack treat that
  // 40GB folder as the app root, so the first compile of "/" never finishes.
  turbopack: {
    root: path.join(__dirname),
  },
  // Allow larger file uploads (default is 4.5MB which causes 403 on Vercel)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Ignore TypeScript errors during build (for deployment)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
