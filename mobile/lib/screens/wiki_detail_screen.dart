import 'package:flutter/material.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../widgets/common.dart';

class WikiDetailScreen extends StatefulWidget {
  final String slug;
  const WikiDetailScreen({super.key, required this.slug});
  @override
  State<WikiDetailScreen> createState() => _WikiDetailScreenState();
}

class _WikiDetailScreenState extends State<WikiDetailScreen> {
  late Future<Article> _future;

  @override
  void initState() {
    super.initState();
    _future = WikiService.article(widget.slug);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Artikel')),
      body: FutureBuilder<Article>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const LoadingView();
          }
          if (snap.hasError || snap.data == null) {
            return const ErrorView(message: 'Artikel tidak ditemukan.');
          }
          final a = snap.data!;
          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
            children: [
              Pill(a.category.toUpperCase(), color: AppColors.gold),
              const SizedBox(height: 12),
              Text(a.title, style: AppText.display(size: 28, height: 1.15)),
              if (a.titleAksara.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(a.titleAksara,
                    style: AppText.aksara(size: 26, color: AppColors.primarySoft)),
              ],
              if (a.readMinutes > 0) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    const Icon(Icons.schedule, size: 15, color: AppColors.muted),
                    const SizedBox(width: 4),
                    Text('${a.readMinutes} menit baca',
                        style: const TextStyle(
                            fontSize: 12.5, color: AppColors.muted)),
                  ],
                ),
              ],
              const Divider(height: 32),
              HtmlWidget(
                a.content,
                textStyle: const TextStyle(
                  fontSize: 16,
                  height: 1.7,
                  color: AppColors.foreground,
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
