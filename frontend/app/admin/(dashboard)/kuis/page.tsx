"use client";

import { useCallback, useEffect, useState } from "react";
import { clientGw, ApiError } from "@/lib/api";
import type { Level, LevelInput, Question, QuestionInput } from "@/lib/types";
import { PlusIcon, EditIcon, TrashIcon } from "@/components/icons";
import { Skeleton } from "@/components/Skeleton";
import { loadAksaraFont, glyphMask, maskToBase64 } from "@/lib/aksaraRaster";

const emptyLevel: LevelInput = {
  number: 1,
  title: "",
  description: "",
  difficulty: "Pemula",
  pass_score: 60,
  draw_count: 5,
};

const emptyQuestion: QuestionInput = {
  type: "choice",
  prompt: "",
  prompt_aksara: "",
  options: ["", ""],
  correct_index: 0,
  explanation: "",
  points: 10,
  show_guide: true,
  ref_mask: "",
};

export default function AdminKuisPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [levelsLoaded, setLevelsLoaded] = useState(false);
  const [selected, setSelected] = useState<Level | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [error, setError] = useState("");

  // Level modal
  const [levelForm, setLevelForm] = useState<LevelInput | null>(null);
  const [levelEditId, setLevelEditId] = useState<string | null>(null);

  // Question modal
  const [qForm, setQForm] = useState<QuestionInput | null>(null);
  const [qEditId, setQEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadLevels = useCallback(async () => {
    try {
      const data = await clientGw<Level[]>("quiz/levels");
      setLevels(data);
      return data;
    } catch {
      setError("Gagal memuat level.");
      return [];
    } finally {
      setLevelsLoaded(true);
    }
  }, []);

  const loadQuestions = useCallback(async (levelId: string) => {
    setQuestionsLoading(true);
    try {
      setQuestions(await clientGw<Question[]>(`quiz/levels/${levelId}/questions`));
    } catch {
      setError("Gagal memuat soal.");
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLevels();
  }, [loadLevels]);

  // Auto-select the first level so the question manager is immediately visible.
  useEffect(() => {
    if (!selected && levels.length > 0) {
      setSelected(levels[0]);
      loadQuestions(levels[0].id);
    }
  }, [levels, selected, loadQuestions]);

  const selectLevel = async (l: Level) => {
    setSelected(l);
    setError("");
    await loadQuestions(l.id);
  };

  // ----- Level CRUD -----
  const saveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!levelForm) return;
    setSaving(true);
    setError("");
    try {
      if (levelEditId) {
        await clientGw(`quiz/levels/${levelEditId}`, {
          method: "PUT",
          body: JSON.stringify(levelForm),
        });
      } else {
        await clientGw("quiz/levels", {
          method: "POST",
          body: JSON.stringify(levelForm),
        });
      }
      setLevelForm(null);
      await loadLevels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan level.");
    } finally {
      setSaving(false);
    }
  };

  const removeLevel = async (l: Level) => {
    if (!confirm(`Hapus level "${l.title}" beserta semua soalnya?`)) return;
    try {
      await clientGw(`quiz/levels/${l.id}`, { method: "DELETE" });
      if (selected?.id === l.id) {
        setSelected(null);
        setQuestions([]);
      }
      await loadLevels();
    } catch {
      setError("Gagal menghapus level.");
    }
  };

  // ----- Question CRUD -----
  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qForm || !selected) return;
    setSaving(true);
    setError("");
    try {
      const payload: QuestionInput = { ...qForm };
      if (payload.type === "write") {
        // Compute the reference mask (answer key) from the target glyph so the
        // backend can grade drawings server-side. Same rasteriser the player uses.
        const target = payload.prompt_aksara.trim();
        if (!target) {
          setError("Isi dulu aksara target untuk soal menulis.");
          setSaving(false);
          return;
        }
        const font = await loadAksaraFont();
        payload.ref_mask = maskToBase64(glyphMask(font, target));
        payload.options = [];
        payload.correct_index = 0;
      }
      if (qEditId) {
        await clientGw(`quiz/questions/${qEditId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await clientGw(`quiz/levels/${selected.id}/questions`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setQForm(null);
      await Promise.all([loadQuestions(selected.id), loadLevels()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal menyimpan soal.");
    } finally {
      setSaving(false);
    }
  };

  const removeQuestion = async (q: Question) => {
    if (!confirm("Hapus soal ini?")) return;
    try {
      await clientGw(`quiz/questions/${q.id}`, { method: "DELETE" });
      if (selected) await Promise.all([loadQuestions(selected.id), loadLevels()]);
    } catch {
      setError("Gagal menghapus soal.");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Kuis & Soal
          </h1>
          <p className="mt-1 text-sm text-muted">
            Pilih level di kiri, lalu tambah/sunting soal &amp; jawaban di kanan.
            Tandai jawaban benar dengan tombol radio.
          </p>
        </div>
        <button
          onClick={() => {
            setLevelForm({ ...emptyLevel, number: levels.length + 1 });
            setLevelEditId(null);
          }}
          className="btn-primary"
        >
          <PlusIcon className="h-4 w-4" /> Level Baru
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[300px_1fr]">
        {/* Levels list */}
        <div className="space-y-3">
          {!levelsLoaded &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                role="status"
                aria-busy="true"
                className="rounded-xl border border-border bg-surface p-4"
              >
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-2 h-4 w-40 max-w-full" />
                <Skeleton className="mt-2 h-3 w-32" />
              </div>
            ))}
          {levels.map((l) => (
            <div
              key={l.id}
              className={`rounded-xl border p-4 transition-colors ${
                selected?.id === l.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-surface"
              }`}
            >
              <button
                onClick={() => selectLevel(l)}
                className="w-full text-left cursor-pointer"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-gold">
                  Level {l.number} · {l.difficulty}
                </span>
                <p className="font-medium text-foreground">{l.title}</p>
                <p className="text-xs text-muted">
                  {l.question_total} soal · lulus {l.pass_score}%
                </p>
              </button>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    setLevelForm({
                      number: l.number,
                      title: l.title,
                      description: l.description,
                      difficulty: l.difficulty,
                      pass_score: l.pass_score,
                      draw_count: l.draw_count,
                    });
                    setLevelEditId(l.id);
                  }}
                  className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-primary cursor-pointer"
                  aria-label="Sunting level"
                >
                  <EditIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => removeLevel(l)}
                  className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger cursor-pointer"
                  aria-label="Hapus level"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Questions panel */}
        <div>
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
              Pilih level untuk mengelola soalnya.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Soal — {selected.title}
                </h2>
                <button
                  onClick={() => {
                    setQForm({ ...emptyQuestion, options: ["", ""] });
                    setQEditId(null);
                  }}
                  className="btn-ghost"
                >
                  <PlusIcon className="h-4 w-4" /> Soal
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {questionsLoading &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      role="status"
                      aria-busy="true"
                      className="rounded-xl border border-border bg-surface p-4"
                    >
                      <Skeleton className="h-4 w-3/4" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Skeleton className="h-7 w-16 rounded-lg" />
                        <Skeleton className="h-7 w-16 rounded-lg" />
                        <Skeleton className="h-7 w-16 rounded-lg" />
                      </div>
                    </div>
                  ))}
                {!questionsLoading && questions.length === 0 && (
                  <p className="text-sm text-muted">Belum ada soal.</p>
                )}
                {!questionsLoading &&
                  questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-border bg-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-foreground">
                        {idx + 1}. {q.prompt}
                      </p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => {
                            setQForm({
                              type:
                                q.type === "write"
                                  ? "write"
                                  : q.type === "text"
                                    ? "text"
                                    : "choice",
                              prompt: q.prompt,
                              prompt_aksara: q.prompt_aksara,
                              options: q.options.length ? [...q.options] : ["", ""],
                              correct_index: q.correct_index,
                              explanation: q.explanation,
                              points: q.points,
                              show_guide: q.show_guide ?? true,
                              ref_mask: q.ref_mask ?? "",
                            });
                            setQEditId(q.id);
                          }}
                          className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-primary cursor-pointer"
                          aria-label="Sunting soal"
                        >
                          <EditIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeQuestion(q)}
                          className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger cursor-pointer"
                          aria-label="Hapus soal"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {q.type === "write" ? (
                        <>
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            Menulis · {q.show_guide ? "jiplak" : "dari ingatan"}
                          </span>
                          <span className="aksara text-2xl text-foreground">
                            {q.prompt_aksara}
                          </span>
                        </>
                      ) : q.type === "text" ? (
                        <>
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            Isian
                          </span>
                          {q.options.map((o, i) => (
                            <span
                              key={i}
                              className="aksara rounded-lg bg-surface-2 px-2.5 py-1 text-lg text-muted"
                            >
                              {o}
                            </span>
                          ))}
                        </>
                      ) : (
                        q.options.map((o, i) => (
                          <span
                            key={i}
                            className={`aksara rounded-lg px-2.5 py-1 text-lg ${
                              i === q.correct_index
                                ? "bg-olive/15 text-olive"
                                : "bg-surface-2 text-muted"
                            }`}
                          >
                            {o}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Level modal */}
      {levelForm && (
        <Modal title={levelEditId ? "Sunting Level" : "Level Baru"} onClose={() => setLevelForm(null)}>
          <form onSubmit={saveLevel} className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Labeled label="Nomor">
                <input
                  type="number"
                  min={1}
                  required
                  value={levelForm.number}
                  onChange={(e) =>
                    setLevelForm({ ...levelForm, number: Number(e.target.value) })
                  }
                  className="input"
                />
              </Labeled>
              <Labeled label="Tingkat kesulitan">
                <input
                  value={levelForm.difficulty}
                  onChange={(e) =>
                    setLevelForm({ ...levelForm, difficulty: e.target.value })
                  }
                  className="input"
                />
              </Labeled>
            </div>
            <Labeled label="Judul">
              <input
                required
                value={levelForm.title}
                onChange={(e) =>
                  setLevelForm({ ...levelForm, title: e.target.value })
                }
                className="input"
              />
            </Labeled>
            <Labeled label="Deskripsi">
              <textarea
                rows={2}
                value={levelForm.description}
                onChange={(e) =>
                  setLevelForm({ ...levelForm, description: e.target.value })
                }
                className="input resize-none"
              />
            </Labeled>
            <div className="grid grid-cols-2 gap-4">
              <Labeled label="Nilai lulus (%)">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={levelForm.pass_score}
                  onChange={(e) =>
                    setLevelForm({
                      ...levelForm,
                      pass_score: Number(e.target.value),
                    })
                  }
                  className="input"
                />
              </Labeled>
              <Labeled label="Soal per main">
                <input
                  type="number"
                  min={0}
                  value={levelForm.draw_count}
                  onChange={(e) =>
                    setLevelForm({
                      ...levelForm,
                      draw_count: Number(e.target.value),
                    })
                  }
                  className="input"
                />
              </Labeled>
            </div>
            <ModalActions saving={saving} onCancel={() => setLevelForm(null)} />
          </form>
        </Modal>
      )}

      {/* Question modal */}
      {qForm && (
        <Modal title={qEditId ? "Sunting Soal" : "Soal Baru"} onClose={() => setQForm(null)}>
          <form onSubmit={saveQuestion} className="grid gap-4">
            <Labeled label="Tipe soal">
              <select
                value={qForm.type}
                onChange={(e) => {
                  const v = e.target.value;
                  const nonEmpty = qForm.options.filter((o) => o.trim() !== "");
                  // Isian butuh 1 kolom jawaban; pilihan ganda minimal 2.
                  const options =
                    v === "text"
                      ? nonEmpty.length
                        ? nonEmpty
                        : [""]
                      : v === "choice"
                        ? qForm.options.length >= 2
                          ? qForm.options
                          : [...qForm.options, "", ""].slice(0, 2)
                        : qForm.options;
                  setQForm({
                    ...qForm,
                    type: v === "write" ? "write" : v === "text" ? "text" : "choice",
                    options,
                    correct_index: 0,
                  });
                }}
                className="input"
              >
                <option value="choice">Pilihan ganda</option>
                <option value="text">Isian — pemain mengetik jawaban</option>
                <option value="write">Menulis aksara (gambar)</option>
              </select>
            </Labeled>
            <Labeled label={qForm.type === "write" ? "Instruksi" : "Pertanyaan"}>
              <textarea
                required
                rows={2}
                value={qForm.prompt}
                onChange={(e) => setQForm({ ...qForm, prompt: e.target.value })}
                placeholder={
                  qForm.type === "write" ? "mis. Tulis aksara ngalagena “ka”." : undefined
                }
                className="input resize-none"
              />
            </Labeled>

            {qForm.type === "write" ? (
              <>
                <Labeled label="Aksara target (yang harus ditulis)">
                  <div className="flex items-center gap-3">
                    <input
                      required
                      value={qForm.prompt_aksara}
                      onChange={(e) =>
                        setQForm({ ...qForm, prompt_aksara: e.target.value })
                      }
                      placeholder="mis. ᮊ"
                      className="input aksara text-2xl"
                    />
                    {qForm.prompt_aksara.trim() && (
                      <span className="aksara shrink-0 rounded-lg border border-border bg-surface-2/50 px-3 py-1 text-3xl text-primary-soft">
                        {qForm.prompt_aksara.trim()}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Pemain menggambar aksara ini; kemiripannya dinilai 0–100 di
                    server (poin proporsional).
                  </p>
                </Labeled>
                <Labeled label="Mode menulis">
                  <select
                    value={qForm.show_guide ? "guide" : "memory"}
                    onChange={(e) =>
                      setQForm({ ...qForm, show_guide: e.target.value === "guide" })
                    }
                    className="input"
                  >
                    <option value="guide">Jiplak — tampilkan glyph redup</option>
                    <option value="memory">Dari ingatan — tanpa contoh</option>
                  </select>
                </Labeled>
              </>
            ) : (
              <>
                <Labeled label="Aksara pada soal (opsional)">
                  <input
                    value={qForm.prompt_aksara}
                    onChange={(e) =>
                      setQForm({ ...qForm, prompt_aksara: e.target.value })
                    }
                    className="input aksara text-xl"
                  />
                </Labeled>

                <div>
                  <span className="text-sm font-medium text-foreground">
                    {qForm.type === "choice"
                      ? "Pilihan jawaban (tandai yang benar)"
                      : "Jawaban yang diterima (salah satu benar)"}
                  </span>
                  <div className="mt-2 space-y-2">
                    {qForm.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {qForm.type === "choice" && (
                          <input
                            type="radio"
                            name="correct"
                            checked={qForm.correct_index === i}
                            onChange={() => setQForm({ ...qForm, correct_index: i })}
                            className="h-4 w-4 accent-[var(--color-primary)] cursor-pointer"
                            aria-label={`Tandai pilihan ${i + 1} benar`}
                          />
                        )}
                        <input
                          value={opt}
                          onChange={(e) => {
                            const options = [...qForm.options];
                            options[i] = e.target.value;
                            setQForm({ ...qForm, options });
                          }}
                          placeholder={
                            qForm.type === "choice"
                              ? `Pilihan ${i + 1}`
                              : `Jawaban ${i + 1}`
                          }
                          className="input aksara text-lg"
                        />
                        {qForm.options.length > (qForm.type === "choice" ? 2 : 1) && (
                          <button
                            type="button"
                            onClick={() => {
                              const options = qForm.options.filter((_, j) => j !== i);
                              setQForm({
                                ...qForm,
                                options,
                                correct_index:
                                  qForm.correct_index >= options.length
                                    ? 0
                                    : qForm.correct_index,
                              });
                            }}
                            className="rounded-lg p-1.5 text-muted hover:text-danger cursor-pointer"
                            aria-label="Hapus"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {qForm.options.length < 6 && (
                    <button
                      type="button"
                      onClick={() =>
                        setQForm({ ...qForm, options: [...qForm.options, ""] })
                      }
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary cursor-pointer"
                    >
                      <PlusIcon className="h-4 w-4" />{" "}
                      {qForm.type === "choice" ? "Tambah pilihan" : "Tambah jawaban"}
                    </button>
                  )}
                  {qForm.type === "text" && (
                    <p className="mt-2 text-xs text-muted">
                      Jawaban pemain dicocokkan tanpa membedakan huruf besar/kecil
                      dan spasi di ujung. Tambahkan variasi ejaan bila perlu.
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Labeled label="Poin">
                <input
                  type="number"
                  min={1}
                  value={qForm.points}
                  onChange={(e) =>
                    setQForm({ ...qForm, points: Number(e.target.value) })
                  }
                  className="input"
                />
              </Labeled>
            </div>
            <Labeled label="Pembahasan (opsional)">
              <textarea
                rows={2}
                value={qForm.explanation}
                onChange={(e) =>
                  setQForm({ ...qForm, explanation: e.target.value })
                }
                className="input resize-none"
              />
            </Labeled>
            <ModalActions saving={saving} onCancel={() => setQForm(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <h2 className="mb-5 font-display text-xl font-semibold text-foreground">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  saving,
  onCancel,
}: {
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={onCancel} className="btn-ghost">
        Batal
      </button>
      <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
        {saving ? "Menyimpan…" : "Simpan"}
      </button>
    </div>
  );
}

function Labeled({
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
