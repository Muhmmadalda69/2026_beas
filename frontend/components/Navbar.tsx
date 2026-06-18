"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { MenuIcon, XIcon, LogoutIcon } from "./icons";

const links = [
  { href: "/", label: "Beranda" },
  { href: "/wiki", label: "Ensiklopedia" },
  { href: "/aksara", label: "Aksara" },
  { href: "/transliterasi", label: "Transliterasi" },
  { href: "/kuis", label: "Kuis" },
  { href: "/peringkat", label: "Peringkat" },
];

export default function Navbar({ user }: { user: { name: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const logout = async () => {
    await fetch("/api/user/logout", { method: "POST" });
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Béas beranda">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg text-surface aksara"
            aria-hidden="true"
          >
            ᮘ
          </span>
          <span className="font-display text-xl font-semibold tracking-tight text-foreground">
            Bé<span className="text-primary">as</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user ? (
            <div className="ml-2 flex items-center gap-2">
              <span className="max-w-[10rem] truncate rounded-full bg-surface-2 px-3 py-1.5 text-sm font-medium text-foreground">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-danger cursor-pointer"
                aria-label="Keluar"
              >
                <LogoutIcon className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link
              href="/masuk"
              className="ml-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover"
            >
              Masuk
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-surface-2 lg:hidden cursor-pointer"
          aria-label={open ? "Tutup menu" : "Buka menu"}
          aria-expanded={open}
        >
          {open ? <XIcon /> : <MenuIcon />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-border bg-surface lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-4 py-3 text-base font-medium ${
                  isActive(l.href)
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-surface-2"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex items-center gap-2 rounded-lg px-4 py-3 text-left text-base font-medium text-danger hover:bg-danger/10 cursor-pointer"
              >
                <LogoutIcon className="h-5 w-5" />
                Keluar ({user.name})
              </button>
            ) : (
              <Link
                href="/masuk"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-primary px-4 py-3 text-base font-semibold text-surface"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
