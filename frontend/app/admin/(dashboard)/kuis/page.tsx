"use client";

import { useCallback, useEffect, useState } from "react";
import { clientGw, ApiError } from "@/lib/api";
import type { Level, LevelInput, Question, QuestionInput } from "@/lib/types";
import { PlusIcon, EditIcon, TrashIcon } from "@/components/icons";

const emptyLevel: LevelInput = {
  number: 1,
  title: "",
  description: "",
  difficulty: "Pemula",
  pass_score: 60,
  draw_count: 5,
};

const emptyQuestion: QuestionInput = {
  prompt: "",
  prompt_aksara: "",
  options: ["", ""],
  correct_index: 0,
  explanation: "",
  points: 10,
};

export default function AdminKuisPage() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [selected, setSelected] = useState<Level | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
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
    }
  }, []);

  const loadQuestions = useCallback(async (levelId: string) => {
    try {
      setQuestions(await clientGw<Question[]>(`quiz/levels/${levelId}/questions`));
    } catch {
      setError("Gagal memuat soal.");
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
      if (qEditId) {
        await clientGw(`quiz/questions/${qEditId}`, {
          method: "PUT",
          body: JSON.stringify(qForm),
        });
      } else {
        await clientGw(`quiz/levels/${selected.id}/questions`, {
          method: "POST",
          body: JSON.stringify(qForm),
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
                {questions.length === 0 && (
                  <p className="text-sm text-muted">Belum ada soal.</p>
                )}
                {questions.map((q, idx) => (
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
                              prompt: q.prompt,
                              prompt_aksara: q.prompt_aksara,
                              options: [...q.options],
                              correct_index: q.correct_index,
                              explanation: q.explanation,
                              points: q.points,
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
                    <div className="mt-2 flex flex-wrap gap-2">
                      {q.options.map((o, i) => (
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
                      ))}
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
            <Labeled label="Pertanyaan">
              <textarea
                required
                rows={2}
                value={qForm.prompt}
                onChange={(e) => setQForm({ ...qForm, prompt: e.target.value })}
                className="input resize-none"
              />
            </Labeled>
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
                Pilihan jawaban (tandai yang benar)
              </span>
              <div className="mt-2 space-y-2">
                {qForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={qForm.correct_index === i}
                      onChange={() => setQForm({ ...qForm, correct_index: i })}
                      className="h-4 w-4 accent-[var(--color-primary)] cursor-pointer"
                      aria-label={`Tandai pilihan ${i + 1} benar`}
                    />
                    <input
                      value={opt}
                      onChange={(e) => {
                        const options = [...qForm.options];
                        options[i] = e.target.value;
                        setQForm({ ...qForm, options });
                      }}
                      placeholder={`Pilihan ${i + 1}`}
                      className="input aksara text-lg"
                    />
                    {qForm.options.length > 2 && (
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
                        aria-label="Hapus pilihan"
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
                  <PlusIcon className="h-4 w-4" /> Tambah pilihan
                </button>
              )}
            </div>

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
