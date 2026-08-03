export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading search results…</span>
      <div className="mb-8 h-40 animate-pulse rounded-md border border-border bg-surface" />
      <div className="mb-4 h-6 w-64 animate-pulse rounded bg-surface-sunken" />
      <div className="mb-6 h-64 animate-pulse rounded-md border border-border bg-surface" />
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-md border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
