import Image from "next/image";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 36, className }: BrandMarkProps) {
  return (
    <Image
      src="/brand-logo.png"
      alt=""
      width={Math.round(size * (1028 / 701))}
      height={size}
      className={className}
      aria-hidden="true"
      draggable={false}
    />
  );
}
