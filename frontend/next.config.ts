import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server build for a small production Docker image.
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
