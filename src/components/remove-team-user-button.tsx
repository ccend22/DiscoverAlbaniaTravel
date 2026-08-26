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
        if (!window.confirm(`Remove ${name} from your team?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="targetUserId" value={targetUserId} />
      <Button variant="danger" size="sm">Remove</Button>
    </form>
  );
}
