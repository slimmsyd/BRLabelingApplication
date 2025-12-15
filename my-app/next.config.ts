import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow larger file uploads (default is 4.5MB which causes 403 on Vercel)
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
