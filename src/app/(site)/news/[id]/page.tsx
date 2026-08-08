import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPostById } from "@/db/queries/blog";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon, CalendarIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";
import type { Metadata } from "next";

interface NewsDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const post = await getBlogPostById(Number(id));
  if (!post) return { title: "Post Not Found", robots: { index: false } };

  return {
    title: post.title,
    description: post.description.slice(0, 160),
    alternates: { canonical: `/news/${post.id}` },
  };
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params;
  const post = await getBlogPostById(Number(id));
  if (!post) notFound();
  const { locale, dict } = await getLocaleAndDictionary();
  const np = dict.newsPage;

  return (
    <div className="public-page mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <Link href="/news" className="group inline-flex items-center gap-1.5 text-sm font-medium text-teal">
        <span className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:-translate-x-0.5">←</span>
        <span className="relative">
          {np.backToNews}
          <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
        </span>
      </Link>

      <article className="mt-6 animate-fade-up">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal">
            <CalendarIcon width={14} height={14} />
          </span>
          <Badge tone={post.category === "news" ? "info" : "success"}>
            {post.category === "news" ? np.categoryNews : np.categoryActivity}
          </Badge>
          <p className="text-xs text-muted">
            {new Intl.DateTimeFormat(locale === "al" ? "sq-AL" : "en-US", { dateStyle: "long" }).format(post.postDate)}
          </p>
        </div>

        <h1 className="mt-4 font-display text-3xl font-black tracking-[-0.03em] text-brand-navy sm:text-4xl">{post.title}</h1>
        {post.subtitle && <p className="mt-2 text-base text-muted">{post.subtitle}</p>}

        <p className="mt-6 whitespace-pre-line text-base leading-8 text-foreground/90">{post.description}</p>
      </article>

      <Link href="/news" className="group mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-teal">
        <span className="relative">
          {np.backToNews}
          <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
        </span>
        <ArrowRightIcon width={16} height={16} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
