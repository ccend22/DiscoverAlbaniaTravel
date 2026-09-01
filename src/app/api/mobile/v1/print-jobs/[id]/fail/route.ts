import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { failPrintJob, getPrintJob } from "@/db/queries/mobile";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

const bodySchema = z.object({
  reason: z.enum(["paper_out", "disconnected", "timeout", "unknown_failure"]),
  detail: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const jobId = Number(id);
  const job = await getPrintJob(jobId);
  if (!job || job.vendorUserId !== auth.auth.vendorUserId) {
    return mobileErrorResponse(404, "print_job_not_found", "That print job doesn't exist.");
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return mobileErrorResponse(400, "invalid_request", "reason is required.");
  }

  const failureReason = parsed.data.detail ? `${parsed.data.reason}: ${parsed.data.detail}` : parsed.data.reason;
  const failed = await failPrintJob(jobId, failureReason);
  if (!failed) {
    return mobileErrorResponse(409, "already_finalized", "This print job was already completed or failed.");
  }

  return NextResponse.json({ ok: true });
}
