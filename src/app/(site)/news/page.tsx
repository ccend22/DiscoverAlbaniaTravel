import Link from "next/link";
import { listBlogPosts } from "@/db/queries/blog";
import { Badge } from "@/components/ui/badge";
import { ArrowRightIcon, CalendarIcon } from "@/components/icons";
import { getLocaleAndDictionary } from "@/lib/i18n";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Travel News & Activities",
  description: "Read travel news, destination updates, and activity ideas for exploring Albania.",
  alternates: { canonical: "/news" },
};

interface NewsPageProps {
  searchParams: Promise<{ category?: string; page?: string }>;
}

const PAGE_SIZE = 24;

// Complete literal classes per accent — Tailwind can't resolve `bg-${color}`
// template interpolation, so each full string must appear as-is in source.
const POST_ACCENTS = [
  { border: "border-teal", icon: "text-teal", badge: "bg-teal-soft" },
  { border: "border-coral", icon: "text-coral", badge: "bg-coral-soft" },
  { border: "border-gold", icon: "text-gold", badge: "bg-gold-soft" },
  { border: "border-sky", icon: "text-sky", badge: "bg-sky-soft" },
] as const;

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const { category, page: pageParam } = await searchParams;
  const validCategory = category === "news" || category === "activity" ? category : undefined;
  const parsedPage = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [pageRows, { locale, dict }] = await Promise.all([
    listBlogPosts(validCategory, { limit: PAGE_SIZE + 1, offset: (page - 1) * PAGE_SIZE }),
    getLocaleAndDictionary(),
  ]);
  const hasNextPage = pageRows.length > PAGE_SIZE;
  const posts = pageRows.slice(0, PAGE_SIZE);
  const np = dict.newsPage;

  const TABS = [
    { value: undefined, label: np.tabAll },
    { value: "news", label: np.tabNews },
    { value: "activity", label: np.tabActivities },
  ] as const;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex animate-fade-up items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold-soft text-gold shadow-[var(--shadow-xs)]">
          <CalendarIcon width={18} height={18} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-gold">{np.kicker}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{np.title}</h1>
        </div>
      </div>

      <div className="mt-6 flex w-fit gap-1 rounded-md bg-surface-sunken p-1 text-sm">
        {TABS.map((tab) => {
          const active = validCategory === tab.value;
          return (
            <Link
              key={tab.label}
              href={tab.value ? `/news?category=${tab.value}` : "/news"}
              className={`rounded px-3 py-1.5 font-medium transition-all duration-[var(--dur-fast)] ease-[var(--ease-out-expo)] ${
                active ? "bg-brand text-brand-foreground shadow-sm" : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4">
        {posts.map((post, index) => {
          const accent = POST_ACCENTS[index % POST_ACCENTS.length];
          return (
            <article
              key={post.id}
              className={`card-lift rounded-md border border-l-4 border-border bg-surface p-5 shadow-[var(--shadow-xs)] ${accent.border}`}
            >
              <div className="flex items-center gap-2">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${accent.badge} ${accent.icon}`}>
                  <CalendarIcon width={14} height={14} />
                </span>
                <Badge tone={post.category === "news" ? "info" : "success"}>
                  {post.category === "news" ? np.categoryNews : np.categoryActivity}
                </Badge>
                <p className="text-xs text-muted">
                  {new Intl.DateTimeFormat(locale === "al" ? "sq-AL" : "en-US", { dateStyle: "long" }).format(post.postDate)}
                </p>
              </div>
              <h2 className="mt-3 font-display text-lg font-semibold text-foreground">{post.title}</h2>
              {post.subtitle && <p className="mt-1 text-sm text-muted">{post.subtitle}</p>}
              <p className="mt-2 line-clamp-3 text-sm text-foreground/90">{post.description}</p>
            </article>
          );
        })}

        {posts.length === 0 && (
          <p className="rounded-md border border-border bg-surface p-8 text-center text-sm text-muted shadow-[var(--shadow-xs)]">
            {np.noPosts}
          </p>
        )}
      </div>

      {(page > 1 || hasNextPage) && (
        <nav className="mt-8 flex items-center justify-between gap-4" aria-label="News pagination">
          {page > 1 ? (
            <Link href={`/news?${new URLSearchParams({ ...(validCategory ? { category: validCategory } : {}), page: String(page - 1) })}`} className="text-sm font-medium text-teal hover:underline">
              {locale === "al" ? "Më të rejat" : "Newer posts"}
            </Link>
          ) : <span />}
          {hasNextPage && (
            <Link href={`/news?${new URLSearchParams({ ...(validCategory ? { category: validCategory } : {}), page: String(page + 1) })}`} className="text-sm font-medium text-teal hover:underline">
              {locale === "al" ? "Më të vjetrat" : "Older posts"}
            </Link>
          )}
        </nav>
      )}

      <Link
        href="/"
        className="group mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-teal"
      >
        <span className="relative">
          {np.backToSearch}
          <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-teal transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:scale-x-100" />
        </span>
        <ArrowRightIcon width={16} height={16} className="transition-transform duration-[var(--dur-base)] ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
