import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { blogPosts } from "../schema";

export async function listBlogPosts(
  category?: "news" | "activity",
  options: { limit?: number; offset?: number } = {}
) {
  const limit = Math.min(Math.max(options.limit ?? 24, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  if (category) {
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.category, category))
      .orderBy(desc(blogPosts.postDate))
      .limit(limit)
      .offset(offset);
  }
  return db.select().from(blogPosts).orderBy(desc(blogPosts.postDate)).limit(limit).offset(offset);
}

export async function getBlogPostById(id: number) {
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1);
  return post ?? null;
}

/** Every post's id + date, unpaginated — for the sitemap, not user-facing listings. */
export async function listAllBlogPostIds(): Promise<{ id: number; postDate: Date }[]> {
  return db.select({ id: blogPosts.id, postDate: blogPosts.postDate }).from(blogPosts).orderBy(desc(blogPosts.postDate));
}
