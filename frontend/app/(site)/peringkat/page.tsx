import type { Metadata } from "next";
import Link from "next/link";
import { serverApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/user";
import type { LeaderboardEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Papan Peringkat",
  description: "Peringkat pemain kuis Aksara Sunda berdasarkan skor terbaik.",
};

const medal = ["bg-gold/15 text-gold", "bg-muted/15 text-muted", "bg-primary-soft/20 text-primary"];

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}d` : `${s}d`;
}

export default async function PeringkatPage() {
  let entries: LeaderboardEntry[] = [];
  let error = false;
  try {
    entries = await serverApi<LeaderboardEntry[]>("/api/quiz/leaderboard");
  } catch {
    error = true;
  }
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold">
          Kompetisi
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-foreground">
          Papan Peringkat
        </h1>
        <p className="mt-3 text-lg text-muted">
          Peringkat dihitung dari jumlah poin terbaik tiap level (akurasi +
          bonus kecepatan). Jika poin seri, pemain yang lebih cepat unggul.
        </p>
      </header>

      {!user && (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5">
          <p className="text-sm text-foreground">
            Skor hanya tercatat jika kamu masuk terlebih dahulu.
          </p>
          <Link href="/masuk?next=/peringkat" className="btn-primary shrink-0">
            Masuk
          </Link>
        </div>
      )}

      {error ? (
        <p className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger">
          Tidak dapat memuat papan peringkat.
        </p>
      ) : entries.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          Belum ada yang bermain. Jadilah yang pertama!
          <div className="mt-4">
            <Link href="/kuis" className="btn-primary">
              Main Kuis
            </Link>
          </div>
        </div>
      ) : (
        <ol className="mt-8 space-y-2">
          {entries.map((e) => (
            <li
              key={e.rank}
              className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${
                  medal[e.rank - 1] ?? "bg-surface-2 text-muted"
                }`}
              >
                {e.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{e.name}</p>
                <p className="text-xs text-muted">
                  {e.levels_cleared} level lulus · {e.plays} kali main · ⏱{" "}
                  {formatDuration(e.total_seconds)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold text-primary tabular-nums">
                  {e.total_score}
                </p>
                <p className="text-xs text-muted">poin</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
