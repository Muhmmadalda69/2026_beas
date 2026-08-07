"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Font, PathCommand } from "opentype.js";
import type { ChartGroup, Glyph } from "@/lib/types";
import { compareMasks, feedbackFor, type ScoreResult } from "@/lib/aksaraScore";

// Fixed internal raster size (square). Drawing, the reference mask and scoring
// all happen in this coordinate space, independent of the on-screen size.
const CANVAS = 340;
const INSET = 0.15; // glyph fills the central (1 - 2*INSET) of the box
const BRUSH = 12; // user stroke width, in canvas px
const TOL = 14; // scoring tolerance, in canvas px
const FONT_URL = "/fonts/NotoSansSundanese-Regular.ttf";

const C_FAINT = "rgba(46, 37, 24, 0.13)"; // faint foreground (the glyph to trace)
const C_INK = "#9a4a2a"; // primary — the learner's ink

const target = {
  x: CANVAS * INSET,
  y: CANVAS * INSET,
  w: CANVAS * (1 - 2 * INSET),
  h: CANVAS * (1 - 2 * INSET),
};

/** Scale + translate a glyph's path commands to fit centred in the target box. */
function fitCommands(cmds: PathCommand[], bb: { x1: number; y1: number; x2: number; y2: number }): PathCommand[] {
  const bw = bb.x2 - bb.x1 || 1;
  const bh = bb.y2 - bb.y1 || 1;
  const scale = Math.min(target.w / bw, target.h / bh);
  const tx = target.x + (target.w - bw * scale) / 2 - bb.x1 * scale;
  const ty = target.y + (target.h - bh * scale) / 2 - bb.y1 * scale;
  const fx = (v: number) => v * scale + tx;
  const fy = (v: number) => v * scale + ty;
  return cmds.map((c) => {
    const out: PathCommand = { type: c.type };
    if (c.x !== undefined) {
      out.x = fx(c.x);
      out.y = fy(c.y as number);
    }
    if (c.x1 !== undefined) {
      out.x1 = fx(c.x1);
      out.y1 = fy(c.y1 as number);
    }
    if (c.x2 !== undefined) {
      out.x2 = fx(c.x2);
      out.y2 = fy(c.y2 as number);
    }
    return out;
  });
}

function toPath2D(cmds: PathCommand[]): Path2D {
  const p = new Path2D();
  for (const c of cmds) {
    switch (c.type) {
      case "M":
        p.moveTo(c.x!, c.y!);
        break;
      case "L":
        p.lineTo(c.x!, c.y!);
        break;
      case "C":
        p.bezierCurveTo(c.x1!, c.y1!, c.x2!, c.y2!, c.x!, c.y!);
        break;
      case "Q":
        p.quadraticCurveTo(c.x1!, c.y1!, c.x!, c.y!);
        break;
      case "Z":
        p.closePath();
        break;
    }
  }
  return p;
}

export default function AksaraWriter({ groups }: { groups: ChartGroup[] }) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const fontRef = useRef<Font | null>(null);
  const refMaskRef = useRef<Uint8Array | null>(null);
  const drawingRef = useRef(false);

  // Default to the first ngalagena consonant (a good starting glyph).
  const defaultGroup = groups.find((g) => g.key === "ngalagena") ?? groups[0];

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Glyph | null>(defaultGroup?.glyphs[0] ?? null);
  const [activeKey, setActiveKey] = useState<string>(defaultGroup?.key ?? "");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const activeGroup = useMemo(
    () => groups.find((g) => g.key === activeKey) ?? groups[0],
    [groups, activeKey],
  );

  // Load and parse the aksara font once (client-only).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opentype = await import("opentype.js");
        const res = await fetch(FONT_URL);
        if (!res.ok) throw new Error(`font ${res.status}`);
        const buf = await res.arrayBuffer();
        const font = opentype.parse(buf);
        if (cancelled) return;
        fontRef.current = font;
        setReady(true);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearInk = useCallback(() => {
    const ink = inkRef.current;
    if (ink) ink.getContext("2d")?.clearRect(0, 0, CANVAS, CANVAS);
    setHasInk(false);
    setResult(null);
  }, []);

  // (Re)render the reference glyph whenever the selection changes.
  useEffect(() => {
    const font = fontRef.current;
    const bg = bgRef.current;
    if (!ready || !font || !bg || !selected) return;

    clearInk();

    const path = font.getPath(selected.aksara, 0, 0, CANVAS);
    const cmds = fitCommands(path.commands, path.getBoundingBox());
    const path2d = toPath2D(cmds);

    // Faint glyph the learner traces over (visible background).
    const bctx = bg.getContext("2d");
    if (bctx) {
      bctx.clearRect(0, 0, CANVAS, CANVAS);
      bctx.fillStyle = C_FAINT;
      bctx.fill(path2d);
    }

    // Reference mask for scoring (offscreen, solid fill → alpha → binary).
    const off = document.createElement("canvas");
    off.width = CANVAS;
    off.height = CANVAS;
    const octx = off.getContext("2d");
    if (octx) {
      octx.fillStyle = "#000";
      octx.fill(path2d);
      const data = octx.getImageData(0, 0, CANVAS, CANVAS).data;
      const mask = new Uint8Array(CANVAS * CANVAS);
      for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 20 ? 1 : 0;
      refMaskRef.current = mask;
    }
  }, [ready, selected, clearInk]);

  const toCanvas = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = inkRef.current!;
    const r = c.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (CANVAS / r.width),
      y: (e.clientY - r.top) * (CANVAS / r.height),
    };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    const ink = inkRef.current!;
    const ctx = ink.getContext("2d")!;
    setResult(null);
    drawingRef.current = true;
    ink.setPointerCapture(e.pointerId);
    ctx.lineWidth = BRUSH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = C_INK;
    const { x, y } = toCanvas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // A dot so a tap leaves a mark.
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setHasInk(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctx = inkRef.current!.getContext("2d")!;
    const { x, y } = toCanvas(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endStroke = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      inkRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  };

  const onScore = () => {
    const ink = inkRef.current;
    const ref = refMaskRef.current;
    if (!ink || !ref) return;
    const data = ink.getContext("2d")!.getImageData(0, 0, CANVAS, CANVAS).data;
    const user = new Uint8Array(CANVAS * CANVAS);
    for (let i = 0; i < user.length; i++) user[i] = data[i * 4 + 3] > 20 ? 1 : 0;
    setResult(compareMasks(ref, user, CANVAS, CANVAS, TOL));
  };

  const feedback = result && !result.tooLittle ? feedbackFor(result.score) : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_minmax(320px,380px)]">
      {/* Glyph picker */}
      <div>
        <div className="flex flex-wrap gap-2">
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setActiveKey(g.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                g.key === activeKey
                  ? "border-primary bg-primary text-surface"
                  : "border-border bg-surface text-muted hover:border-primary-soft"
              }`}
            >
              {g.title.replace(/\s*\(.*\)\s*/, "")}
            </button>
          ))}
        </div>

        {activeGroup && (
          <>
            <p className="mt-4 text-sm text-muted">{activeGroup.description}</p>
            <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
              {activeGroup.glyphs.map((g, i) => {
                const isSel = selected?.aksara === g.aksara && selected?.latin === g.latin;
                return (
                  <button
                    key={`${activeGroup.key}-${i}`}
                    type="button"
                    onClick={() => setSelected(g)}
                    aria-pressed={isSel}
                    className={`flex flex-col items-center rounded-xl border p-2.5 transition ${
                      isSel
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border bg-surface hover:border-primary-soft"
                    }`}
                  >
                    <span className="aksara text-3xl leading-none text-foreground">{g.aksara}</span>
                    <span className="mt-1 text-xs font-semibold text-primary">{g.latin}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Drawing pad */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-gold">Latihan</p>
              <p className="font-display text-xl font-semibold text-foreground">
                Tulis “{selected?.latin ?? "…"}”
              </p>
            </div>
            {selected && (
              <span className="aksara text-4xl leading-none text-primary-soft">{selected.aksara}</span>
            )}
          </div>

          <div
            className="relative mx-auto mt-4 aspect-square w-full max-w-[360px] overflow-hidden rounded-xl border border-border bg-surface-2/40"
            style={{ touchAction: "none" }}
          >
            <canvas ref={bgRef} width={CANVAS} height={CANVAS} className="absolute inset-0 h-full w-full" />
            <canvas
              ref={inkRef}
              width={CANVAS}
              height={CANVAS}
              className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
              aria-label={`Area menggambar aksara ${selected?.latin ?? ""}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endStroke}
              onPointerCancel={endStroke}
              onPointerLeave={endStroke}
            />
            {!ready && !loadError && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                Menyiapkan…
              </div>
            )}
            {loadError && (
              <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-danger">
                Gagal memuat font aksara.
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={clearInk}
              disabled={!hasInk}
              className="btn-ghost text-sm disabled:opacity-50"
            >
              Hapus
            </button>
            <button
              type="button"
              onClick={onScore}
              disabled={!ready || !hasInk}
              className="btn-primary text-sm disabled:opacity-50"
            >
              Nilai
            </button>
          </div>

          {result && (
            <div className="mt-4 rounded-xl border border-border bg-surface-2/40 p-4 text-center">
              {result.tooLittle ? (
                <p className="text-sm text-muted">Gambar dulu aksaranya, lalu tekan “Nilai”.</p>
              ) : (
                <>
                  <div className="flex items-end justify-center gap-1">
                    <span
                      className={`font-display text-5xl font-bold ${
                        feedback?.tone === "good"
                          ? "text-olive"
                          : feedback?.tone === "ok"
                            ? "text-gold"
                            : "text-danger"
                      }`}
                    >
                      {result.score}
                    </span>
                    <span className="mb-1 text-lg text-muted">/ 100</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{feedback?.label}</p>
                  <div className="mt-3 flex justify-center gap-4 text-xs text-muted">
                    <span>Ketepatan garis: {Math.round(result.precision * 100)}%</span>
                    <span>Kelengkapan: {Math.round(result.recall * 100)}%</span>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted">
            Nilai hanya untuk evaluasi belajar dan tidak disimpan.
          </p>
        </div>
      </div>
    </div>
  );
}
