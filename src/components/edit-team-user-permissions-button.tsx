"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";
import { CloseIcon } from "./icons";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { tapToDismiss } from "@/lib/tap-to-dismiss";
import { VENDOR_PERMISSIONS } from "@/lib/vendor-permissions";

export function EditTeamUserPermissionsButton({
  targetUserId,
  name,
  permissions,
  action,
}: {
  targetUserId: number;
  name: string;
  permissions: string[];
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  useBodyScrollLock(open);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit access
      </Button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-5">
            <div className="fixed inset-0 bg-brand-deep/55 backdrop-blur-[3px]" aria-hidden="true" {...tapToDismiss(() => setOpen(false))} />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`Edit ${name}'s access`}
              className="relative flex max-h-[90dvh] w-full max-w-sm flex-col overflow-y-auto rounded-t-[1.5rem] border border-white/70 bg-surface p-6 shadow-[0_32px_90px_rgba(0,24,32,0.34)] sm:rounded-[1.5rem]"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-foreground">{name}&apos;s access</h2>
                <button type="button" {...tapToDismiss(() => setOpen(false))} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:text-foreground">
                  <CloseIcon width={16} height={16} />
                </button>
              </div>
              <p className="mt-1 text-sm text-muted">Choose which pages {name} can see and use.</p>

              <form
                action={action}
                onSubmit={() => setOpen(false)}
                className="mt-5 flex flex-col gap-3"
              >
                <input type="hidden" name="targetUserId" value={targetUserId} />
                {VENDOR_PERMISSIONS.map((permission) => (
                  <label key={permission.key} className="flex items-center gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission.key}
                      defaultChecked={permissions.includes(permission.key)}
                      className="h-4 w-4 rounded border-border text-teal focus:ring-teal"
                    />
                    {permission.label}
                  </label>
                ))}
                <Button type="submit" className="mt-2">Save access</Button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
