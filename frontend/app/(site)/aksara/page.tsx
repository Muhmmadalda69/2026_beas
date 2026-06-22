import type { Metadata } from "next";
import { serverApi } from "@/lib/api";
import type { ChartGroup } from "@/lib/types";
import Reveal from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Tabel Aksara Sunda",
  description:
    "Referensi lengkap Aksara Sunda: swara, ngalagena, rarangkén, dan angka.",
};

export default async function AksaraPage() {
  let groups: ChartGroup[] = [];
  let error = false;
  try {
    groups = await serverApi<ChartGroup[]>("/api/translit/chart");
  } catch {
    error = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-gold">
          Referensi
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-foreground">
          Tabel Aksara Sunda
        </h1>
        <p className="mt-3 text-lg text-muted">
          Daftar lengkap karakter Aksara Sunda Baku beserta nama dan
          pelafalannya. Klik tab pada menu untuk mempelajari tiap kelompok.
        </p>
      </header>

      {error && (
        <p className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger">
          Tidak dapat memuat tabel aksara. Pastikan layanan backend berjalan.
        </p>
      )}

      <div className="mt-10 space-y-12">
        {groups.map((group) => (
          <section key={group.key} id={group.key}>
            <Reveal>
              <h2 className="font-display text-2xl font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                {group.description}
              </p>
              <div className="scene mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {group.glyphs.map((g, i) => (
                  <div
                    key={`${group.key}-${i}`}
                    className="preserve-3d flex flex-col items-center rounded-2xl border border-border bg-surface p-5 text-center hover-depth hover:border-primary-soft hover:bg-primary/5 hover:[transform:translateZ(20px)] cursor-default"
                  >
                    <span className="aksara text-5xl leading-none text-foreground">
                      {g.aksara}
                    </span>
                    <span className="mt-3 font-semibold text-primary">
                      {g.latin}
                    </span>
                    <span className="text-xs text-muted">{g.name}</span>
                    {g.example && (
                      <span className="aksara mt-2 text-sm text-primary-soft">
                        {g.example}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Reveal>
          </section>
        ))}
      </div>
    </div>
  );
}
