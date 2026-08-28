"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";

/**
 * A checkbox/radio disguised as a touch-friendly chip button -- tap anywhere
 * on the label to toggle, fills with color when selected. The selected
 * look is driven by JS state (not the CSS `:has()` selector) so it renders
 * correctly on older browsers/webviews that don't support `:has()` yet --
 * the checkbox would still toggle under the hood in those, just silently
 * with no visible color change, which is worse than just tracking it in JS.
 * Uncontrolled by default (tracks its own state from `defaultChecked`); pass
 * `checked`/`onChange` together to control it externally instead.
 */
export function ToggleChip({
  type = "checkbox",
  name,
  value,
  label,
  defaultChecked,
  checked: checkedProp,
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
  const isControlled = checkedProp !== undefined;
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const checked = isControlled ? checkedProp : internalChecked;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!isControlled) setInternalChecked(event.target.checked);
    onChange?.(event);
  }

  return (
    <label
      className={`flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-full border px-4 py-2 text-center text-sm font-medium transition-colors duration-[var(--dur-fast)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal/40 has-[:focus-visible]:ring-offset-2 ${
        checked ? "border-teal bg-teal text-white" : "border-border bg-surface text-foreground hover:bg-surface-sunken"
      }`}
    >
      <input
        type={type}
        name={name}
        value={value}
        checked={checked}
        onChange={handleChange}
        required={required}
        className="sr-only"
      />
      {label}
    </label>
  );
}
