import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import '../aksara_score.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../widgets/aksara_pad.dart';
import '../widgets/common.dart';

/// Standalone writing practice: pick an aksara, trace it, and get a 0–100
/// similarity score computed entirely on-device (nothing is saved). Mirrors the
/// web `/nulis` page.
class NulisScreen extends StatefulWidget {
  const NulisScreen({super.key});
  @override
  State<NulisScreen> createState() => _NulisScreenState();
}

class _NulisScreenState extends State<NulisScreen> {
  bool _loading = true;
  bool _error = false;
  List<ChartGroup> _groups = [];
  String _activeKey = '';
  Glyph? _selected;
  Uint8List? _refMask;
  String? _userMask; // base64 from the pad
  ScoreResult? _result;
  bool _lockScroll = false; // freeze the list while drawing

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = false;
    });
    try {
      final g = await TranslitService.chart();
      if (!mounted) return;
      final def = g.firstWhere(
        (x) => x.key == 'ngalagena',
        orElse: () => g.first,
      );
      setState(() {
        _groups = g;
        _activeKey = def.key;
        _loading = false;
      });
      if (def.glyphs.isNotEmpty) _selectGlyph(def.glyphs.first);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = true;
        _loading = false;
      });
    }
  }

  Future<void> _selectGlyph(Glyph glyph) async {
    setState(() {
      _selected = glyph;
      _result = null;
      _userMask = null;
      _refMask = null;
    });
    final m = await glyphMask64(glyph.aksara);
    if (!mounted || _selected?.aksara != glyph.aksara) return;
    setState(() => _refMask = m);
  }

  void _score() {
    final ref = _refMask;
    final u = _userMask;
    if (ref == null || u == null) return;
    final user = base64Decode(u);
    if (user.length != ref.length) return;
    setState(() => _result = compareMasks(ref, user));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Latihan Menulis')),
      body: _loading
          ? const LoadingView()
          : _error
              ? ErrorView(
                  message: 'Tidak dapat memuat daftar aksara.',
                  onRetry: _load,
                )
              : _body(),
    );
  }

  Widget _body() {
    final active = _groups.firstWhere(
      (g) => g.key == _activeKey,
      orElse: () => _groups.first,
    );
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      physics: _lockScroll ? const NeverScrollableScrollPhysics() : null,
      children: [
        const Text(
          'Pilih aksara, jiplak glyph redup di kanvas, lalu tekan Nilai untuk '
          'melihat seberapa mirip tulisanmu (0–100).',
          style: TextStyle(color: AppColors.muted, height: 1.4),
        ),
        const SizedBox(height: 14),
        // Group selector.
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final g in _groups)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _groupChip(g),
                ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        // Glyph picker.
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [for (final glyph in active.glyphs) _glyphChip(glyph)],
        ),
        const SizedBox(height: 20),
        _pad(),
      ],
    );
  }

  Widget _groupChip(ChartGroup g) {
    final active = g.key == _activeKey;
    final label = g.title.replaceAll(RegExp(r'\s*\(.*\)\s*'), '');
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: () => setState(() => _activeKey = g.key),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : AppColors.surface,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: active ? AppColors.primary : AppColors.border),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: active ? AppColors.surface : AppColors.muted,
          ),
        ),
      ),
    );
  }

  Widget _glyphChip(Glyph glyph) {
    final sel = _selected?.aksara == glyph.aksara && _selected?.latin == glyph.latin;
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => _selectGlyph(glyph),
      child: Container(
        width: 72,
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: sel ? AppColors.primary.withValues(alpha: 0.06) : AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: sel ? AppColors.primary : AppColors.border,
            width: sel ? 1.6 : 1,
          ),
        ),
        child: Column(
          children: [
            Text(glyph.aksara,
                style: AppText.aksara(size: 30, color: AppColors.foreground)),
            const SizedBox(height: 4),
            Text(glyph.latin,
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary)),
          ],
        ),
      ),
    );
  }

  Widget _pad() {
    final glyph = _selected;
    if (glyph == null) return const SizedBox.shrink();
    final r = _result;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Tulis “${glyph.latin}”', style: AppText.display(size: 18)),
              Text(glyph.aksara,
                  style: AppText.aksara(size: 34, color: AppColors.primarySoft)),
            ],
          ),
          const SizedBox(height: 14),
          AksaraPad(
            key: ValueKey(glyph.aksara + glyph.latin),
            char: glyph.aksara,
            showGuide: true,
            onInteracting: (v) => setState(() => _lockScroll = v),
            onChanged: (m) => setState(() {
              _userMask = m;
              _result = null;
            }),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: (_refMask == null || _userMask == null) ? null : _score,
            child: const Text('Nilai'),
          ),
          if (r != null) ...[
            const SizedBox(height: 14),
            _scorePanel(r),
          ],
          const SizedBox(height: 8),
          const Text(
            'Nilai hanya untuk evaluasi belajar dan tidak disimpan.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 11, color: AppColors.muted),
          ),
        ],
      ),
    );
  }

  Widget _scorePanel(ScoreResult r) {
    if (r.tooLittle) {
      return const Text(
        'Gambar dulu aksaranya, lalu tekan “Nilai”.',
        textAlign: TextAlign.center,
        style: TextStyle(color: AppColors.muted),
      );
    }
    final color = r.score >= 70
        ? AppColors.olive
        : r.score >= 50
            ? AppColors.gold
            : AppColors.danger;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface2.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('${r.score}',
                  style: AppText.display(size: 44, weight: FontWeight.w800, color: color)),
              const SizedBox(width: 4),
              const Text('/ 100', style: TextStyle(color: AppColors.muted, fontSize: 16)),
            ],
          ),
          const SizedBox(height: 4),
          Text(feedbackFor(r.score),
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.foreground)),
          const SizedBox(height: 8),
          Text(
            'Ketepatan garis: ${(r.precision * 100).round()}%   ·   '
            'Kelengkapan: ${(r.recall * 100).round()}%',
            style: const TextStyle(fontSize: 12, color: AppColors.muted),
          ),
        ],
      ),
    );
  }
}
