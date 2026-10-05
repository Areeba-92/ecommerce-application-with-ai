import type { NextConfig } from "next";

const insforgeHostname = process.env.NEXT_PUBLIC_INSFORGE_URL
  ? new URL(process.env.NEXT_PUBLIC_INSFORGE_URL).hostname
  : undefined;

const insforgeOrigin = process.env.NEXT_PUBLIC_INSFORGE_URL
  ? new URL(process.env.NEXT_PUBLIC_INSFORGE_URL).origin
  : "";

// script-src keeps 'unsafe-inline' because Next.js's App Router injects inline
// bootstrap scripts; removing it needs per-request nonces (middleware + dynamic
// rendering everywhere). Everything else is locked to what the site uses.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: https://images.unsplash.com ${insforgeOrigin}`,
  "media-src 'self'",
  `connect-src 'self' ${insforgeOrigin}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
