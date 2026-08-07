import 'dart:math' as math;
import 'dart:typed_data';

/// On-device similarity scoring for the standalone writing-practice screen.
/// Mirrors the web scorer (frontend/lib/aksaraScore.ts) and the backend
/// (backend/internal/quiz/score.go): a distance-tolerant precision/recall
/// combined via F1. The score is only for feedback and is never persisted.

class ScoreResult {
  final int score; // 0..100
  final double precision;
  final double recall;
  final bool tooLittle;
  const ScoreResult(this.score, this.precision, this.recall, this.tooLittle);
}

Float64List _distanceTransform(Uint8List mask, int w, int h) {
  const inf = 1e9;
  final d = Float64List(w * h);
  for (var i = 0; i < d.length; i++) {
    d[i] = mask[i] != 0 ? 0 : inf;
  }
  const d1 = 1.0;
  const d2 = math.sqrt2;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      final i = y * w + x;
      if (d[i] == 0) continue;
      if (x > 0) d[i] = math.min(d[i], d[i - 1] + d1);
      if (y > 0) d[i] = math.min(d[i], d[i - w] + d1);
      if (x > 0 && y > 0) d[i] = math.min(d[i], d[i - w - 1] + d2);
      if (x < w - 1 && y > 0) d[i] = math.min(d[i], d[i - w + 1] + d2);
    }
  }
  for (var y = h - 1; y >= 0; y--) {
    for (var x = w - 1; x >= 0; x--) {
      final i = y * w + x;
      if (d[i] == 0) continue;
      if (x < w - 1) d[i] = math.min(d[i], d[i + 1] + d1);
      if (y < h - 1) d[i] = math.min(d[i], d[i + w] + d1);
      if (x < w - 1 && y < h - 1) d[i] = math.min(d[i], d[i + w + 1] + d2);
      if (x > 0 && y < h - 1) d[i] = math.min(d[i], d[i + w - 1] + d2);
    }
  }
  return d;
}

/// Compare a reference glyph mask against the learner's ink mask (both 0/1,
/// w*h). `tol` (cells) makes both precision and recall forgiving.
ScoreResult compareMasks(
  Uint8List ref,
  Uint8List user, {
  int w = 64,
  int h = 64,
  double tol = 3,
}) {
  final distR = _distanceTransform(ref, w, h);
  final distU = _distanceTransform(user, w, h);
  var refCount = 0, refCovered = 0, userCount = 0, userOn = 0;
  for (var i = 0; i < ref.length; i++) {
    if (ref[i] != 0) {
      refCount++;
      if (distU[i] <= tol) refCovered++;
    }
    if (user[i] != 0) {
      userCount++;
      if (distR[i] <= tol) userOn++;
    }
  }
  if (refCount == 0 || userCount < refCount * 0.03) {
    return const ScoreResult(0, 0, 0, true);
  }
  final precision = userOn / userCount;
  final recall = refCovered / refCount;
  final f1 =
      (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0.0;
  final score = (f1 * 100).round().clamp(0, 100);
  return ScoreResult(score, precision, recall, false);
}

String feedbackFor(int score) {
  if (score >= 85) return 'Hébat! Tulisanmu sangat mirip.';
  if (score >= 70) return 'Bagus! Sudah cukup mirip.';
  if (score >= 50) return 'Lumayan — teruskan berlatih.';
  return 'Coba lagi, ikuti alur garisnya.';
}
