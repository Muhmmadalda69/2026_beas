// Shared aksara rasterisation for quiz "write" questions. Both sides of the
// grading contract use this so they agree pixel-for-pixel:
//   - Admin authoring computes the reference mask from the target glyph.
//   - The player computes their ink mask from the drawing canvas.
// The backend (internal/quiz/score.go) compares the two. GRID and the fit
// convention MUST match the backend's `gradeGrid`.
import type { Font, PathCommand } from "opentype.js";

export const GRID = 64; // must equal backend gradeGrid
const INSET = 0.15; // glyph occupies the central (1 - 2*INSET) of the box
const FONT_URL = "/fonts/NotoSansSundanese-Regular.ttf";

let fontPromise: Promise<Font> | null = null;

/** Load & parse the aksara font once (client-only), cached across calls. */
export function loadAksaraFont(): Promise<Font> {
  if (!fontPromise) {
    fontPromise = (async () => {
      const opentype = await import("opentype.js");
      const res = await fetch(FONT_URL);
      if (!res.ok) throw new Error(`font ${res.status}`);
      return opentype.parse(await res.arrayBuffer());
    })().catch((e) => {
      fontPromise = null; // allow retry on failure
      throw e;
    });
  }
  return fontPromise;
}

interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Scale + translate glyph commands to fit centred in a size×size box. */
function fitCommands(cmds: PathCommand[], bb: BBox, size: number): PathCommand[] {
  const target = { x: size * INSET, y: size * INSET, w: size * (1 - 2 * INSET), h: size * (1 - 2 * INSET) };
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

/** Render a glyph filled into a GRID×GRID binary mask (the reference/answer). */
export function glyphMask(font: Font, char: string): Uint8Array {
  const path = font.getPath(char, 0, 0, GRID);
  const cmds = fitCommands(path.commands, path.getBoundingBox(), GRID);
  const canvas = document.createElement("canvas");
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fill(toPath2D(cmds));
  return alphaToMask(ctx.getImageData(0, 0, GRID, GRID).data);
}

/** Draw a glyph filled onto an arbitrary-size canvas (used for the faint guide). */
export function renderGlyphToCanvas(
  font: Font,
  char: string,
  canvas: HTMLCanvasElement,
  fillStyle: string,
): void {
  const size = canvas.width;
  const path = font.getPath(char, 0, 0, size);
  const cmds = fitCommands(path.commands, path.getBoundingBox(), size);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = fillStyle;
  ctx.fill(toPath2D(cmds));
}

/** Decode a base64 mask (from maskToBase64) back to a 0/1 GRID×GRID array. */
export function base64ToMask(b64: string): Uint8Array {
  const mask = new Uint8Array(GRID * GRID);
  try {
    const bin = atob(b64);
    for (let i = 0; i < mask.length && i < bin.length; i++) {
      mask[i] = bin.charCodeAt(i) ? 1 : 0;
    }
  } catch {
    /* malformed — return empty mask */
  }
  return mask;
}

/** Downsample a drawing canvas of any size to a GRID×GRID binary ink mask. */
export function canvasInkToMask(src: HTMLCanvasElement): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = GRID;
  canvas.height = GRID;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(src, 0, 0, GRID, GRID);
  return alphaToMask(ctx.getImageData(0, 0, GRID, GRID).data);
}

function alphaToMask(data: Uint8ClampedArray): Uint8Array {
  const mask = new Uint8Array(GRID * GRID);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > 20 ? 1 : 0;
  return mask;
}

/** Base64-encode a 0/1 mask as raw bytes (matches backend decodeMask). */
export function maskToBase64(mask: Uint8Array): string {
  let s = "";
  for (let i = 0; i < mask.length; i++) s += String.fromCharCode(mask[i]);
  return btoa(s);
}

/** True if the mask has enough ink to be worth submitting. */
export function maskHasInk(mask: Uint8Array): boolean {
  let n = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) n++;
  return n > 4;
}
