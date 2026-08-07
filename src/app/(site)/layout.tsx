import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      {/* The header is fixed (floats over the homepage's photo hero), so this
          padding reserves the same space it used to occupy back when it was
          an in-flow sticky element — every page besides the homepage looks
          unchanged. The homepage hero cancels this out with a negative
          margin to tuck back up under the header. */}
      <main className="flex-1 pt-20 md:pt-24">{children}</main>
      <SiteFooter />
    </>
  );
}
