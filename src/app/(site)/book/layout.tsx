import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reserve Your Trip",
  robots: { index: false, follow: false, nocache: true },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
