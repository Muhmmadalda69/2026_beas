import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import '../theme.dart';

/// A drawing pad for "write" quiz questions. The learner traces/writes an
/// aksara; on each stroke it emits the ink as a base64 GRID×GRID binary mask,
/// which the backend grades against the stored reference (see
/// backend/internal/quiz/score.go). GRID and the fit convention match the web
/// authoring side (lib/aksaraRaster.ts) so scores agree across platforms.
const int _grid = 64; // must equal backend gradeGrid
const double _pad = 300; // logical draw area (square)
const double _inset = 0.15; // glyph fills the central (1 - 2*inset)
const double _brush = 11; // stroke width in pad units

class AksaraPad extends StatefulWidget {
  final String char; // target glyph (empty in from-memory mode)
  final bool showGuide; // trace over a faint glyph
  final ValueChanged<String?> onChanged; // base64 mask, or null when empty
  // Fires true while a finger is on the pad and false when lifted, so the host
  // can lock its scroll view during a stroke (otherwise the drag scrolls).
  final ValueChanged<bool>? onInteracting;
  const AksaraPad({
    super.key,
    required this.char,
    required this.showGuide,
    required this.onChanged,
    this.onInteracting,
  });

  @override
  State<AksaraPad> createState() => _AksaraPadState();
}

class _Repaint extends ChangeNotifier {
  void poke() => notifyListeners();
}

class _AksaraPadState extends State<AksaraPad> {
  final List<List<Offset>> _strokes = [];
  final _Repaint _repaint = _Repaint();
  _GlyphFit? _fit; // measured guide geometry (trace mode)

  @override
  void initState() {
    super.initState();
    _measureGuide();
  }

  @override
  void didUpdateWidget(covariant AksaraPad old) {
    super.didUpdateWidget(old);
    if (old.char != widget.char || old.showGuide != widget.showGuide) {
      _strokes.clear();
      _fit?.image.dispose();
      _fit = null;
      widget.onChanged(null);
      _measureGuide();
    }
  }

  @override
  void dispose() {
    _fit?.image.dispose();
    _repaint.dispose();
    super.dispose();
  }

  Future<void> _measureGuide() async {
    if (!widget.showGuide || widget.char.isEmpty) return;
    final fit = await _measureGlyph(widget.char);
    if (mounted) setState(() => _fit = fit);
  }

  Future<void> _emit() async {
    final mask = await _strokesToMaskB64(_strokes);
    widget.onChanged(mask);
  }

  void _clear() {
    setState(_strokes.clear);
    widget.onChanged(null);
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Center(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Container(
              width: _pad,
              height: _pad,
              color: AppColors.surface2.withValues(alpha: 0.4),
              child: Listener(
                behavior: HitTestBehavior.opaque,
                onPointerDown: (_) => widget.onInteracting?.call(true),
                onPointerUp: (_) => widget.onInteracting?.call(false),
                onPointerCancel: (_) => widget.onInteracting?.call(false),
                child: GestureDetector(
                // Start a stroke: rebuild once (updates the Hapus button state).
                onPanStart: (d) {
                  _strokes.add([d.localPosition]);
                  setState(() {});
                },
                // Add points via the repaint notifier only — no widget rebuild,
                // so drawing stays smooth even with many points.
                onPanUpdate: (d) {
                  if (_strokes.isNotEmpty) {
                    _strokes.last.add(d.localPosition);
                    _repaint.poke();
                  }
                },
                onPanEnd: (_) {
                  _repaint.poke();
                  _emit();
                },
                child: RepaintBoundary(
                  child: CustomPaint(
                    painter: _PadPainter(
                        strokes: _strokes, fit: _fit, repaint: _repaint),
                    size: const Size(_pad, _pad),
                  ),
                ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              widget.showGuide ? 'Jiplak glyph redup.' : 'Tulis dari ingatan.',
              style: const TextStyle(fontSize: 13, color: AppColors.muted),
            ),
            const SizedBox(width: 12),
            OutlinedButton(
              onPressed: _strokes.isEmpty ? null : _clear,
              child: const Text('Hapus'),
            ),
          ],
        ),
      ],
    );
  }
}

class _GlyphFit {
  final ui.Image image; // glyph rasterised tightly (ink-cropped)
  final double aspect; // width / height of the ink
  _GlyphFit(this.image, this.aspect);
}

class _PadPainter extends CustomPainter {
  final List<List<Offset>> strokes;
  final _GlyphFit? fit;
  _PadPainter({required this.strokes, required this.fit, Listenable? repaint})
      : super(repaint: repaint);

  @override
  void paint(Canvas canvas, Size size) {
    // Faint guide glyph, fit into the central inset box (aspect preserved).
    final f = fit;
    if (f != null) {
      final box = Rect.fromLTWH(
        size.width * _inset,
        size.height * _inset,
        size.width * (1 - 2 * _inset),
        size.height * (1 - 2 * _inset),
      );
      double w = box.width, h = box.height;
      if (f.aspect > box.width / box.height) {
        h = box.width / f.aspect;
      } else {
        w = box.height * f.aspect;
      }
      final dst = Rect.fromLTWH(
        box.left + (box.width - w) / 2,
        box.top + (box.height - h) / 2,
        w,
        h,
      );
      final src = Rect.fromLTWH(
        0,
        0,
        f.image.width.toDouble(),
        f.image.height.toDouble(),
      );
      canvas.drawImageRect(
        f.image,
        src,
        dst,
        Paint()..color = AppColors.foreground.withValues(alpha: 0.13),
      );
    }

    final p = Paint()
      ..color = AppColors.primary
      ..style = PaintingStyle.stroke
      ..strokeWidth = _brush
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    for (final s in strokes) {
      if (s.isEmpty) continue;
      if (s.length == 1) {
        canvas.drawCircle(s.first, _brush / 2,
            Paint()..color = AppColors.primary);
        continue;
      }
      final path = Path()..moveTo(s.first.dx, s.first.dy);
      for (var i = 1; i < s.length; i++) {
        path.lineTo(s[i].dx, s[i].dy);
      }
      canvas.drawPath(path, p);
    }
  }

  @override
  bool shouldRepaint(covariant _PadPainter old) => true;
}

/// Reference mask for a glyph (GRID×GRID, 0/1), fit into the central inset box
/// exactly like the on-screen guide — used by the standalone practice screen to
/// score drawings on-device. Same fit as the web authoring side.
Future<Uint8List?> glyphMask64(String char) async {
  final fit = await _measureGlyph(char);
  if (fit == null) return null;
  final rec = ui.PictureRecorder();
  final canvas = Canvas(rec);
  final g = _grid.toDouble();
  final box = Rect.fromLTWH(
    g * _inset,
    g * _inset,
    g * (1 - 2 * _inset),
    g * (1 - 2 * _inset),
  );
  double w = box.width, h = box.height;
  if (fit.aspect > box.width / box.height) {
    h = box.width / fit.aspect;
  } else {
    w = box.height * fit.aspect;
  }
  final dst = Rect.fromLTWH(
    box.left + (box.width - w) / 2,
    box.top + (box.height - h) / 2,
    w,
    h,
  );
  final src = Rect.fromLTWH(
      0, 0, fit.image.width.toDouble(), fit.image.height.toDouble());
  canvas.drawImageRect(fit.image, src, dst, Paint());
  final img = await rec.endRecording().toImage(_grid, _grid);
  fit.image.dispose();
  final data = await img.toByteData(format: ui.ImageByteFormat.rawRgba);
  img.dispose();
  if (data == null) return null;
  final bytes = data.buffer.asUint8List();
  final mask = Uint8List(_grid * _grid);
  for (var i = 0; i < mask.length; i++) {
    if (bytes[i * 4 + 3] > 20) mask[i] = 1;
  }
  return mask;
}

/// Rasterise the glyph and return it tightly cropped to its ink, plus aspect.
Future<_GlyphFit?> _measureGlyph(String char) async {
  const fontSize = 240.0;
  final tp = TextPainter(
    text: TextSpan(
      text: char,
      style: const TextStyle(
        fontFamily: 'NotoSansSundanese',
        fontSize: fontSize,
        color: Colors.black,
      ),
    ),
    textDirection: TextDirection.ltr,
  )..layout();
  final int w = tp.width.ceil().clamp(1, 2048).toInt();
  final int h = tp.height.ceil().clamp(1, 2048).toInt();
  final rec = ui.PictureRecorder();
  tp.paint(Canvas(rec), Offset.zero);
  final full = await rec.endRecording().toImage(w, h);
  final data = await full.toByteData(format: ui.ImageByteFormat.rawRgba);
  if (data == null) {
    full.dispose();
    return null;
  }
  final bytes = data.buffer.asUint8List();
  int minX = w, minY = h, maxX = -1, maxY = -1;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      if (bytes[(y * w + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    full.dispose();
    return null;
  }
  // Crop to the tight ink bounds.
  final cw = maxX - minX + 1;
  final ch = maxY - minY + 1;
  final rec2 = ui.PictureRecorder();
  final c2 = Canvas(rec2);
  c2.drawImageRect(
    full,
    Rect.fromLTWH(minX.toDouble(), minY.toDouble(), cw.toDouble(), ch.toDouble()),
    Rect.fromLTWH(0, 0, cw.toDouble(), ch.toDouble()),
    Paint(),
  );
  final cropped = await rec2.endRecording().toImage(cw, ch);
  full.dispose();
  return _GlyphFit(cropped, cw / ch);
}

/// Draw the strokes into a GRID×GRID image and return a base64 binary mask,
/// or null when there is too little ink.
Future<String?> _strokesToMaskB64(List<List<Offset>> strokes) async {
  if (strokes.every((s) => s.isEmpty)) return null;
  final rec = ui.PictureRecorder();
  final canvas = Canvas(rec);
  const scale = _grid / _pad;
  canvas.scale(scale);
  final p = Paint()
    ..color = Colors.black
    ..style = PaintingStyle.stroke
    ..strokeWidth = _brush
    ..strokeCap = StrokeCap.round
    ..strokeJoin = StrokeJoin.round;
  for (final s in strokes) {
    if (s.isEmpty) continue;
    if (s.length == 1) {
      canvas.drawCircle(s.first, _brush / 2, Paint()..color = Colors.black);
      continue;
    }
    final path = Path()..moveTo(s.first.dx, s.first.dy);
    for (var i = 1; i < s.length; i++) {
      path.lineTo(s[i].dx, s[i].dy);
    }
    canvas.drawPath(path, p);
  }
  final img = await rec.endRecording().toImage(_grid, _grid);
  final data = await img.toByteData(format: ui.ImageByteFormat.rawRgba);
  img.dispose();
  if (data == null) return null;
  final bytes = data.buffer.asUint8List();
  final mask = Uint8List(_grid * _grid);
  var ink = 0;
  for (var i = 0; i < mask.length; i++) {
    if (bytes[i * 4 + 3] > 20) {
      mask[i] = 1;
      ink++;
    }
  }
  if (ink <= 4) return null;
  return base64Encode(mask);
}
