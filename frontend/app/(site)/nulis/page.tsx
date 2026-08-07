import type { Metadata } from "next";
import { serverApi } from "@/lib/api";
import type { ChartGroup } from "@/lib/types";
import AksaraWriter from "@/components/AksaraWriter";

export const metadata: Metadata = {
  title: "Latihan Menulis Aksara",
  description:
    "Berlatih menulis Aksara Sunda dengan menjiplak glyph acuan, lalu lihat seberapa mirip tulisanmu (0–100).",
};

export default async function NulisPage() {
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
          Latihan
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-foreground">
          Latihan Menulis Aksara
        </h1>
        <p className="mt-3 text-lg text-muted">
          Pilih sebuah aksara, lalu jiplak glyph redup di kanvas mengikuti
          bentuknya. Tekan <strong>Nilai</strong> untuk melihat seberapa mirip
          tulisanmu — makin mirip, makin tinggi (0–100).
        </p>
      </header>

      {error ? (
        <p className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-4 text-danger">
          Tidak dapat memuat daftar aksara. Pastikan layanan backend berjalan.
        </p>
      ) : (
        <div className="mt-10">
          <AksaraWriter groups={groups} />
        </div>
      )}
    </div>
  );
}
