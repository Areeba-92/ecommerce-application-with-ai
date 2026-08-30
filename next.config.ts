import type { NextConfig } from "next";

const insforgeHostname = process.env.NEXT_PUBLIC_INSFORGE_URL
  ? new URL(process.env.NEXT_PUBLIC_INSFORGE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Product images and payment receipts are served from InsForge storage.
      ...(insforgeHostname
        ? [{ protocol: "https" as const, hostname: insforgeHostname }]
        : []),
    ],
    // Local placeholder fallback (public/images/placeholder.svg) needs SVG
    // optimization allowed; CSP locks down what an SVG asset can execute.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
