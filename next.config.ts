import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Next ignores the stray parent lockfile in the home dir.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
