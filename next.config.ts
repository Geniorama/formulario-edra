import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que Next infiera mal el root por lockfiles externos.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
