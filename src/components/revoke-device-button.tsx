"use client";

import { Button } from "./ui/button";

export function RevokeDeviceButton({
  deviceId,
  label,
  action,
}: {
  deviceId: number;
  label: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Revoke "${label}"? It will be signed out immediately and can't be reactivated -- you'd need to generate a new code.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="deviceId" value={deviceId} />
      <Button variant="danger" size="sm">Revoke</Button>
    </form>
  );
}
