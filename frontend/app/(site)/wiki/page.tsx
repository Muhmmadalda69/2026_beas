import type { Metadata } from "next";
import Link from "next/link";
import { serverApi } from "@/lib/api";
import type { Article } from "@/lib/types";
import { ClockIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Ensiklopedia Aksara Sunda",
  description: "Artikel tentang sejarah dan kaidah Aksara Sunda.",
};

export default async function WikiPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category = "", q = "" } = await searchParams;

  let articles: Article[] = [];
  let categories: string[] = [];
  let error = false;
  try {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    const qs = params.toString() ? `?${params}` : "";
    [articles, categories] = await Promise.all([
      serverApi<Article[]>(`/api/wiki/articles${qs}`),
      serverApi<string[]>("/api/wiki/categories"),
    ]);
  } catch {
    error = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold">
          Ensiklopedia
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-foreground">
          Wikipedia Aksara Sunda
        </h1>
        <p className="mt-3 text-lg text-muted">
          Telusuri artikel mengenai asal-usul, kaidah, dan penggunaan Aksara
          Sunda.
        </p>
      </header>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/wiki"
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              !category
                ? "bg-primary text-surface"
                : "border border-border bg-surface text-muted hover:text-primary"
            }`}
          >
            Semua
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={`/wiki?category=${encodeURIComponent(c)}`}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                category === c
                  ? "bg-primary text-surface"
                  : "border border-border bg-surface text-muted hover:text-primary"
              }`}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {error ? (
        <p className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger">
          Tidak dapat memuat artikel. Pastikan layanan backend berjalan.
        </p>
      ) : articles.length === 0 ? (
        <p className="mt-10 text-muted">Belum ada artikel pada kategori ini.</p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/wiki/${a.slug}`}
              className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                {a.category}
              </span>
              <h2 className="mt-2 font-display text-xl font-semibold text-foreground">
                {a.title}
              </h2>
              {a.title_aksara && (
                <p className="aksara mt-1 text-2xl text-primary-soft">
                  {a.title_aksara}
                </p>
              )}
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
                {a.summary}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted">
                <ClockIcon className="h-4 w-4" />
                {a.read_minutes} menit baca
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
