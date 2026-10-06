import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Dev server only. Hostnames (besides localhost) that may open the site, e.g. a tunnel: ALLOWED_DEV_ORIGINS=*.devtunnels.ms
  allowedDevOrigins: (process.env.ALLOWED_DEV_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean),
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};
export default nextConfig;
