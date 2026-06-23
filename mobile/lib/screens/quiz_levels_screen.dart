import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../state/auth.dart';
import '../widgets/common.dart';
import 'quiz_play_screen.dart';
import 'login_screen.dart';

class QuizLevelsScreen extends StatefulWidget {
  const QuizLevelsScreen({super.key});
  @override
  State<QuizLevelsScreen> createState() => _QuizLevelsScreenState();
}

class _QuizLevelsScreenState extends State<QuizLevelsScreen> {
  late Future<List<Level>> _future;
  bool? _wasLoggedIn;

  @override
  void initState() {
    super.initState();
    _future = QuizService.levels();
  }

  void _reload() => setState(() {
        _future = QuizService.levels();
      });

  Color _difficultyColor(String d) {
    switch (d.toLowerCase()) {
      case 'menengah':
        return AppColors.gold;
      case 'mahir':
        return AppColors.primary;
      default:
        return AppColors.olive;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    // Refresh progression when the login state changes.
    if (_wasLoggedIn != null && _wasLoggedIn != auth.isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _reload());
    }
    _wasLoggedIn = auth.isLoggedIn;

    return Scaffold(
      appBar: AppBar(title: const Text('Kuis Bertingkat')),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<Level>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const LoadingView();
            }
            if (snap.hasError) {
              return ErrorView(
                message: 'Tidak dapat memuat level kuis.',
                onRetry: _reload,
              );
            }
            final levels = snap.data ?? const <Level>[];
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                if (!auth.isLoggedIn)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: _loginBanner(context),
                  ),
                for (var i = 0; i < levels.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _levelCard(
                      context,
                      levels[i],
                      prevTitle: i > 0 ? levels[i - 1].title : '',
                      loggedIn: auth.isLoggedIn,
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _loginBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.primary.withOpacity(0.06),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.primary.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Masuk untuk menyimpan progres & membuka level lanjutan.',
              style: TextStyle(color: AppColors.foreground),
            ),
          ),
          const SizedBox(width: 10),
          ElevatedButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            ),
            child: const Text('Masuk'),
          ),
        ],
      ),
    );
  }

  Widget _levelCard(
    BuildContext context,
    Level level, {
    required String prevTitle,
    required bool loggedIn,
  }) {
    final hasQuestions = level.questionTotal > 0;
    final locked = !level.unlocked;
    final color = _difficultyColor(level.difficulty);

    return AppCard(
      onTap: (hasQuestions && !locked)
          ? () async {
              await Navigator.of(context).push(MaterialPageRoute(
                builder: (_) =>
                    QuizPlayScreen(levelId: level.id, levelTitle: level.title),
              ));
              _reload(); // progression may have changed
            }
          : null,
      child: Row(
        children: [
          Container(
            height: 46,
            width: 46,
            decoration: BoxDecoration(
              color: locked
                  ? AppColors.muted.withOpacity(0.12)
                  : AppColors.primary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              locked ? Icons.lock_outline : Icons.extension_outlined,
              color: locked ? AppColors.muted : AppColors.primary,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                        child: Text(level.title,
                            style: AppText.display(size: 16))),
                    Pill(level.difficulty, color: color),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  !hasQuestions
                      ? 'Belum ada soal'
                      : locked
                          ? (loggedIn
                              ? 'Lulus "$prevTitle" dulu'
                              : 'Masuk untuk membuka')
                          : '${level.drawCount > 0 ? level.drawCount : level.questionTotal} soal · lulus ${level.passScore}%',
                  style: const TextStyle(
                      fontSize: 12.5, color: AppColors.muted, height: 1.3),
                ),
              ],
            ),
          ),
          if (hasQuestions && !locked)
            const Icon(Icons.chevron_right, color: AppColors.muted),
        ],
      ),
    );
  }
}
