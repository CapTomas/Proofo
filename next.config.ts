import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // Empty turbopack config to satisfy Next.js 16 when using webpack plugins like @serwist/next
  turbopack: {
    // Use absolute path for turbopack root to silence workspace root inference warning
    root: "/Users/Tomas.Cap/Documents/Git/Proofonew",
  },
};

export default withSerwist(nextConfig);
