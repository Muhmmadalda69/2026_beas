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
import Reveal from "@/components/motion/Reveal";
import TiltCard from "@/components/motion/TiltCard";
import Parallax from "@/components/motion/Parallax";
import FloatLayer from "@/components/motion/FloatLayer";

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
      {/* Hero — layered parallax stage */}
      <section className="relative overflow-hidden">
        {/* Decorative depth layers (behind content, non-interactive) */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-olive/10 blur-3xl" />
          <Parallax distance={70} className="absolute right-2 top-6 sm:right-10">
            <FloatLayer>
              <span className="aksara select-none text-[14rem] leading-none text-primary/5 sm:text-[20rem]">
                ᮞ
              </span>
            </FloatLayer>
          </Parallax>
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
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
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface transition-all hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Coba Transliterasi
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                href="/kuis"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary hover:text-primary hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                Mainkan Kuis
              </Link>
            </div>
          </Reveal>

          {/* Decorative aksara plate — 3D tilt with glyph tiles that lift */}
          <Reveal delay={0.12} y={28}>
            <TiltCard
              max={8}
              scale={1.01}
              className="scene rounded-2xl border border-border bg-surface p-8 depth-shadow-lg"
            >
              <div className="preserve-3d">
                <p className="text-center text-sm font-medium uppercase tracking-widest text-muted">
                  Aksara Ngalagena
                </p>
                <div className="preserve-3d mt-5 grid grid-cols-4 gap-3">
                  {(ngalagena.length > 0
                    ? ngalagena.map((g) => ({ aksara: g.aksara, latin: g.latin }))
                    : "ᮊ ᮌ ᮍ ᮎ ᮏ ᮑ ᮒ ᮓ"
                        .split(" ")
                        .map((c) => ({ aksara: c, latin: "" }))
                  ).map((g, i) => (
                    <div
                      key={`${g.aksara}-${i}`}
                      className="preserve-3d flex flex-col items-center rounded-xl bg-surface-2 py-4 transition-transform duration-300 hover:[transform:translateZ(34px)_scale(1.06)] hover:bg-primary/10"
                    >
                      <span className="aksara text-3xl text-foreground">
                        {g.aksara}
                      </span>
                      {g.latin && (
                        <span className="mt-1 text-xs text-muted">
                          {g.latin}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Reveal>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Empat cara menjelajah
          </h2>
        </Reveal>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ href, title, desc, Icon }, i) => (
            <Reveal key={href} delay={i * 0.08} className="h-full">
              <TiltCard max={7} className="h-full">
                <Link
                  href={href}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 hover-depth hover:border-primary-soft cursor-pointer"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                    {title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                    {desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Buka
                    <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured articles */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <Reveal>
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
          </Reveal>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {featured.map((a, i) => (
              <Reveal key={a.id} delay={i * 0.08} className="h-full">
                <TiltCard max={6} className="h-full">
                  <Link
                    href={`/wiki/${a.slug}`}
                    className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 hover-depth hover:border-primary-soft cursor-pointer"
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
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
