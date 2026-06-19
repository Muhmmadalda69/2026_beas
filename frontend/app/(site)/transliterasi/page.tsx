"use client";

import { useEffect, useRef, useState } from "react";
import { clientGw } from "@/lib/api";
import { CheckIcon, LanguagesIcon } from "@/components/icons";
import { Skeleton } from "@/components/Skeleton";

interface TranslitResponse {
  input: string;
  aksara: string;
}

const examples = ["Wilujeng sumping", "Kuring resep diajar", "Tanah Sunda", "sampurasun"];

export default function TransliterasiPage() {
  const [text, setText] = useState("Wilujeng sumping");
  const [aksara, setAksara] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const value = text.trim();
    if (!value) {
      setAksara("");
      setError("");
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await clientGw<TranslitResponse>("translit/transliterate", {
          method: "POST",
          body: JSON.stringify({ text: value }),
        });
        setAksara(res.aksara);
      } catch {
        setError("Gagal mentransliterasi. Coba lagi.");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [text]);

  const copy = async () => {
    if (!aksara) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(aksara);
      } else {
        // Fallback untuk Safari lama
        const textarea = document.createElement("textarea");
        textarea.value = aksara;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Gagal copy, tapi user masih bisa manual copy
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold">
          Alat
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-foreground">
          Transliterasi Latin → Aksara Sunda
        </h1>
        <p className="mt-3 text-lg text-muted">
          Ketik teks dalam huruf Latin, hasil Aksara Sunda muncul secara
          langsung.
        </p>
      </header>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {/* Input */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <label
            htmlFor="latin-input"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <LanguagesIcon className="h-5 w-5 text-primary" />
            Teks Latin
          </label>
          <textarea
            id="latin-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            maxLength={5000}
            placeholder="Tulis di sini…"
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background p-4 text-lg text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setText(ex)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-primary cursor-pointer"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Output */}
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">
              Hasil Aksara
            </span>
            <button
              type="button"
              onClick={copy}
              disabled={!aksara}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40 cursor-pointer"
            >
              {copied ? (
                <>
                  <CheckIcon className="h-3.5 w-3.5" /> Tersalin
                </>
              ) : (
                "Salin"
              )}
            </button>
          </div>
          <div className="mt-3 min-h-[180px] rounded-xl border border-border bg-background p-4">
            {error ? (
              <p className="text-danger">{error}</p>
            ) : loading && !aksara ? (
              // First-time conversion: show shimmering lines. On later keystrokes
              // we keep the previous result (dimmed) instead, to avoid flicker.
              <div role="status" aria-busy="true" className="space-y-3">
                <span className="sr-only">Memproses…</span>
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-4/5" />
                <Skeleton className="h-9 w-2/3" />
              </div>
            ) : aksara ? (
              <p
                className={`aksara text-4xl leading-relaxed text-foreground break-words transition-opacity ${
                  loading ? "opacity-50" : "opacity-100"
                }`}
              >
                {aksara}
              </p>
            ) : (
              <p className="text-muted">Hasil akan tampil di sini.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface-2/60 p-5 text-sm text-muted">
        <p className="font-semibold text-foreground">Catatan ejaan</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Gunakan <strong className="text-foreground">e</strong> untuk bunyi
            pepet (e lemah) dan <strong className="text-foreground">é</strong>{" "}
            untuk e tegas.
          </li>
          <li>
            Tulis <strong className="text-foreground">eu</strong>,{" "}
            <strong className="text-foreground">ng</strong>,{" "}
            <strong className="text-foreground">ny</strong> sesuai bunyinya.
          </li>
          <li>Angka 0–9 otomatis diubah ke angka Sunda.</li>
        </ul>
      </div>
    </div>
  );
}
