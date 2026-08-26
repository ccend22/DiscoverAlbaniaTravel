"use server";

import { revalidatePath } from "next/cache";
import { submitOperatorReview, submitOperatorReport } from "@/db/queries/reviews";

export type ReviewActionState = { status: "idle" | "success" | "error"; message?: string };

export async function submitTripReviewAction(
  reference: string,
  _prevState: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> {
  const rating = Number(formData.get("rating"));
  const result = await submitOperatorReview(reference.toUpperCase(), rating);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/booking/${reference}`);
  return { status: "success" };
}

export type ReportActionState = { status: "idle" | "success" | "error"; message?: string };

export async function submitTripReportAction(
  reference: string,
  _prevState: ReportActionState,
  formData: FormData
): Promise<ReportActionState> {
  const reporterName = String(formData.get("reporterName") ?? "").trim();
  const reporterEmail = String(formData.get("reporterEmail") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (reporterName.length < 2) return { status: "error", message: "Enter your name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reporterEmail)) return { status: "error", message: "Enter a valid email address." };
  if (message.length < 10) return { status: "error", message: "Enter at least a few words describing the issue." };

  const result = await submitOperatorReport({ bookingReference: reference.toUpperCase(), reporterName, reporterEmail, message });
  if (!result.ok) return { status: "error", message: result.error };
  return { status: "success" };
}
