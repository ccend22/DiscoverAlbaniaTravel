"use client";

import { Button } from "./ui/button";

export function RemoveTeamUserButton({
  targetUserId,
  name,
  action,
}: {
  targetUserId: number;
  name: string;
  action: (formData: FormData) => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Të hiqet ${name} nga ekipi yt?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <Button variant="danger" size="sm">Hiq</Button>
    </form>
  );
}
