import type { ReactNode } from "react";
import { AlertCircleIcon, CheckCircleIcon } from "@/components/icons";

type AlertTone = "success" | "error" | "warning" | "info";

const TONES: Record<AlertTone, { classes: string; Icon: typeof AlertCircleIcon }> = {
  success: { classes: "border-teal/30 bg-teal-soft text-teal", Icon: CheckCircleIcon },
  error: { classes: "border-red/30 bg-red-soft text-red", Icon: AlertCircleIcon },
  warning: { classes: "border-warning/30 bg-warning-soft text-warning", Icon: AlertCircleIcon },
  info: { classes: "border-teal/30 bg-teal-soft text-teal", Icon: AlertCircleIcon },
};

interface AlertProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

export function Alert({ tone = "info", children, className = "" }: AlertProps) {
  const { classes, Icon } = TONES[tone];
  return (
    <div
      className={`flex animate-fade-up items-start gap-2.5 rounded-md border p-3.5 text-sm shadow-[var(--shadow-xs)] ${classes} ${className}`}
    >
      <Icon width={17} height={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
