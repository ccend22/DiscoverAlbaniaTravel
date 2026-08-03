import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6 sm:py-24">
      <p className="text-xs font-bold uppercase text-teal">Discover Albania</p>
      <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-muted">
        We couldn&apos;t find what you were looking for.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-strong">
        Back to search
      </Link>
    </div>
  );
}
