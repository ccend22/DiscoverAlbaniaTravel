import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Inter, Merriweather, VT323 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["300", "400", "700", "900"],
  variable: "--font-merriweather",
  display: "swap",
});

const alfaSlabOne = Alfa_Slab_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-alfa-slab-one",
  display: "swap",
});

const vt323 = VT323({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-vt323",
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Discover Albania Transport — Buses, Taxis & Destinations",
    template: "%s | Discover Albania Transport",
  },
  description: "Search intercity buses, reserve seats, request scheduled taxis, and discover destinations across Albania.",
  applicationName: "Discover Albania Transport",
  keywords: ["Albania travel", "Albania buses", "Albania taxi", "Albania destinations", "intercity transport"],
  category: "travel",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Discover Albania Transport",
    title: "Discover Albania Transport — Buses, Taxis & Destinations",
    description: "Search buses, request taxis, and discover destinations across Albania.",
    url: "/",
    images: [{ url: "/og-v3.png", width: 1200, height: 630, alt: "Discover Albania Transport across Albania's coast and mountains" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover Albania Transport — Buses, Taxis & Destinations",
    description: "Search buses, request taxis, and discover destinations across Albania.",
    images: ["/og-v3.png"],
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
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable} ${merriweather.variable} ${alfaSlabOne.variable} ${vt323.variable}`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
