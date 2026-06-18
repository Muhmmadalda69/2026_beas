import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, googleEnabled } from "@/lib/user";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/kuis", error } = await searchParams;

  // Already logged in → no need to show the form.
  if (await getCurrentUser()) redirect(next);

  // Only allow internal redirect targets to avoid open-redirect abuse.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/kuis";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <header className="mb-6 text-center">
        <h1 className="font-display text-3xl font-bold text-foreground">
          Selamat datang
        </h1>
        <p className="mt-2 text-muted">
          Masuk untuk menyimpan skor kuis dan tampil di papan peringkat.
        </p>
      </header>

      <AuthForm googleEnabled={googleEnabled()} next={safeNext} initialError={error} />

      <p className="mt-6 text-center text-sm text-muted">
        Hanya ingin melihat-lihat?{" "}
        <Link href="/kuis" className="font-medium text-primary hover:underline">
          Main tanpa login
        </Link>
      </p>
    </div>
  );
}
