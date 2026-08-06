import Image from "next/image";

interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 36, className }: BrandMarkProps) {
  return (
    <Image
      src="/brand-logo.svg"
      alt=""
      width={Math.round(size * (78 / 50))}
      height={size}
      className={className}
      aria-hidden="true"
      draggable={false}
    />
  );
}
