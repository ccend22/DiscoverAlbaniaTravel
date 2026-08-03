import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { createBlogPostAction } from "../actions";
import { Button } from "@/components/ui/button";

export default async function NewBlogPostPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/blog" className="text-sm text-teal hover:underline">← Back to blog</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">New post</h1>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <form action={createBlogPostAction} className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select name="category" required defaultValue="news" className="rounded-md border border-border bg-background px-3 py-2">
            <option value="news">News</option>
            <option value="activity">Activity</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Title</span><input name="title" required className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Subtitle <span className="font-normal text-muted">(optional)</span></span><input name="subtitle" className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Post date</span><input name="postDate" type="date" required defaultValue={today} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Description</span><textarea name="description" required rows={6} className="resize-y rounded-md border border-border bg-background px-3 py-2" /></label>
        <div><Button type="submit">Create post</Button></div>
      </form>
    </div>
  );
}
