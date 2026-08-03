import { db } from "../../src/db";
import { blogPosts } from "../../src/db/schema";
import { readCsv } from "./csv";

interface BlogRow {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  post_date: string;
}

async function seedFile(path: string, category: "news" | "activity"): Promise<number> {
  const rows = readCsv<BlogRow>(path);

  for (const row of rows) {
    await db
      .insert(blogPosts)
      .values({
        sourceId: Number(row.id),
        category,
        title: row.title,
        subtitle: row.subtitle || null,
        description: row.description,
        postDate: new Date(row.post_date),
      })
      .onConflictDoUpdate({
        target: blogPosts.sourceId,
        set: {
          category,
          title: row.title,
          subtitle: row.subtitle || null,
          description: row.description,
          postDate: new Date(row.post_date),
        },
      });
  }

  return rows.length;
}

export async function seedBlogPosts(): Promise<number> {
  const newsCount = await seedFile("data/blog_news_table.csv", "news");
  const activitiesCount = await seedFile("data/blog_activities_table.csv", "activity");

  console.log(`blog_posts: seeded ${newsCount + activitiesCount} (${newsCount} news, ${activitiesCount} activity)`);
  return newsCount + activitiesCount;
}
