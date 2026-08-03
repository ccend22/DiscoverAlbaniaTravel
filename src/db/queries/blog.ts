import { desc, eq } from "drizzle-orm";
import { db } from "../index";
import { blogPosts } from "../schema";

export async function listBlogPosts(category?: "news" | "activity") {
  if (category) {
    return db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.category, category))
      .orderBy(desc(blogPosts.postDate));
  }
  return db.select().from(blogPosts).orderBy(desc(blogPosts.postDate));
}
