export default function DestinationsLoading() {
  return (
    <div className="public-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading destinations…</span>
      <div className="h-[560px] animate-pulse bg-brand-deep sm:h-[620px]" />
      <div className="public-shell max-w-6xl py-16">
        <div className="mb-6 h-6 w-40 animate-pulse rounded bg-surface-sunken" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl border border-[#dce7e9] bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
