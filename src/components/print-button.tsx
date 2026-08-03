"use client";

import { DownloadIcon } from "./icons";
import { Button } from "./ui/button";

export function PrintButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()} className="print:hidden">
      <DownloadIcon width={16} height={16} />
      Print or save as PDF
    </Button>
  );
}
