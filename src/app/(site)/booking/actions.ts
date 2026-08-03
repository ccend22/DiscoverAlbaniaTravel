"use server";

import { redirect } from "next/navigation";
import { referenceLookupSchema } from "@/lib/validation";

export async function lookupBookingAction(formData: FormData) {
  const parsed = referenceLookupSchema.safeParse({ reference: formData.get("reference") });
  if (!parsed.success) {
    redirect(`/booking?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid reference")}`);
  }
  redirect(`/booking/${encodeURIComponent(parsed.data.reference.toUpperCase())}`);
}
