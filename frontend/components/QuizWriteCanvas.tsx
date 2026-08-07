"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  GRID,
  loadAksaraFont,
  renderGlyphToCanvas,
  canvasInkToMask,
  maskToBase64,
  maskHasInk,
  base64ToMask,
} from "@/lib/aksaraRaster";

// A compact drawing pad for "write" quiz questions. Emits the player's ink as a
// base64 mask (or null when cleared/empty); the backend grades it server-side.
const CANVAS = 340;
const BRUSH = 12;
const C_INK = "#9a4a2a"; // primary
const C_FAINT = "rgba(46, 37, 24, 0.13)";

export default function QuizWriteCanvas({
  promptAksara,
  showGuide,
  initial,
  onChange,
}: {
  promptAksara: string;
  showGuide: boolean;
  initial?: string;
  onChange: (mask: string | null) => void;
}) {
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  // Faint glyph to trace over (only in guided/trace mode).
  useEffect(() => {
    const bg = bgRef.current;
    if (!bg) return;
    bg.getContext("2d")?.clearRect(0, 0, CANVAS, CANVAS);
    if (!showGuide || !promptAksara) return;
    let cancelled = false;
    loadAksaraFont()
      .then((font) => {
        if (!cancelled && bgRef.current) {
          renderGlyphToCanvas(font, promptAksara, bgRef.current, C_FAINT);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showGuide, promptAksara]);

  // Repaint a previously-submitted drawing when returning to this question.
  useEffect(() => {
    const ink = inkRef.current;
    if (!ink || !initial) return;
    const ctx = ink.getContext("2d")!;
    const mask = base64ToMask(initial);
    const cell = CANVAS / GRID;
    ctx.fillStyle = C_INK;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (mask[y * GRID + x]) ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    setHasInk(true);
    // Only on mount for this question instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = inkRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (CANVAS / r.width),
      y: (e.clientY - r.top) * (CANVAS / r.height),
    };
  };

  const emit = () => {
    const mask = canvasInkToMask(inkRef.current!);
    onChange(maskHasInk(mask) ? maskToBase64(mask) : null);
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = inkRef.current!.getContext("2d")!;
    drawing.current = true;
    inkRef.current!.setPointerCapture(e.pointerId);
    ctx.lineWidth = BRUSH;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = C_INK;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.01, y + 0.01);
    ctx.stroke();
    setHasInk(true);
  };

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = inkRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const up = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    drawing.current = false;
    try {
      inkRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    emit();
  };

  const clear = () => {
    inkRef.current?.getContext("2d")?.clearRect(0, 0, CANVAS, CANVAS);
    setHasInk(false);
    onChange(null);
  };

  return (
    <div>
      <div
        className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-xl border border-border bg-surface-2/40"
        style={{ touchAction: "none" }}
      >
        <canvas ref={bgRef} width={CANVAS} height={CANVAS} className="absolute inset-0 h-full w-full" />
        <canvas
          ref={inkRef}
          width={CANVAS}
          height={CANVAS}
          className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
          aria-label="Area menulis aksara"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={up}
        />
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted">
        <span>{showGuide ? "Jiplak glyph redup di atas." : "Tulis dari ingatan."}</span>
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk}
          className="btn-ghost text-sm disabled:opacity-50"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}
