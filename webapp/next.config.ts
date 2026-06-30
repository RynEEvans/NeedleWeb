import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep dev and production artifacts isolated so running `next build`
  // does not invalidate a live `next dev` session.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
