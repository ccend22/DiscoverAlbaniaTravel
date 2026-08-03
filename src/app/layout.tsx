import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Albania — Travel Department",
  description: "Book intercity buses and request scheduled taxis across Albania.",
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
