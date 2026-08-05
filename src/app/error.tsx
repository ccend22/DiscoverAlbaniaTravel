"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-red">Something went wrong</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground">We couldn&apos;t load this page.</h1>
      <p className="mt-3 text-muted">Please try again. Your previous form submission was not repeated.</p>
      <Button type="button" onClick={reset} className="mt-6">Try again</Button>
    </div>
  );
}
