import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { listBlogPostsForAdmin } from "@/db/queries/admin-blog";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [posts, params] = await Promise.all([listBlogPostsForAdmin(), searchParams]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="animate-fade-up font-display text-2xl font-bold text-foreground">Blog</h1>
        <LinkButton href="/admin/blog/new" size="sm">New post</LinkButton>
      </div>
      {params.saved && <div className="mt-6"><Alert tone="success">Changes saved.</Alert></div>}
      {params.error && <div className="mt-6"><Alert tone="error">{params.error}</Alert></div>}
      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-surface shadow-[var(--shadow-xs)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr><th className="px-4 py-3 font-medium">Title</th><th className="px-4 py-3 font-medium">Category</th><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3"><span className="sr-only">Manage</span></th></tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-foreground">{post.title}</td>
                <td className="px-4 py-3"><Badge tone={post.category === "news" ? "info" : "success"}>{post.category}</Badge></td>
                <td className="px-4 py-3 text-muted">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(post.postDate)}</td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/blog/${post.id}`} className="text-sm font-medium text-teal hover:underline">Manage</Link></td>
              </tr>
            ))}
            {posts.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">No posts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
