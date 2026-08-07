// Client-side similarity scoring for the aksara writing-practice feature.
//
// The score is a pure comparison of two binary "ink" masks of equal size:
//   ref  — the reference glyph, filled.
//   user — what the learner traced.
// It is never sent anywhere or persisted; it exists only to give instant
// feedback while practising. See components/AksaraWriter.tsx for the callers.

/** A distance-tolerant comparison result. All ratios are 0..1. */
export interface ScoreResult {
  /** 0..100, rounded. Harmonic mean (F1) of precision and recall × 100. */
  score: number;
  /** Fraction of the learner's ink that lies on/near the reference. */
  precision: number;
  /** Fraction of the reference that the learner's ink covers. */
  recall: number;
  /** True when the learner drew too little to score meaningfully. */
  tooLittle: boolean;
}

/**
 * Two-pass Chamfer distance transform (3-4 weights): for every cell, the
 * approximate Euclidean distance to the nearest ink cell in `mask`. Ink cells
 * are 0. Good enough for a forgiving tolerance check and far cheaper than an
 * exact transform.
 */
function distanceTransform(mask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9;
  const D = new Float32Array(w * h);
  const D1 = 1;
  const D2 = Math.SQRT2;
  for (let i = 0; i < D.length; i++) D[i] = mask[i] ? 0 : INF;

  // Forward pass (top-left → bottom-right).
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (D[i] === 0) continue;
      let d = D[i];
      if (x > 0) d = Math.min(d, D[i - 1] + D1);
      if (y > 0) d = Math.min(d, D[i - w] + D1);
      if (x > 0 && y > 0) d = Math.min(d, D[i - w - 1] + D2);
      if (x < w - 1 && y > 0) d = Math.min(d, D[i - w + 1] + D2);
      D[i] = d;
    }
  }
  // Backward pass (bottom-right → top-left).
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (D[i] === 0) continue;
      let d = D[i];
      if (x < w - 1) d = Math.min(d, D[i + 1] + D1);
      if (y < h - 1) d = Math.min(d, D[i + w] + D1);
      if (x < w - 1 && y < h - 1) d = Math.min(d, D[i + w + 1] + D2);
      if (x > 0 && y < h - 1) d = Math.min(d, D[i + w - 1] + D2);
      D[i] = d;
    }
  }
  return D;
}

/**
 * Compare a learner's ink mask against a reference glyph mask.
 *
 * - precision: how much of what you drew sits on the glyph (punishes drawing
 *   outside the lines / scribbling).
 * - recall: how much of the glyph you actually covered (punishes missing
 *   parts).
 * - `tol` (pixels) makes both forgiving: ink "close enough" still counts, so a
 *   slightly wobbly trace is not harshly penalised.
 *
 * The final score is the F1 (harmonic mean), which stays low unless BOTH are
 * high — you must cover the glyph AND stay on it.
 */
export function compareMasks(
  ref: Uint8Array,
  user: Uint8Array,
  w: number,
  h: number,
  tol: number,
): ScoreResult {
  const distR = distanceTransform(ref, w, h);
  const distU = distanceTransform(user, w, h);

  let refCount = 0;
  let refCovered = 0;
  let userCount = 0;
  let userOn = 0;
  for (let i = 0; i < ref.length; i++) {
    if (ref[i]) {
      refCount++;
      if (distU[i] <= tol) refCovered++;
    }
    if (user[i]) {
      userCount++;
      if (distR[i] <= tol) userOn++;
    }
  }

  // Require at least a little ink relative to the glyph, otherwise a stray dot
  // could score via precision alone.
  const tooLittle = refCount === 0 || userCount < refCount * 0.03;
  if (tooLittle) {
    return { score: 0, precision: 0, recall: 0, tooLittle: true };
  }

  const precision = userOn / userCount;
  const recall = refCovered / refCount;
  const f1 =
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    score: Math.max(0, Math.min(100, Math.round(f1 * 100))),
    precision,
    recall,
    tooLittle: false,
  };
}

/** Short Indonesian feedback band for a score. */
export function feedbackFor(score: number): { label: string; tone: "good" | "ok" | "low" } {
  if (score >= 85) return { label: "Hébat! Tulisanmu sangat mirip.", tone: "good" };
  if (score >= 70) return { label: "Bagus! Sudah cukup mirip.", tone: "good" };
  if (score >= 50) return { label: "Lumayan — teruskan berlatih.", tone: "ok" };
  return { label: "Coba lagi, ikuti alur garisnya.", tone: "low" };
}
