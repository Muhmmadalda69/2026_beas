"use client";

import { useEffect, useState, useCallback } from "react";
import { clientGw, ApiError } from "@/lib/api";
import { renderMarkdown } from "@/lib/markdown";
import type { Article, ArticleInput } from "@/lib/types";
import { PlusIcon, EditIcon, TrashIcon, LanguagesIcon } from "@/components/icons";
import RichTextEditor from "@/components/RichTextEditor";

const empty: ArticleInput = {
  title: "",
  title_aksara: "",
  category: "",
  summary: "",
  content: "",
};

export default function AdminWikiPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleInput>(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setArticles(await clientGw<Article[]>("wiki/articles"));
    } catch {
      setError("Gagal memuat artikel.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setForm(empty);
    setEditingId(null);
    setShowForm(true);
    setError("");
  };

  const openEdit = (a: Article) => {
    // Older articles may be stored as Markdown; convert to HTML so the WYSIWYG
    // editor shows them formatted. HTML content is used as-is.
    const content = a.content.trimStart().startsWith("<")
      ? a.content
      : renderMarkdown(a.content);
    setForm({
      title: a.title,
      title_aksara: a.title_aksara,
      category: a.category,
      summary: a.summary,
      content,
    });
    setEditingId(a.id);
    setShowForm(true);
    setError("");
  };

  const autoAksara = async () => {
    if (!form.title.trim()) return;
    try {
      const res = await clientGw<{ aksara: string }>("translit/transliterate", {
        method: "POST",
        body: JSON.stringify({ text: form.title }),
      });
      setForm((f) => ({ ...f, title_aksara: res.aksara }));
    } catch {
      /* ignore */
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await clientGw(`wiki/articles/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await clientGw("wiki/articles", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: Article) => {
    if (!confirm(`Hapus artikel "${a.title}"?`)) return;
    try {
      await clientGw(`wiki/articles/${a.id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Gagal menghapus artikel.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Ensiklopedia
          </h1>
          <p className="mt-1 text-muted">{articles.length} artikel</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <PlusIcon className="h-4 w-4" /> Artikel Baru
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {articles.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
          >
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                {a.category}
              </span>
              <p className="truncate font-medium text-foreground">{a.title}</p>
              <p className="aksara truncate text-lg text-primary-soft">
                {a.title_aksara}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => openEdit(a)}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-primary cursor-pointer"
                aria-label="Sunting"
              >
                <EditIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => remove(a)}
                className="rounded-lg p-2 text-muted transition-colors hover:bg-danger/10 hover:text-danger cursor-pointer"
                aria-label="Hapus"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={save}
            className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl"
          >
            <h2 className="font-display text-xl font-semibold text-foreground">
              {editingId ? "Sunting Artikel" : "Artikel Baru"}
            </h2>

            <div className="mt-5 grid gap-4">
              <Field label="Judul">
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input"
                />
              </Field>

              <Field label="Judul (Aksara Sunda)">
                <div className="flex gap-2">
                  <input
                    value={form.title_aksara}
                    onChange={(e) =>
                      setForm({ ...form, title_aksara: e.target.value })
                    }
                    className="input aksara text-xl"
                  />
                  <button
                    type="button"
                    onClick={autoAksara}
                    className="btn-ghost shrink-0"
                    title="Transliterasi otomatis dari judul"
                  >
                    <LanguagesIcon className="h-4 w-4" /> Auto
                  </button>
                </div>
              </Field>

              <Field label="Kategori">
                <input
                  required
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  placeholder="mis. Sejarah, Dasar"
                  className="input"
                />
              </Field>

              <Field label="Ringkasan">
                <textarea
                  rows={2}
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  className="input resize-none"
                />
              </Field>

              <Field label="Konten">
                <RichTextEditor
                  key={editingId ?? "new"}
                  value={form.content}
                  onChange={(html) => setForm({ ...form, content: html })}
                />
              </Field>
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
              <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                {saving ? "Menyimpan…" : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
