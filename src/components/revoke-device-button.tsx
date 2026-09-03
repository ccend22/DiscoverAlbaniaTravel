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
        if (!window.confirm(`Të revokohet "${label}"? Do të dalë menjëherë dhe nuk mund të riaktivizohet -- do të duhet të gjenerosh një kod të ri.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="deviceId" value={deviceId} />
      <Button variant="danger" size="sm">Revoko</Button>
    </form>
  );
}
