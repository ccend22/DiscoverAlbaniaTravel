import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // The dev-mode indicator is a fixed-position overlay that can sit on top of
  // real controls on narrow mobile viewports and swallow taps meant for the
  // page underneath it.
  devIndicators: false,
};

export default nextConfig;
