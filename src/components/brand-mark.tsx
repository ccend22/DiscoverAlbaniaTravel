import Image from "next/image";

interface BrandMarkProps {
  size?: number;
  className?: string;
  inverted?: boolean;
}

const LOGO_ASPECT = 528 / 185;

export function BrandMark({ size = 36, className, inverted = false }: BrandMarkProps) {
  const logoSize = Math.round(size * 0.82);

  return (
    <span className={`inline-flex shrink-0 items-center gap-[0.55em] ${className ?? ""}`}>
      <Image
        src="/dat-logo.png"
        alt=""
        width={Math.round(logoSize * LOGO_ASPECT)}
        height={logoSize}
        className={`transition-[filter] duration-300 ${inverted ? "brightness-0 invert" : ""}`}
        aria-hidden="true"
        draggable={false}
      />
      <span
        className={`whitespace-nowrap font-black uppercase leading-[0.94] tracking-tight transition-colors duration-300 ${
          inverted ? "text-white" : "text-brand-navy"
        }`}
        style={{ fontSize: Math.max(11, Math.round(size * 0.42)) }}
      >
        <span className="block">Discover</span>
        <span className="block">Albania Transport</span>
      </span>
    </span>
  );
}
