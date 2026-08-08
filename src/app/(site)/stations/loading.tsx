export default function StationsLoading() {
  return (
    <div className="public-page" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading stations…</span>
      <div className="h-[560px] animate-pulse bg-[#eaf5f4] sm:h-[620px]" />
      <div className="public-shell max-w-6xl py-16">
        <div className="h-[420px] animate-pulse rounded-[2rem] border border-[#dce7e9] bg-white" />
      </div>
    </div>
  );
}
