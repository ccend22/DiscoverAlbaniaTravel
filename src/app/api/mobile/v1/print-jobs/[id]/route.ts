import { NextResponse, type NextRequest } from "next/server";
import { getPrintJob } from "@/db/queries/mobile";
import { requireMobileAuth, mobileErrorResponse } from "@/lib/mobile/require-mobile-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireMobileAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const job = await getPrintJob(Number(id));
  if (!job || job.vendorUserId !== auth.auth.vendorUserId) {
    return mobileErrorResponse(404, "print_job_not_found", "That print job doesn't exist.");
  }

  return NextResponse.json(job);
}
