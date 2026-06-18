import Link from "next/link";
import { serverApi } from "@/lib/api";
import type { Article, Level } from "@/lib/types";
import { BookIcon, PuzzleIcon, ArrowRightIcon } from "@/components/icons";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

export default async function AdminDashboard() {
  const [articles, levels] = await Promise.all([
    safe(serverApi<Article[]>("/api/wiki/articles"), []),
    safe(serverApi<Level[]>("/api/quiz/levels"), []),
  ]);
  const totalQuestions = levels.reduce((s, l) => s + l.question_total, 0);

  const stats = [
    { label: "Artikel", value: articles.length, href: "/admin/wiki", Icon: BookIcon },
    { label: "Level Kuis", value: levels.length, href: "/admin/kuis", Icon: PuzzleIcon },
    { label: "Total Soal", value: totalQuestions, href: "/admin/kuis", Icon: PuzzleIcon },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">
        Dashboard
      </h1>
      <p className="mt-1 text-muted">Ringkasan konten Béas.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        {stats.map(({ label, value, href, Icon }) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-4xl font-bold text-foreground">
              {value}
            </p>
            <p className="text-sm text-muted">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Link
          href="/admin/wiki"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary cursor-pointer"
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Kelola Ensiklopedia
            </h2>
            <p className="text-sm text-muted">Tambah & sunting artikel.</p>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-primary" />
        </Link>
        <Link
          href="/admin/kuis"
          className="flex items-center justify-between rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-primary cursor-pointer"
        >
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Kelola Kuis
            </h2>
            <p className="text-sm text-muted">Atur level & soal per tingkat.</p>
          </div>
          <ArrowRightIcon className="h-5 w-5 text-primary" />
        </Link>
      </div>
    </div>
  );
}
