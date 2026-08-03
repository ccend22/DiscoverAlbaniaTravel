interface BrandMarkProps {
  size?: number;
  className?: string;
}

export function BrandMark({ size = 36, className }: BrandMarkProps) {
  return (
    <svg
      width={Math.round(size * 1.55)}
      height={size}
      viewBox="0 0 78 50"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M4 7h29L15 39H4V27h7l8-14H10v9H4V7Z"
        fill="currentColor"
      />
      <path
        d="M35 7h12L29 39H17L35 7Zm15 0h11l-8 14 10 18H51l-4-8-5 8H30L50 7Z"
        fill="currentColor"
      />
      <path d="M61 7h13L63 27l-6-10 4-10Z" fill="currentColor" opacity="0.86" />
    </svg>
  );
}
