import { ToggleChip } from "./toggle-chip";

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
  return <ToggleChip type="checkbox" name={name} value={value} label={label} defaultChecked={defaultChecked} />;
}
