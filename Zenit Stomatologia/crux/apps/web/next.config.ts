import type { NextConfig } from "next";

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
    "@crux/platform",
    "@crux/identity",
    "@crux/org",
    "@crux/scheduling",
    "@crux/analytics",
    "@crux/integrations",
  ],
};

export default nextConfig;
