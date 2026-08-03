import type { ReactNode } from "react";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-muted ring-1 ring-inset ring-border/60",
  success: "bg-success-soft text-success ring-1 ring-inset ring-success/15",
  warning: "bg-warning-soft text-warning ring-1 ring-inset ring-warning/15",
  danger: "bg-red-soft text-red ring-1 ring-inset ring-red/15",
  info: "bg-teal-soft text-teal ring-1 ring-inset ring-teal/15",
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
