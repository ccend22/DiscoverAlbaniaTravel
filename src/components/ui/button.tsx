import Link from "next/link";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "relative inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] " +
  "hover:-translate-y-px active:translate-y-0 active:scale-[0.97] active:duration-75 " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-foreground shadow-[var(--shadow-xs)] hover:bg-brand-strong hover:shadow-[var(--shadow-md)]",
  secondary: "bg-brand-soft text-brand-strong hover:bg-teal-soft hover:shadow-[var(--shadow-sm)]",
  outline:
    "border border-border bg-surface text-foreground hover:border-teal hover:bg-brand-soft hover:text-brand-strong hover:shadow-[var(--shadow-sm)]",
  ghost: "text-foreground hover:bg-surface-sunken",
  danger: "border border-red/30 text-red hover:bg-red-soft",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

function buttonClasses(variant: Variant = "primary", size: Size = "md", className = "") {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size, className, children, ...props }: ButtonProps) {
  return (
    <button className={buttonClasses(variant, size, className)} {...props}>
      {variant === "primary" && <span className="shine-layer" aria-hidden="true" />}
      {children}
    </button>
  );
}

interface LinkButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  size?: Size;
}

export function LinkButton({ href, variant = "primary", size, className, children, ...props }: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)} {...props}>
      {variant === "primary" && <span className="shine-layer" aria-hidden="true" />}
      {children}
    </Link>
  );
}
