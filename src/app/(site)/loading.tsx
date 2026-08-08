export default function SiteLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mb-6 h-8 w-48 animate-pulse rounded bg-surface-sunken" />
      <div className="mb-4 h-64 animate-pulse rounded-[2rem] border border-[#dce7e9] bg-white" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl border border-[#dce7e9] bg-white" />
        ))}
      </div>
    </div>
  );
}
