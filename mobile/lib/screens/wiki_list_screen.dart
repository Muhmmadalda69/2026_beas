import 'dart:async';
import 'package:flutter/material.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'wiki_detail_screen.dart';

class WikiListScreen extends StatefulWidget {
  const WikiListScreen({super.key});
  @override
  State<WikiListScreen> createState() => _WikiListScreenState();
}

class _WikiListScreenState extends State<WikiListScreen> {
  String _q = '';
  String? _category;
  Timer? _debounce;
  late Future<List<Article>> _future;
  late Future<List<String>> _categories;

  @override
  void initState() {
    super.initState();
    _future = WikiService.articles();
    _categories = WikiService.categories();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  void _reload() {
    setState(() {
      _future = WikiService.articles(category: _category, q: _q);
    });
  }

  void _onSearch(String v) {
    _q = v;
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _reload);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ensiklopedia')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              onChanged: _onSearch,
              decoration: const InputDecoration(
                hintText: 'Cari artikel…',
                prefixIcon: Icon(Icons.search, color: AppColors.muted),
              ),
            ),
          ),
          SizedBox(
            height: 44,
            child: FutureBuilder<List<String>>(
              future: _categories,
              builder: (context, snap) {
                final cats = snap.data ?? const <String>[];
                return ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _catChip('Semua', _category == null, () {
                      _category = null;
                      _reload();
                    }),
                    for (final c in cats)
                      _catChip(c, _category == c, () {
                        _category = c;
                        _reload();
                      }),
                  ],
                );
              },
            ),
          ),
          const SizedBox(height: 4),
          Expanded(
            child: FutureBuilder<List<Article>>(
              future: _future,
              builder: (context, snap) {
                if (snap.connectionState != ConnectionState.done) {
                  return const LoadingView();
                }
                if (snap.hasError) {
                  return ErrorView(
                    message: 'Tidak dapat memuat artikel.',
                    onRetry: _reload,
                  );
                }
                final items = snap.data ?? const <Article>[];
                if (items.isEmpty) {
                  return const ErrorView(message: 'Belum ada artikel.');
                }
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
                  itemCount: items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) => _articleCard(context, items[i]),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _catChip(String label, bool active, VoidCallback onTap) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: active,
        onSelected: (_) => onTap(),
        selectedColor: AppColors.primary.withOpacity(0.14),
        labelStyle: TextStyle(
          color: active ? AppColors.primary : AppColors.muted,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Widget _articleCard(BuildContext context, Article a) {
    return AppCard(
      onTap: () => Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => WikiDetailScreen(slug: a.slug),
      )),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Pill(a.category.toUpperCase(), color: AppColors.gold),
          const SizedBox(height: 8),
          Text(a.title, style: AppText.display(size: 17)),
          if (a.titleAksara.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(a.titleAksara,
                style: AppText.aksara(size: 18, color: AppColors.primarySoft)),
          ],
          const SizedBox(height: 6),
          Text(
            a.summary,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.muted, height: 1.4),
          ),
        ],
      ),
    );
  }
}
