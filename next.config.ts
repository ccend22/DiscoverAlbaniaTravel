import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The dev-mode indicator is a fixed-position overlay that can sit on top of
  // real controls on narrow mobile viewports and swallow taps meant for the
  // page underneath it.
  devIndicators: false,
  // Lets a phone on the same LAN (via the printed "Network:" URL) connect to
  // the dev server's HMR websocket. Without this, Next.js blocks it as
  // cross-origin, which can leave the page rendered but not fully hydrated —
  // it looks fine but taps on buttons/dropdowns silently do nothing.
  allowedDevOrigins: ["192.168.1.56"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
