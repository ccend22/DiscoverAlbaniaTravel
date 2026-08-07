import Link from "next/link";

export default function NotFound() {
  return (
    <div className="public-page mx-auto max-w-2xl px-4 py-20 text-center sm:px-6 sm:py-24">
      <div className="public-hero-panel p-8 sm:p-12">
      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-lime">Discover Albania Transport</p>
      <h1 className="mt-3 font-display text-4xl font-black tracking-[-0.035em]">Page not found</h1>
      <p className="mt-3 text-white/65">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link href="/" className="mt-7 inline-block rounded-full bg-lime px-6 py-3 text-sm font-bold text-brand-deep transition-colors hover:bg-white">
        Back to search
      </Link>
      </div>
    </div>
  );
}
