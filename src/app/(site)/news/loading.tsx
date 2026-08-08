export default function NewsLoading() {
  return (
    <div className="public-page public-section" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading news…</span>
      <div className="public-shell max-w-6xl">
        <div className="mb-8 h-10 w-64 animate-pulse rounded bg-surface-sunken" />
        <div className="grid gap-5 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-[1.75rem] border border-[#dce7e9] bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
