"use client";

import { useState } from "react";
import { userGw, ApiError } from "@/lib/api";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

// Lets a logged-in user set (or replace) their local password so they can log
// in with email + password — useful for accounts created via Google.
export default function SetPasswordForm() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (p1.length < 8) {
      setMsg({ ok: false, text: "Kata sandi minimal 8 karakter." });
      return;
    }
    if (p1 !== p2) {
      setMsg({ ok: false, text: "Konfirmasi kata sandi tidak cocok." });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await userGw("auth/users/me/password", {
        method: "PUT",
        body: JSON.stringify({ password: p1 }),
      });
      setMsg({
        ok: true,
        text: "Kata sandi tersimpan. Kini bisa login pakai email & kata sandi.",
      });
      setP1("");
      setP2("");
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof ApiError ? err.message : "Gagal menyimpan.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 max-w-md space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-foreground">Kata sandi baru</span>
        <div className="relative mt-1">
          <input
            type={show1 ? "text" : "password"}
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            autoComplete="new-password"
            className="input pr-11"
          />
          <button
            type="button"
            onClick={() => setShow1((v) => !v)}
            tabIndex={-1}
            aria-label={show1 ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground"
          >
            {show1 ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      </label>
      <label className="block">
        <span className="text-sm font-medium text-foreground">Ulangi kata sandi</span>
        <div className="relative mt-1">
          <input
            type={show2 ? "text" : "password"}
            value={p2}
            onChange={(e) => setP2(e.target.value)}
            autoComplete="new-password"
            className="input pr-11"
          />
          <button
            type="button"
            onClick={() => setShow2((v) => !v)}
            tabIndex={-1}
            aria-label={show2 ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted hover:text-foreground"
          >
            {show2 ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
      </label>
      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            msg.ok
              ? "bg-olive/10 text-olive"
              : "bg-danger/10 text-danger"
          }`}
        >
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
        {saving ? "Menyimpan…" : "Simpan kata sandi"}
      </button>
    </form>
  );
}
