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
