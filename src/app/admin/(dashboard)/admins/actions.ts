"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminUserCreateSchema, adminUserUpdateSchema } from "@/lib/validation";
import {
  createAdminUserForAdmin,
  updateAdminUserForAdmin,
  deleteAdminUserForAdmin,
} from "@/db/queries/admin-accounts";
import { requireAdminSession } from "@/lib/admin-session";

export async function createAdminUserAction(formData: FormData) {
  await requireAdminSession();
  const parsed = adminUserCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect(`/admin/admins/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid admin")}`);
  }
  const result = await createAdminUserForAdmin(parsed.data);
  if (!result.ok) redirect(`/admin/admins/new?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/admins");
  redirect("/admin/admins?saved=1");
}

export async function updateAdminUserAction(formData: FormData) {
  await requireAdminSession();
  const adminUserId = Number(formData.get("adminUserId"));
  const passwordRaw = String(formData.get("password") ?? "");
  const parsed = adminUserUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: passwordRaw || undefined,
  });
  if (!parsed.success) {
    redirect(`/admin/admins?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid admin")}`);
  }
  const result = await updateAdminUserForAdmin(adminUserId, parsed.data);
  if (!result.ok) redirect(`/admin/admins?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/admins");
  redirect("/admin/admins?saved=1");
}

export async function deleteAdminUserAction(formData: FormData) {
  const currentAdminId = await requireAdminSession();
  const adminUserId = Number(formData.get("adminUserId"));
  const result = await deleteAdminUserForAdmin(adminUserId, currentAdminId);
  if (!result.ok) redirect(`/admin/admins?error=${encodeURIComponent(result.error)}`);
  revalidatePath("/admin/admins");
  redirect("/admin/admins?saved=1");
}
