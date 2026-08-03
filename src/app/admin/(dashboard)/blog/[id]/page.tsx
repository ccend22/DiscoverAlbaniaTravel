import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import Link from "next/link";
import { getBlogPostForAdmin } from "@/db/queries/admin-blog";
import { updateBlogPostAction, deleteBlogPostAction } from "../actions";
import { Button } from "@/components/ui/button";

export default async function BlogPostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();
  const post = await getBlogPostForAdmin(postId);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/admin/blog" className="text-sm text-teal hover:underline">← Back to blog</Link>
      <h1 className="mt-2 font-display text-2xl font-bold text-foreground">{post.title}</h1>
      {error && <div className="mt-6"><Alert tone="error">{error}</Alert></div>}
      <form action={updateBlogPostAction} className="mt-6 flex flex-col gap-4 rounded-md border border-border bg-surface p-5 shadow-[var(--shadow-sm)]">
        <input type="hidden" name="postId" value={post.id} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Category</span>
          <select name="category" required defaultValue={post.category} className="rounded-md border border-border bg-background px-3 py-2">
            <option value="news">News</option>
            <option value="activity">Activity</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Title</span><input name="title" required defaultValue={post.title} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Subtitle</span><input name="subtitle" defaultValue={post.subtitle ?? ""} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Post date</span><input name="postDate" type="date" required defaultValue={post.postDate.toISOString().slice(0, 10)} className="rounded-md border border-border bg-background px-3 py-2" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-medium">Description</span><textarea name="description" required rows={6} defaultValue={post.description} className="resize-y rounded-md border border-border bg-background px-3 py-2" /></label>
        <div><Button type="submit">Save post</Button></div>
      </form>

      <div className="mt-8 rounded-md border border-red/30 bg-red-soft/40 p-5">
        <p className="text-sm font-semibold text-red">Danger zone</p>
        <form action={deleteBlogPostAction} className="mt-3">
          <input type="hidden" name="postId" value={post.id} />
          <Button type="submit" variant="danger">Delete post</Button>
        </form>
      </div>
    </div>
  );
}
