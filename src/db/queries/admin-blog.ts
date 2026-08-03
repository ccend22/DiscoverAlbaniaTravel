import { desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { blogPosts } from "../schema";

// See admin-stations.ts: negative, monotonically decreasing synthetic IDs
// avoid colliding with scraped (positive) source IDs without overflowing
// Postgres's 32-bit integer column.
async function nextSyntheticSourceId(): Promise<number> {
  const [row] = await db.select({ min: sql<number | null>`min(${blogPosts.sourceId})` }).from(blogPosts);
  const current = row?.min ?? 0;
  return current > 0 ? -1 : current - 1;
}

export type AdminMutationResult = { ok: true } | { ok: false; error: string };

export interface BlogPostInput {
  category: "news" | "activity";
  title: string;
  subtitle: string | null;
  description: string;
  postDate: Date;
}

export async function listBlogPostsForAdmin() {
  return db.select().from(blogPosts).orderBy(desc(blogPosts.postDate));
}

export async function getBlogPostForAdmin(id: number) {
  const [row] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return row ?? null;
}

export async function createBlogPostForAdmin(
  input: BlogPostInput
): Promise<{ ok: true; postId: number }> {
  const [created] = await db
    .insert(blogPosts)
    .values({ ...input, sourceId: await nextSyntheticSourceId() })
    .returning({ id: blogPosts.id });
  return { ok: true, postId: created.id };
}

export async function updateBlogPostForAdmin(id: number, input: BlogPostInput): Promise<AdminMutationResult> {
  await db.update(blogPosts).set(input).where(eq(blogPosts.id, id));
  return { ok: true };
}

export async function deleteBlogPostForAdmin(id: number): Promise<AdminMutationResult> {
  await db.delete(blogPosts).where(eq(blogPosts.id, id));
  return { ok: true };
}
