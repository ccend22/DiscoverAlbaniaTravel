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
  // visible than on the default 75. minimumCacheTTL extends past Next's
  // 4-hour default to match how rarely these curated photos actually
  // change (redeployed, not runtime-uploaded).
  images: {
    qualities: [75, 90],
    minimumCacheTTL: 2592000,
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
      // `public/` assets get no caching by default once self-hosted (off
      // Vercel's CDN, which adds this automatically) -- every one of the
      // curated destination photos was re-validated on every request,
      // including the /destinations directory rendering ~80 of them on one
      // page. These are static, redeployed (not runtime-uploaded) files, so
      // a long cache is safe; a new deploy naturally busts it anyway since
      // the container's file contents change.
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      {
        source: "/:file(dat-logo|og|og-v2|og-v3).png",
        headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }],
      },
      // The embedded checkout (book/[tripDepartureId]) loads POK's hosted
      // payment page in an iframe, and POK navigates that same iframe here
      // when checkout finishes -- the blanket X-Frame-Options: DENY above
      // blocks a page from framing *itself*, not just third parties, so
      // without this override the return relay can never load and the
      // customer is left staring at a blank frame after paying. Same-origin
      // framing only; every other route still denies framing entirely.
      {
        source: "/pay/return",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      // Same root cause as the override above: the blanket Permissions-Policy
      // disables the Payment Request API everywhere with `payment=()`, which
      // also silently strips it from POK's embedded checkout iframe on this
      // page -- breaking Apple Pay/Google Pay wallet buttons there, even
      // though normal card entry still works. Delegates it to our own origin
      // and POK's checkout domain only, nowhere else on the site.
      {
        source: "/book/:tripDepartureId",
        headers: [
          {
            key: "Permissions-Policy",
            value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://pay.pokpay.io"), usb=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
