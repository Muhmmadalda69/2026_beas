import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../state/auth.dart';
import '../widgets/common.dart';
import 'login_screen.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});
  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  late Future<List<LeaderboardEntry>> _future;

  @override
  void initState() {
    super.initState();
    _future = QuizService.leaderboard();
  }

  void _reload() => setState(() {
        _future = QuizService.leaderboard();
      });

  String _dur(int s) {
    final m = s ~/ 60;
    final r = s % 60;
    return m > 0 ? '${m}m ${r}d' : '${r}d';
  }

  Color _medal(int rank) {
    switch (rank) {
      case 1:
        return AppColors.gold;
      case 2:
        return AppColors.muted;
      case 3:
        return AppColors.primarySoft;
      default:
        return AppColors.muted;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    return Scaffold(
      appBar: AppBar(title: const Text('Papan Peringkat')),
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: () async => _reload(),
        child: FutureBuilder<List<LeaderboardEntry>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const LoadingView();
            }
            if (snap.hasError) {
              return ErrorView(
                  message: 'Tidak dapat memuat papan peringkat.',
                  onRetry: _reload);
            }
            final entries = snap.data ?? const <LeaderboardEntry>[];
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
              children: [
                if (!auth.isLoggedIn)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 14),
                    child: Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(16),
                        border:
                            Border.all(color: AppColors.primary.withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          const Expanded(
                            child: Text(
                                'Skor hanya tercatat jika kamu masuk dulu.'),
                          ),
                          ElevatedButton(
                            onPressed: () => Navigator.of(context).push(
                              MaterialPageRoute(
                                  builder: (_) => const LoginScreen()),
                            ),
                            child: const Text('Masuk'),
                          ),
                        ],
                      ),
                    ),
                  ),
                if (entries.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: ErrorView(
                        message: 'Belum ada yang bermain. Jadilah yang pertama!'),
                  )
                else
                  for (final e in entries)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _row(e),
                    ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _row(LeaderboardEntry e) {
    final color = _medal(e.rank);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            height: 40,
            width: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: color.withOpacity(e.rank <= 3 ? 0.18 : 0.1),
              boxShadow: e.rank <= 3
                  ? [
                      BoxShadow(
                          color: color.withOpacity(0.35),
                          blurRadius: 12,
                          offset: const Offset(0, 4))
                    ]
                  : null,
            ),
            child: Text('${e.rank}',
                style: AppText.display(size: 16, color: color)),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 2),
                Text(
                  '${e.levelsCleared} level · ${e.plays} main · ⏱ ${_dur(e.totalSeconds)}',
                  style: const TextStyle(fontSize: 12, color: AppColors.muted),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('${e.totalScore}',
                  style: AppText.display(size: 20, color: AppColors.primary)),
              const Text('poin',
                  style: TextStyle(fontSize: 11, color: AppColors.muted)),
            ],
          ),
        ],
      ),
    );
  }
}
