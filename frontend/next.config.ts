import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment.
  // Produces a self-contained build in .next/standalone/ that includes
  // a minimal Node.js server — no need to install node_modules in the container.
  output: "standalone",
};

export default nextConfig;
