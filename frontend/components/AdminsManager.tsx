"use client";

import { useCallback, useEffect, useState } from "react";
import { clientGw, ApiError } from "@/lib/api";
import type { AdminAccount } from "@/lib/types";
import { PlusIcon, TrashIcon, ShieldIcon } from "@/components/icons";
import { Skeleton } from "@/components/Skeleton";

const roleLabel: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
};

export default function AdminsManager({
  currentUsername,
}: {
  currentUsername: string;
}) {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "admin" });

  const load = useCallback(async () => {
    try {
      setAdmins(await clientGw<AdminAccount[]>("auth/admins"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat admin.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await clientGw("auth/admins", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setShowForm(false);
      setForm({ username: "", password: "", role: "admin" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal membuat admin.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: AdminAccount) => {
    if (!confirm(`Hapus akun "${a.username}"?`)) return;
    try {
      await clientGw(`auth/admins/${a.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menghapus admin.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Akun &amp; Akses
          </h1>
          <p className="mt-1 text-sm text-muted">
            Kelola akun admin dan perannya (RBAC). Hanya superadmin yang dapat
            membuka halaman ini.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <PlusIcon className="h-4 w-4" /> Admin Baru
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {!loaded &&
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              role="status"
              aria-busy="true"
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
            >
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-2 h-3 w-16" />
              </div>
            </div>
          ))}
        {admins.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  a.role === "superadmin"
                    ? "bg-primary/15 text-primary"
                    : "bg-surface-2 text-muted"
                }`}
              >
                <ShieldIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium text-foreground">
                  {a.username}
                  {a.username === currentUsername && (
                    <span className="ml-2 text-xs text-muted">(Anda)</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {roleLabel[a.role] ?? a.role}
                </p>
              </div>
            </div>
            {a.username !== currentUsername && (
              <button
                onClick={() => remove(a)}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
                aria-label="Hapus akun"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={create}
            className="my-8 w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <h2 className="font-display text-xl font-semibold text-foreground">
              Admin Baru
            </h2>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Nama pengguna
                </span>
                <input
                  required
                  minLength={3}
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">
                  Kata sandi
                </span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  className="input mt-1"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-foreground">Peran</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input mt-1 cursor-pointer"
                >
                  <option value="admin">Admin (kelola konten)</option>
                  <option value="superadmin">
                    Superadmin (akses penuh + dokumentasi)
                  </option>
                </select>
              </label>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-ghost"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary disabled:opacity-50"
              >
                {saving ? "Menyimpan…" : "Buat"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
