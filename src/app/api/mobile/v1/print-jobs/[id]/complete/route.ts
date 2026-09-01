import { NextResponse, type NextRequest } from "next/server";
import { completePrintJob, getPrintJob } from "@/db/queries/mobile";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const jobId = Number(id);
  const job = await getPrintJob(jobId);
  if (!job || job.vendorUserId !== auth.auth.vendorUserId) {
    return mobileErrorResponse(404, "print_job_not_found", "That print job doesn't exist.");
  }

  const completed = await completePrintJob(jobId);
  if (!completed) {
    return mobileErrorResponse(409, "already_finalized", "This print job was already completed or failed.");
  }

  return NextResponse.json({ ok: true });
}
