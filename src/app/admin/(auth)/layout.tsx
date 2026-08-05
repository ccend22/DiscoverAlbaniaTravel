import { BrandMark } from "@/components/brand-mark";

export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#061516] px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(8,127,132,0.22),transparent)]"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-white">
          <BrandMark size={38} className="text-white" />
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/50">Admin console</p>
        </div>
        {children}
      </div>
    </div>
  );
}
