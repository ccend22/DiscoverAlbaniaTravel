/** A checkbox disguised as a touch-friendly chip button -- tap anywhere on the label to toggle, fills with color when selected. Stays a real checkbox for form submission and keyboard/a11y, no client JS needed. */
export function PermissionToggle({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-center text-sm font-medium text-foreground transition-colors duration-[var(--dur-fast)] has-[:checked]:border-teal has-[:checked]:bg-teal has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal/40 has-[:focus-visible]:ring-offset-2">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      {label}
    </label>
  );
}
