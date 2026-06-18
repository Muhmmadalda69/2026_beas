import Link from "next/link";
import { serverApi } from "@/lib/api";
import type { Article, ChartGroup } from "@/lib/types";
import {
  ArrowRightIcon,
  BookIcon,
  LanguagesIcon,
  PuzzleIcon,
  FeatherIcon,
} from "@/components/icons";

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

const features = [
  {
    href: "/wiki",
    title: "Ensiklopedia",
    desc: "Kumpulan artikel tentang sejarah, kaidah, dan ragam Aksara Sunda.",
    Icon: BookIcon,
  },
  {
    href: "/transliterasi",
    title: "Transliterasi",
    desc: "Ubah tulisan Latin menjadi Aksara Sunda secara langsung dan akurat.",
    Icon: LanguagesIcon,
  },
  {
    href: "/kuis",
    title: "Kuis Bertingkat",
    desc: "Uji kemampuanmu lewat level yang semakin menantang dengan soal acak.",
    Icon: PuzzleIcon,
  },
  {
    href: "/aksara",
    title: "Tabel Aksara",
    desc: "Referensi lengkap aksara swara, ngalagena, rarangkén, dan angka.",
    Icon: FeatherIcon,
  },
];

export default async function HomePage() {
  const [chart, articles] = await Promise.all([
    safe(serverApi<ChartGroup[]>("/api/translit/chart"), []),
    safe(serverApi<Article[]>("/api/wiki/articles"), []),
  ]);

  const ngalagena =
    chart.find((g) => g.key === "ngalagena")?.glyphs.slice(0, 12) ?? [];
  const featured = articles.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-primary">
              <span className="aksara text-sm">ᮃᮊ᮪ᮞᮛ ᮞᮥᮔ᮪ᮓ</span>
              Warisan Budaya Nusantara
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
              Pelajari & Lestarikan{" "}
              <span className="text-primary">Aksara Sunda</span>
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">
              Satu tempat untuk membaca ensiklopedia, mengubah tulisan Latin ke
              aksara, dan berlatih lewat kuis bertingkat.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/transliterasi"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover cursor-pointer"
              >
                Coba Transliterasi
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/kuis"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
              >
                Mainkan Kuis
              </Link>
            </div>
          </div>

          {/* Decorative aksara plate */}
          <div className="animate-fade-up rounded-2xl border border-border bg-surface p-8 shadow-[0_20px_60px_-30px_rgba(120,70,30,0.45)]">
            <p className="text-center text-sm font-medium uppercase tracking-widest text-muted">
              Aksara Ngalagena
            </p>
            <div className="mt-5 grid grid-cols-4 gap-3">
              {ngalagena.length > 0
                ? ngalagena.map((g) => (
                    <div
                      key={g.aksara}
                      className="flex flex-col items-center rounded-xl bg-surface-2 py-4"
                    >
                      <span className="aksara text-3xl text-foreground">
                        {g.aksara}
                      </span>
                      <span className="mt-1 text-xs text-muted">{g.latin}</span>
                    </div>
                  ))
                : "ᮊ ᮌ ᮍ ᮎ ᮏ ᮑ ᮒ ᮓ"
                    .split(" ")
                    .map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-center rounded-xl bg-surface-2 py-4 aksara text-3xl"
                      >
                        {c}
                      </div>
                    ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Empat cara menjelajah
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ href, title, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:border-primary-soft hover:shadow-lg cursor-pointer"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Buka
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured articles */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Dari Ensiklopedia
            </h2>
            <Link
              href="/wiki"
              className="text-sm font-medium text-primary hover:underline"
            >
              Lihat semua
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {featured.map((a) => (
              <Link
                key={a.id}
                href={`/wiki/${a.slug}`}
                className="rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                  {a.category}
                </span>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                  {a.title}
                </h3>
                {a.title_aksara && (
                  <p className="aksara mt-1 text-xl text-primary-soft">
                    {a.title_aksara}
                  </p>
                )}
                <p className="mt-2 line-clamp-2 text-sm text-muted">
                  {a.summary}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
