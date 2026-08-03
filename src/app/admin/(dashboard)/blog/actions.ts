"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminBlogPostSchema } from "@/lib/validation";
import { createBlogPostForAdmin, updateBlogPostForAdmin, deleteBlogPostForAdmin } from "@/db/queries/admin-blog";
import { requireAdminSession } from "@/lib/admin-session";

function optionalString(value: FormDataEntryValue | null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

export async function createBlogPostAction(formData: FormData) {
  await requireAdminSession();
  const parsed = adminBlogPostSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    description: formData.get("description"),
    postDate: formData.get("postDate"),
  });
  if (!parsed.success) {
    redirect(`/admin/blog/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid post")}`);
  }
  await createBlogPostForAdmin({
    category: parsed.data.category,
    title: parsed.data.title,
    subtitle: optionalString(formData.get("subtitle")),
    description: parsed.data.description,
    postDate: new Date(parsed.data.postDate),
  });
  revalidatePath("/admin/blog");
  redirect("/admin/blog?saved=1");
}

export async function updateBlogPostAction(formData: FormData) {
  await requireAdminSession();
  const postId = Number(formData.get("postId"));
  const parsed = adminBlogPostSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    subtitle: formData.get("subtitle"),
    description: formData.get("description"),
    postDate: formData.get("postDate"),
  });
  if (!parsed.success) {
    redirect(`/admin/blog/${postId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid post")}`);
  }
  await updateBlogPostForAdmin(postId, {
    category: parsed.data.category,
    title: parsed.data.title,
    subtitle: optionalString(formData.get("subtitle")),
    description: parsed.data.description,
    postDate: new Date(parsed.data.postDate),
  });
  revalidatePath("/admin/blog");
  redirect("/admin/blog?saved=1");
}

export async function deleteBlogPostAction(formData: FormData) {
  await requireAdminSession();
  const postId = Number(formData.get("postId"));
  await deleteBlogPostForAdmin(postId);
  revalidatePath("/admin/blog");
  redirect("/admin/blog?saved=1");
}
