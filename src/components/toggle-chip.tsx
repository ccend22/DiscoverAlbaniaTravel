import type { ChangeEvent, ReactNode } from "react";

/** A checkbox/radio disguised as a touch-friendly chip button -- tap anywhere on the label to toggle, fills with color when selected. Stays a real form control for submission and keyboard/a11y, no client JS required unless the caller wants controlled state. */
export function ToggleChip({
  type = "checkbox",
  name,
  value,
  label,
  defaultChecked,
  checked,
  onChange,
  required,
}: {
  type?: "checkbox" | "radio";
  name: string;
  value: string;
  label: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-center text-sm font-medium text-foreground transition-colors duration-[var(--dur-fast)] has-[:checked]:border-teal has-[:checked]:bg-teal has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal/40 has-[:focus-visible]:ring-offset-2">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
        required={required}
        className="sr-only"
      />
      {label}
    </label>
  );
}
