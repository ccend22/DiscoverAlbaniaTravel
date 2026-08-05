import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vendor Portal",
  robots: { index: false, follow: false, nocache: true },
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
