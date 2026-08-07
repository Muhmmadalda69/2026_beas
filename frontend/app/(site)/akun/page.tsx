import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/user";
import SetPasswordForm from "@/components/SetPasswordForm";

export const metadata: Metadata = { title: "Akun" };

export default async function AkunPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/masuk?next=/akun");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-widest text-gold">Akun</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-foreground">
        Halo, {user.name}
      </h1>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Atur Kata Sandi
        </h2>
        <p className="mt-1 text-sm text-muted">
          Buat kata sandi agar bisa login dengan email &amp; kata sandi — selain
          lewat tombol Google. Jika akunmu dibuat via Google, ini menambahkan
          cara masuk kedua (akun Google tetap bisa dipakai).
        </p>
        <SetPasswordForm />
      </section>
    </div>
  );
}
