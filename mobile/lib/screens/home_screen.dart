import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../state/auth.dart';
import '../widgets/common.dart';
import 'aksara_screen.dart';
import 'wiki_detail_screen.dart';
import 'login_screen.dart';
import 'profile_screen.dart';

class HomeScreen extends StatelessWidget {
  final ValueChanged<int> onSelectTab;
  const HomeScreen({super.key, required this.onSelectTab});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final features = <_Feature>[
      _Feature('Ensiklopedia', 'Artikel sejarah & kaidah aksara',
          Icons.menu_book_outlined, () => onSelectTab(1)),
      _Feature('Transliterasi', 'Latin ke Aksara Sunda langsung',
          Icons.translate, () => onSelectTab(2)),
      _Feature('Kuis Bertingkat', 'Latihan dengan level menantang',
          Icons.extension_outlined, () => onSelectTab(3)),
      _Feature('Tabel Aksara', 'Referensi swara, ngalagena, dll', Icons.grid_view_rounded,
          () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AksaraScreen()))),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Text('Bé', style: AppText.display(size: 22)),
            Text('as', style: AppText.display(size: 22, color: AppColors.primary)),
          ],
        ),
        actions: [
          IconButton(
            tooltip: auth.isLoggedIn ? 'Profil' : 'Masuk',
            onPressed: () => Navigator.of(context).push(MaterialPageRoute(
              builder: (_) =>
                  auth.isLoggedIn ? const ProfileScreen() : const LoginScreen(),
            )),
            icon: Icon(
              auth.isLoggedIn ? Icons.account_circle : Icons.login_rounded,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          _Hero(onSelectTab: onSelectTab),
          const SizedBox(height: 28),
          const SectionTitle('Empat cara menjelajah'),
          const SizedBox(height: 14),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.02,
            children: features.map((f) => _FeatureCard(f)).toList(),
          ),
          const SizedBox(height: 28),
          SectionTitle('Dari Ensiklopedia',
              trailingLabel: 'Lihat semua', onTrailingTap: () => onSelectTab(1)),
          const SizedBox(height: 14),
          _FeaturedArticles(),
        ],
      ),
    );
  }
}

class _Feature {
  final String title;
  final String desc;
  final IconData icon;
  final VoidCallback onTap;
  _Feature(this.title, this.desc, this.icon, this.onTap);
}

class _Hero extends StatelessWidget {
  final ValueChanged<int> onSelectTab;
  const _Hero({required this.onSelectTab});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.primary, AppColors.primaryHover],
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.35),
            blurRadius: 30,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('ᮃᮊ᮪ᮞᮛ ᮞᮥᮔ᮪ᮓ',
              style: AppText.aksara(size: 22, color: Colors.white)),
          const SizedBox(height: 10),
          Text(
            'Pelajari & Lestarikan\nAksara Sunda',
            style: AppText.display(size: 26, color: Colors.white, height: 1.2),
          ),
          const SizedBox(height: 8),
          Text(
            'Baca ensiklopedia, ubah tulisan Latin ke aksara, dan berlatih lewat kuis bertingkat.',
            style: TextStyle(color: Colors.white.withOpacity(0.9), height: 1.5),
          ),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.primary,
                ),
                onPressed: () => onSelectTab(2),
                child: const Text('Coba Transliterasi'),
              ),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: Colors.white70),
                ),
                onPressed: () => onSelectTab(3),
                child: const Text('Mainkan Kuis'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FeatureCard extends StatelessWidget {
  final _Feature f;
  const _FeatureCard(this.f);

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: f.onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 44,
            width: 44,
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(f.icon, color: AppColors.primary),
          ),
          const Spacer(),
          Text(f.title, style: AppText.display(size: 16)),
          const SizedBox(height: 4),
          Text(
            f.desc,
            style: const TextStyle(fontSize: 12.5, color: AppColors.muted, height: 1.4),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _FeaturedArticles extends StatefulWidget {
  @override
  State<_FeaturedArticles> createState() => _FeaturedArticlesState();
}

class _FeaturedArticlesState extends State<_FeaturedArticles> {
  late Future<List<Article>> _future;

  @override
  void initState() {
    super.initState();
    _future = WikiService.articles();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<Article>>(
      future: _future,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const LoadingView();
        }
        if (snap.hasError || snap.data == null || snap.data!.isEmpty) {
          return const SizedBox.shrink();
        }
        final items = snap.data!.take(3).toList();
        return Column(
          children: [
            for (final a in items) ...[
              AppCard(
                onTap: () => Navigator.of(context).push(MaterialPageRoute(
                  builder: (_) => WikiDetailScreen(slug: a.slug),
                )),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Pill(a.category.toUpperCase(), color: AppColors.gold),
                    const SizedBox(height: 8),
                    Text(a.title, style: AppText.display(size: 16)),
                    if (a.titleAksara.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(a.titleAksara,
                          style: AppText.aksara(
                              size: 18, color: AppColors.primarySoft)),
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
              ),
              const SizedBox(height: 12),
            ],
          ],
        );
      },
    );
  }
}
