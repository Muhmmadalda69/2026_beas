import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface-2/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg text-surface aksara">
              ᮘ
            </span>
            <span className="font-display text-xl font-semibold text-foreground">
              Béas
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Ensiklopedia, alat transliterasi, dan kuis untuk melestarikan dan
            mempelajari Aksara Sunda.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Jelajahi
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/wiki" className="hover:text-primary">Ensiklopedia</Link></li>
            <li><Link href="/aksara" className="hover:text-primary">Tabel Aksara</Link></li>
            <li><Link href="/transliterasi" className="hover:text-primary">Transliterasi</Link></li>
            <li><Link href="/kuis" className="hover:text-primary">Kuis Bertingkat</Link></li>
            <li><Link href="/peringkat" className="hover:text-primary">Papan Peringkat</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Tentang
          </h4>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Béas ini adalah platform edukasi aksara sunda yang dikembangkan oleh Taruma Institute 
          </p>
          <h4 className="mt-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Versi
          </h4>
          <p className="text-sm leading-relaxed text-muted">
            Beta v0.1.0 
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted">
        Taruma Institute © {new Date().getFullYear()} Béas · Dibuat untuk pelestarian budaya Sunda
      </div>
    </footer>
  );
}
