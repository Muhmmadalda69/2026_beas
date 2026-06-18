"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { userGw, ApiError } from "@/lib/api";
import type { PlaySession, QuizResult } from "@/lib/types";
import { CheckIcon, XIcon, ArrowRightIcon, ClockIcon } from "@/components/icons";

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type Phase = "loading" | "playing" | "result" | "error";

export default function QuizPlayer({ levelId }: { levelId: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<PlaySession | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Live stopwatch while playing (cosmetic; the server measures the official
  // time). Resets when a new session starts, stops when the quiz ends.
  useEffect(() => {
    if (phase !== "playing") return;
    setElapsed(0);
    const startedAt = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [phase, session?.session_id]);

  // Resolve login state once so we can tell the player whether their score will
  // be recorded (anonymous play is allowed, but not ranked).
  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => setLoggedIn(Boolean(d.user)))
      .catch(() => setLoggedIn(false));
  }, []);

  const start = useCallback(async () => {
    setPhase("loading");
    setAnswers({});
    setCurrent(0);
    setResult(null);
    try {
      const s = await userGw<PlaySession>(`quiz/levels/${levelId}/play`, {
        method: "POST",
      });
      setSession(s);
      setPhase("playing");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Gagal memuat kuis.",
      );
      setPhase("error");
    }
  }, [levelId]);

  useEffect(() => {
    start();
  }, [start]);

  if (phase === "loading") {
    return <CenterCard>Memuat soal…</CenterCard>;
  }

  if (phase === "error") {
    return (
      <CenterCard>
        <p className="text-danger">{errorMsg}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button onClick={start} className="btn-primary">
            Coba lagi
          </button>
          <Link href="/kuis" className="btn-ghost">
            Kembali
          </Link>
        </div>
      </CenterCard>
    );
  }

  if (phase === "result" && result) {
    return <ResultView result={result} onReplay={start} loggedIn={loggedIn} />;
  }

  if (!session) return null;

  const total = session.questions.length;
  const q = session.questions[current];
  const selected = answers[q.id];
  const answeredCount = Object.keys(answers).length;
  const isLast = current === total - 1;

  const choose = (option: string) =>
    setAnswers((prev) => ({ ...prev, [q.id]: option }));

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        session_id: session.session_id,
        answers: Object.entries(answers).map(([question_id, answer]) => ({
          question_id,
          answer,
        })),
      };
      const res = await userGw<QuizResult>("quiz/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setResult(res);
      setPhase("result");
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : "Gagal mengirim jawaban.",
      );
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between text-sm text-muted">
        <Link href="/kuis" className="font-medium text-primary hover:underline">
          ← Keluar
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 font-medium tabular-nums text-foreground">
            <ClockIcon className="h-4 w-4 text-primary" />
            {formatTime(elapsed)}
          </span>
          <span>
            Soal {current + 1} / {total}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${((current + 1) / total) * 100}%` }}
        />
      </div>

      {loggedIn === false && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gold/30 bg-gold/5 px-4 py-2.5 text-sm">
          <span className="text-foreground">
            Main sebagai tamu — skor tidak masuk papan peringkat.
          </span>
          <Link
            href={`/masuk?next=/kuis/${session.level.id}`}
            className="shrink-0 font-semibold text-primary hover:underline"
          >
            Masuk
          </Link>
        </div>
      )}

      <h2 className="mt-6 font-display text-sm font-semibold uppercase tracking-wider text-gold">
        {session.level.title}
      </h2>

      <div className="mt-4 rounded-2xl border border-border bg-surface p-6">
        <p className="text-xl font-medium text-foreground">{q.prompt}</p>
        {q.prompt_aksara && (
          <p className="aksara mt-3 text-4xl text-primary-soft">
            {q.prompt_aksara}
          </p>
        )}

        <div className="mt-6 grid gap-3">
          {q.options.map((opt, i) => {
            const active = selected === opt;
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(opt)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary-soft"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                    active
                      ? "border-primary bg-primary text-surface"
                      : "border-border text-muted"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="aksara text-2xl text-foreground">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="btn-ghost disabled:opacity-40"
        >
          Sebelumnya
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={submit}
            disabled={submitting || answeredCount < total}
            className="btn-primary disabled:opacity-50"
          >
            {submitting
              ? "Mengirim…"
              : answeredCount < total
                ? `Jawab semua (${answeredCount}/${total})`
                : "Selesai & Lihat Nilai"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.min(total - 1, c + 1))}
            disabled={!selected}
            className="btn-primary disabled:opacity-50"
          >
            Lanjut <ArrowRightIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        strong ? "border-primary bg-primary/5" : "border-border bg-surface"
      }`}
    >
      <p
        className={`font-display text-2xl font-bold tabular-nums ${
          accent ? "text-olive" : strong ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <div className="rounded-2xl border border-border bg-surface p-8 text-muted">
        {children}
      </div>
    </div>
  );
}

function ResultView({
  result,
  onReplay,
  loggedIn,
}: {
  result: QuizResult;
  onReplay: () => void;
  loggedIn: boolean | null;
}) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div
        className={`rounded-2xl border p-8 text-center ${
          result.passed
            ? "border-olive/40 bg-olive/5"
            : "border-gold/40 bg-gold/5"
        }`}
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-muted">
          {result.passed ? "Selamat, kamu lulus!" : "Belum lulus, terus berlatih"}
        </p>
        <p className="mt-3 font-display text-6xl font-bold text-foreground">
          {result.score}
          <span className="text-2xl text-muted">/100</span>
        </p>
        <p className="mt-2 text-muted">
          {result.correct_count} dari {result.total} soal benar
        </p>

        {/* Points breakdown: accuracy + speed bonus = final leaderboard points */}
        <div className="mx-auto mt-5 grid max-w-md grid-cols-3 gap-2 text-center">
          <Stat label="Poin akurasi" value={`${result.points_earned}`} />
          <Stat
            label="Bonus waktu"
            value={`+${result.time_bonus}`}
            hint={formatTime(result.duration_seconds)}
            accent
          />
          <Stat label="Poin akhir" value={`${result.final_points}`} strong />
        </div>
        <p className="mt-3 text-xs text-muted">
          Jawaban benar yang lebih cepat memberi bonus poin lebih besar.
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button onClick={onReplay} className="btn-primary">
            Main lagi (soal baru)
          </button>
          <Link href="/kuis" className="btn-ghost">
            Pilih level lain
          </Link>
        </div>

        {loggedIn === false ? (
          <p className="mt-5 text-sm text-muted">
            Skor ini belum tercatat.{" "}
            <Link href="/masuk?next=/peringkat" className="font-semibold text-primary hover:underline">
              Masuk
            </Link>{" "}
            agar tampil di papan peringkat.
          </p>
        ) : loggedIn ? (
          <p className="mt-5 text-sm text-muted">
            Skor tersimpan.{" "}
            <Link href="/peringkat" className="font-semibold text-primary hover:underline">
              Lihat papan peringkat →
            </Link>
          </p>
        ) : null}
      </div>

      <h3 className="mt-10 font-display text-xl font-semibold text-foreground">
        Pembahasan
      </h3>
      <div className="mt-4 space-y-3">
        {result.details.map((d, i) => (
          <div
            key={d.question_id}
            className="rounded-xl border border-border bg-surface p-5"
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  d.correct
                    ? "bg-olive/15 text-olive"
                    : "bg-danger/15 text-danger"
                }`}
              >
                {d.correct ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <XIcon className="h-4 w-4" />
                )}
              </span>
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {i + 1}. {d.prompt}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Jawabanmu:{" "}
                  <span className="aksara text-lg text-foreground">
                    {d.your_answer || "—"}
                  </span>
                </p>
                {!d.correct && (
                  <p className="text-sm text-muted">
                    Jawaban benar:{" "}
                    <span className="aksara text-lg text-olive">
                      {d.correct_answer}
                    </span>
                  </p>
                )}
                {d.explanation && (
                  <p className="mt-1 text-sm italic text-muted">
                    {d.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
