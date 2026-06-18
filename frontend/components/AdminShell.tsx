"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookIcon,
  PuzzleIcon,
  ShieldIcon,
  LogoutIcon,
  FeatherIcon,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  Icon: typeof ShieldIcon;
  exact?: boolean;
  superadmin?: boolean;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", Icon: ShieldIcon, exact: true },
  { href: "/admin/wiki", label: "Ensiklopedia", Icon: BookIcon },
  { href: "/admin/kuis", label: "Kuis & Soal", Icon: PuzzleIcon },
  // Superadmin-only.
  { href: "/admin/admins", label: "Akun & Akses", Icon: ShieldIcon, superadmin: true },
  { href: "/admin/docs", label: "Dokumentasi API", Icon: FeatherIcon, superadmin: true },
];

export default function AdminShell({
  username,
  role,
  children,
}: {
  username: string;
  role: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  // RBAC: hide superadmin-only links from regular admins.
  const visibleNav = navItems.filter(
    (i) => !i.superadmin || role === "superadmin",
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <Link href="/" className="flex h-16 items-center gap-2.5 border-b border-border px-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-lg text-surface aksara">
            ᮘ
          </span>
          <span className="font-display text-lg font-semibold text-foreground">
            Bé<span className="text-primary">as</span>
          </span>
        </Link>
        <nav className="flex-1 space-y-1 p-4">
          {visibleNav.map(({ href, label, Icon, exact }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                isActive(href, exact)
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-4">
          <p className="px-2 text-xs text-muted">Masuk sebagai</p>
          <p className="px-2 font-medium text-foreground">{username}</p>
          <p className="px-2 text-xs font-medium text-primary">
            {role === "superadmin" ? "Superadmin" : "Admin"}
          </p>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 cursor-pointer"
          >
            <LogoutIcon className="h-5 w-5" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {visibleNav.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  isActive(href, exact)
                    ? "bg-primary/10 text-primary"
                    : "text-muted"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <button onClick={logout} className="text-danger cursor-pointer" aria-label="Keluar">
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
