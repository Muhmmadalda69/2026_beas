import 'api.dart';
import 'models.dart';

List<Map<String, dynamic>> _rows(dynamic d) =>
    ((d as List?) ?? const [])
        .map((e) => (e as Map).cast<String, dynamic>())
        .toList();

class AuthService {
  static Future<AuthResult> register(
    String name,
    String email,
    String password,
  ) async {
    final d = await api.post('/api/auth/users/register',
        body: {'name': name, 'email': email, 'password': password});
    return AuthResult.fromJson((d as Map).cast<String, dynamic>());
  }

  static Future<AuthResult> login(String email, String password) async {
    final d = await api.post('/api/auth/users/login',
        body: {'email': email, 'password': password});
    return AuthResult.fromJson((d as Map).cast<String, dynamic>());
  }

  static Future<User> me() async {
    final d = await api.get('/api/auth/users/me');
    return User.fromJson((d as Map).cast<String, dynamic>());
  }

  /// Exchanges a verified Google id_token for a Béas session.
  static Future<AuthResult> google(String idToken) async {
    final d =
        await api.post('/api/auth/users/google', body: {'id_token': idToken});
    return AuthResult.fromJson((d as Map).cast<String, dynamic>());
  }
}

class WikiService {
  static Future<List<Article>> articles({String? category, String? q}) async {
    final query = <String, String>{};
    if (category != null && category.isNotEmpty) query['category'] = category;
    if (q != null && q.isNotEmpty) query['q'] = q;
    final d = await api.get('/api/wiki/articles', query: query);
    return _rows(d).map(Article.fromJson).toList();
  }

  static Future<Article> article(String slug) async {
    final d = await api.get('/api/wiki/articles/$slug');
    return Article.fromJson((d as Map).cast<String, dynamic>());
  }

  static Future<List<String>> categories() async {
    final d = await api.get('/api/wiki/categories');
    return ((d as List?) ?? const []).map((e) => '$e').toList();
  }
}

class QuizService {
  static Future<List<Level>> levels() async {
    final d = await api.get('/api/quiz/levels');
    return _rows(d).map(Level.fromJson).toList();
  }

  static Future<PlaySession> play(String levelId) async {
    final d = await api.post('/api/quiz/levels/$levelId/play');
    return PlaySession.fromJson((d as Map).cast<String, dynamic>());
  }

  static Future<QuizResult> submit(
    String sessionId,
    Map<String, String> answers,
  ) async {
    final payload = {
      'session_id': sessionId,
      'answers': answers.entries
          .map((e) => {'question_id': e.key, 'answer': e.value})
          .toList(),
    };
    final d = await api.post('/api/quiz/submit', body: payload);
    return QuizResult.fromJson((d as Map).cast<String, dynamic>());
  }

  static Future<List<LeaderboardEntry>> leaderboard() async {
    final d = await api.get('/api/quiz/leaderboard');
    return _rows(d).map(LeaderboardEntry.fromJson).toList();
  }
}

class TranslitService {
  static Future<String> transliterate(String text) async {
    final d = await api.post('/api/translit/transliterate', body: {'text': text});
    final map = (d as Map).cast<String, dynamic>();
    return '${map['aksara'] ?? ''}';
  }

  static Future<List<ChartGroup>> chart() async {
    final d = await api.get('/api/translit/chart');
    return _rows(d).map(ChartGroup.fromJson).toList();
  }
}
