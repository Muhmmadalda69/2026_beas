import 'package:flutter/material.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../widgets/common.dart';

class AksaraScreen extends StatefulWidget {
  const AksaraScreen({super.key});
  @override
  State<AksaraScreen> createState() => _AksaraScreenState();
}

class _AksaraScreenState extends State<AksaraScreen> {
  late Future<List<ChartGroup>> _future;

  @override
  void initState() {
    super.initState();
    _future = TranslitService.chart();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tabel Aksara')),
      body: FutureBuilder<List<ChartGroup>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const LoadingView();
          }
          if (snap.hasError) {
            return ErrorView(
              message: 'Tidak dapat memuat tabel aksara.',
              onRetry: () => setState(() => _future = TranslitService.chart()),
            );
          }
          final groups = snap.data ?? const <ChartGroup>[];
          return ListView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
            children: [
              for (final g in groups) ...[
                Text(g.title, style: AppText.display(size: 20)),
                if (g.description.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(g.description,
                      style: const TextStyle(color: AppColors.muted, height: 1.4)),
                ],
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 3,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.92,
                  children: [for (final glyph in g.glyphs) _GlyphCard(glyph)],
                ),
                const SizedBox(height: 24),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _GlyphCard extends StatelessWidget {
  final Glyph glyph;
  const _GlyphCard(this.glyph);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(glyph.aksara,
              style: AppText.aksara(size: 38, color: AppColors.foreground)),
          const SizedBox(height: 6),
          Text(glyph.latin,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, color: AppColors.primary)),
          if (glyph.name.isNotEmpty)
            Text(
              glyph.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, color: AppColors.muted),
            ),
        ],
      ),
    );
  }
}
