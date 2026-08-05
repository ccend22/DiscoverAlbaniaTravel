import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Details",
  robots: { index: false, follow: false, nocache: true },
};

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
