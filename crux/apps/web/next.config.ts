import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: false,
  reactCompiler: false,
  images: {
    remotePatterns: [],
  },
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: [
    "@crux/shared",
    "@crux/ui",
    "@crux/i18n",
    "@crux/db",
    "@crux/platform",
    "@crux/identity",
    "@crux/org",
    "@crux/scheduling",
    "@crux/analytics",
    "@crux/integrations",
  ],
  turbopack: {
    // Monorepo root so transpilePackages resolve outside apps/web.
    root: monorepoRoot,
  },
};

export default nextConfig;
