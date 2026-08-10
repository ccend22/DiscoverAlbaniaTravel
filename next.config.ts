import type { NextConfig } from "next";
import path from "node:path";
import { networkInterfaces } from "node:os";

const localDevOrigins = Object.values(networkInterfaces())
  .flatMap((entries) => entries ?? [])
  .filter((entry) => entry.family === "IPv4" && !entry.internal)
  .map((entry) => entry.address);

const nextConfig: NextConfig = {
  agentRules: false,
  // Cloud Run only needs the traced runtime dependencies and the generated
  // standalone server, which keeps the production container small.
  output: "standalone",
  poweredByHeader: false,
  // 90 is used for a handful of large, dark-gradient-overlaid photo heroes
  // (routes, destination detail) where compression artifacts are more
  // visible than on the default 75.
  images: {
    qualities: [75, 90],
  },
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
  allowedDevOrigins: localDevOrigins,
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
            value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()",
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
