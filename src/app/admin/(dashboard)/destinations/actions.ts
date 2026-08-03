"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminDestinationSchema } from "@/lib/validation";
import {
  createDestinationForAdmin,
  updateDestinationForAdmin,
  deleteDestinationForAdmin,
} from "@/db/queries/admin-destinations";
import { requireAdminSession } from "@/lib/admin-session";

export async function createDestinationAction(formData: FormData) {
  await requireAdminSession();
  const parsed = adminDestinationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    redirect(`/admin/destinations/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid destination")}`);
  }
  const result = await createDestinationForAdmin(parsed.data);
  if (!result.ok) redirect(`/admin/destinations/new?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/destinations");
  redirect("/admin/destinations?saved=1");
}

export async function updateDestinationAction(formData: FormData) {
  await requireAdminSession();
  const destinationId = Number(formData.get("destinationId"));
  const parsed = adminDestinationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    redirect(`/admin/destinations/${destinationId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid destination")}`);
  }
  const result = await updateDestinationForAdmin(destinationId, parsed.data);
  if (!result.ok) redirect(`/admin/destinations/${destinationId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/destinations");
  redirect("/admin/destinations?saved=1");
}

export async function deleteDestinationAction(formData: FormData) {
  await requireAdminSession();
  const destinationId = Number(formData.get("destinationId"));
  await deleteDestinationForAdmin(destinationId);
  revalidatePath("/admin/destinations");
  redirect("/admin/destinations?saved=1");
}
