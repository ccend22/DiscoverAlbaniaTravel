import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Discover Albania — Buses, Taxis & Destinations",
    template: "%s | Discover Albania",
  },
  description: "Search intercity buses, reserve seats, request scheduled taxis, and discover destinations across Albania.",
  applicationName: "Discover Albania",
  keywords: ["Albania travel", "Albania buses", "Albania taxi", "Albania destinations", "intercity transport"],
  category: "travel",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Discover Albania",
    title: "Discover Albania — Buses, Taxis & Destinations",
    description: "Search buses, request taxis, and discover destinations across Albania.",
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Discover Albania travel across the coast and mountains" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Albania — Buses, Taxis & Destinations",
    description: "Search buses, request taxis, and discover destinations across Albania.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#002f32",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
