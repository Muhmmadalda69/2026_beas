import type { Metadata } from "next";
import Link from "next/link";
import { serverApi } from "@/lib/api";
import { getUserToken, getCurrentUser } from "@/lib/user";
import type { Level } from "@/lib/types";
import { PuzzleIcon, ArrowRightIcon, LockIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Kuis Aksara Sunda",
  description: "Kuis bertingkat untuk menguji kemampuan membaca Aksara Sunda.",
};

const difficultyColor: Record<string, string> = {
  Pemula: "text-olive bg-olive/10",
  Menengah: "text-gold bg-gold/10",
  Mahir: "text-primary bg-primary/10",
};

export default async function KuisPage() {
  // Fetch with the player's token so unlock status is computed for them.
  const [token, user] = await Promise.all([getUserToken(), getCurrentUser()]);
  let levels: Level[] = [];
  let error = false;
  try {
    levels = await serverApi<Level[]>("/api/quiz/levels", { token });
  } catch {
    error = true;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold">
          Latihan
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-foreground">
          Kuis Bertingkat
        </h1>
        <p className="mt-3 text-lg text-muted">
          Setiap level menaikkan tingkat kesulitan. Selesaikan (lulus) sebuah
          level untuk membuka level berikutnya. Soal diacak ulang setiap main.
        </p>
      </header>

      {!user && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-sm text-foreground">
            Masuk untuk menyimpan progres dan membuka level lanjutan.
          </p>
          <Link href="/masuk?next=/kuis" className="btn-primary shrink-0">
            Masuk
          </Link>
        </div>
      )}

      {error ? (
        <p className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger">
          Tidak dapat memuat level kuis. Pastikan layanan backend berjalan.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((level, i) => {
            const hasQuestions = level.question_total > 0;
            const locked = !level.unlocked;
            const playable = hasQuestions && !locked;
            const badge =
              difficultyColor[level.difficulty] ?? "text-muted bg-surface-2";
            const prevTitle = i > 0 ? levels[i - 1].title : "";
            return (
              <div
                key={level.id}
                className={`flex flex-col rounded-2xl border p-6 transition-opacity ${
                  locked
                    ? "border-border bg-surface-2/40"
                    : "border-border bg-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      locked
                        ? "bg-muted/10 text-muted"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {locked ? (
                      <LockIcon className="h-6 w-6" />
                    ) : (
                      <PuzzleIcon className="h-6 w-6" />
                    )}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${badge}`}
                  >
                    {level.difficulty}
                  </span>
                </div>
                <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
                  {level.title}
                </h2>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                  {level.description}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-surface-2 px-3 py-2">
                    <dt className="text-xs text-muted">Soal per main</dt>
                    <dd className="font-semibold text-foreground">
                      {level.draw_count || level.question_total}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-surface-2 px-3 py-2">
                    <dt className="text-xs text-muted">Nilai lulus</dt>
                    <dd className="font-semibold text-foreground">
                      {level.pass_score}%
                    </dd>
                  </div>
                </dl>
                {!hasQuestions ? (
                  <span className="mt-5 inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted">
                    Belum ada soal
                  </span>
                ) : locked ? (
                  <span className="mt-5 inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-muted">
                    <LockIcon className="h-4 w-4" />
                    {user
                      ? `Lulus "${prevTitle}" dulu`
                      : "Masuk untuk membuka"}
                  </span>
                ) : (
                  <Link
                    href={`/kuis/${level.id}`}
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover cursor-pointer"
                  >
                    Mulai Level {level.number}
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
