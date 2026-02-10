import type { NextConfig } from "next";

// Use separate build directory for local dev server to avoid conflicts with production builds
// NODE_ENV is 'development' during `next dev`, 'production' during `next build`
const isDevServer = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  ...(isDevServer && { distDir: ".next.dev" }),
};

export default nextConfig;
