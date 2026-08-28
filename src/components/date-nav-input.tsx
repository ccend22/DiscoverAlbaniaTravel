"use client";

import { useRouter, usePathname } from "next/navigation";
import { CalendarIcon } from "@/components/icons";

export function DateNavInput({ date }: { date: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="relative inline-flex items-center">
      <CalendarIcon width={16} height={16} className="pointer-events-none absolute left-3 text-muted" />
      <input
        type="date"
        value={date}
        onChange={(event) => {
          if (event.target.value) router.push(`${pathname}?date=${event.target.value}`);
        }}
        aria-label="Overview date"
        className="min-h-11 rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm font-medium text-foreground outline-none focus:border-teal"
      />
    </label>
  );
}
