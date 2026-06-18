import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi, ApiError } from "@/lib/api";
import { renderArticleHtml } from "@/lib/sanitize";
import type { Article } from "@/lib/types";
import { ArrowRightIcon, ClockIcon } from "@/components/icons";

async function getArticle(slug: string): Promise<Article | null> {
  try {
    return await serverApi<Article>(`/api/wiki/articles/${encodeURIComponent(slug)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug).catch(() => null);
  if (!article) return { title: "Artikel tidak ditemukan" };
  return { title: article.title, description: article.summary };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link
        href="/wiki"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
      >
        <ArrowRightIcon className="h-4 w-4 rotate-180" />
        Kembali ke Ensiklopedia
      </Link>

      <header className="mt-6 border-b border-border pb-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-gold">
          {article.category}
        </span>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-foreground">
          {article.title}
        </h1>
        {article.title_aksara && (
          <p className="aksara mt-3 text-4xl text-primary-soft">
            {article.title_aksara}
          </p>
        )}
        {article.summary && (
          <p className="mt-4 text-lg leading-relaxed text-muted">
            {article.summary}
          </p>
        )}
        <div className="mt-4 flex items-center gap-1.5 text-sm text-muted">
          <ClockIcon className="h-4 w-4" />
          {article.read_minutes} menit baca
        </div>
      </header>

      <div
        className="prose-heritage mt-8"
        dangerouslySetInnerHTML={{ __html: renderArticleHtml(article.content) }}
      />
    </article>
  );
}
