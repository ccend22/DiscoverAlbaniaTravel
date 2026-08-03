"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminStationSchema } from "@/lib/validation";
import { createStationForAdmin, updateStationForAdmin, deleteStationForAdmin } from "@/db/queries/admin-stations";
import { requireAdminSession } from "@/lib/admin-session";

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export async function createStationAction(formData: FormData) {
  await requireAdminSession();
  const parsed = adminStationSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    city: formData.get("city"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });
  if (!parsed.success) {
    redirect(`/admin/stations/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid station")}`);
  }
  const result = await createStationForAdmin({ ...parsed.data, address: optionalString(formData.get("address")) });
  if (!result.ok) redirect(`/admin/stations/new?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/stations");
  redirect("/admin/stations?saved=1");
}

export async function updateStationAction(formData: FormData) {
  await requireAdminSession();
  const stationId = Number(formData.get("stationId"));
  const parsed = adminStationSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    city: formData.get("city"),
    address: formData.get("address"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });
  if (!parsed.success) {
    redirect(`/admin/stations/${stationId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid station")}`);
  }
  const result = await updateStationForAdmin(stationId, { ...parsed.data, address: optionalString(formData.get("address")) });
  if (!result.ok) redirect(`/admin/stations/${stationId}?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/stations");
  redirect("/admin/stations?saved=1");
}

export async function deleteStationAction(formData: FormData) {
  await requireAdminSession();
  const stationId = Number(formData.get("stationId"));
  const result = await deleteStationForAdmin(stationId);
  if (!result.ok) redirect(`/admin/stations?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/stations");
  redirect("/admin/stations?saved=1");
}
