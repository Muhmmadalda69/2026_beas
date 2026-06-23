import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../state/auth.dart';
import 'home_screen.dart';
import 'wiki_list_screen.dart';
import 'translit_screen.dart';
import 'quiz_levels_screen.dart';
import 'leaderboard_screen.dart';

/// App shell: bottom navigation across the five main sections.
class RootScaffold extends StatefulWidget {
  const RootScaffold({super.key});
  @override
  State<RootScaffold> createState() => _RootScaffoldState();
}

class _RootScaffoldState extends State<RootScaffold> {
  int _index = 0;
  // The IndexedStack keeps every tab alive, so a tab's initState runs only once.
  // For the two data-driven tabs (Kuis progression, Peringkat) we bump an epoch
  // each time the tab is (re)opened so its screen re-fetches fresh data — e.g. a
  // freshly-passed level or a new leaderboard entry shows without manual refresh.
  int _quizEpoch = 0;
  int _leaderboardEpoch = 0;
  static const _quizIndex = 3;
  static const _leaderboardIndex = 4;

  void _select(int i) => setState(() {
        if (i != _index) {
          if (i == _quizIndex) _quizEpoch++;
          if (i == _leaderboardIndex) _leaderboardEpoch++;
        }
        _index = i;
      });

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final screens = [
      HomeScreen(onSelectTab: _select),
      const WikiListScreen(),
      const TranslitScreen(),
      QuizLevelsScreen(key: ValueKey(_quizEpoch)),
      LeaderboardScreen(key: ValueKey(_leaderboardEpoch)),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _select,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Beranda',
          ),
          NavigationDestination(
            icon: Icon(Icons.menu_book_outlined),
            selectedIcon: Icon(Icons.menu_book),
            label: 'Wiki',
          ),
          NavigationDestination(
            icon: Icon(Icons.translate),
            selectedIcon: Icon(Icons.translate),
            label: 'Translit',
          ),
          NavigationDestination(
            icon: Icon(Icons.extension_outlined),
            selectedIcon: Icon(Icons.extension),
            label: 'Kuis',
          ),
          NavigationDestination(
            icon: Icon(Icons.emoji_events_outlined),
            selectedIcon: Icon(Icons.emoji_events),
            label: 'Peringkat',
          ),
        ],
      ),
    );
  }
}
