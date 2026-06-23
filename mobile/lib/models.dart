// Data models mirroring the Béas API responses.

int _int(dynamic v, [int fallback = 0]) =>
    v is num ? v.toInt() : int.tryParse('$v') ?? fallback;

String _str(dynamic v, [String fallback = '']) => v == null ? fallback : '$v';

class User {
  final String id;
  final String name;
  final String email;
  final String role;
  User({
    required this.id,
    required this.name,
    this.email = '',
    this.role = 'user',
  });
  factory User.fromJson(Map<String, dynamic> j) => User(
        id: _str(j['id']),
        name: _str(j['name']),
        email: _str(j['email']),
        role: _str(j['role'], 'user'),
      );
}

class AuthResult {
  final String token;
  final String expiresAt;
  final User user;
  AuthResult({required this.token, required this.expiresAt, required this.user});
  factory AuthResult.fromJson(Map<String, dynamic> j) => AuthResult(
        token: _str(j['token']),
        expiresAt: _str(j['expires_at']),
        user: User.fromJson(
          (j['user'] as Map?)?.cast<String, dynamic>() ?? const {},
        ),
      );
}

class Article {
  final String id;
  final String slug;
  final String title;
  final String titleAksara;
  final String category;
  final String summary;
  final String content;
  final int readMinutes;
  Article({
    required this.id,
    required this.slug,
    required this.title,
    required this.titleAksara,
    required this.category,
    required this.summary,
    required this.content,
    required this.readMinutes,
  });
  factory Article.fromJson(Map<String, dynamic> j) => Article(
        id: _str(j['id']),
        slug: _str(j['slug']),
        title: _str(j['title']),
        titleAksara: _str(j['title_aksara']),
        category: _str(j['category']),
        summary: _str(j['summary']),
        content: _str(j['content']),
        readMinutes: _int(j['read_minutes']),
      );
}

class Level {
  final String id;
  final int number;
  final String title;
  final String description;
  final String difficulty;
  final int passScore;
  final int drawCount;
  final int questionTotal;
  final bool unlocked;
  Level({
    required this.id,
    required this.number,
    required this.title,
    required this.description,
    required this.difficulty,
    required this.passScore,
    required this.drawCount,
    required this.questionTotal,
    required this.unlocked,
  });
  factory Level.fromJson(Map<String, dynamic> j) => Level(
        id: _str(j['id']),
        number: _int(j['number']),
        title: _str(j['title']),
        description: _str(j['description']),
        difficulty: _str(j['difficulty']),
        passScore: _int(j['pass_score']),
        drawCount: _int(j['draw_count']),
        questionTotal: _int(j['question_total']),
        // Defaults to true so the app is usable even if the field is absent.
        unlocked: j['unlocked'] is bool ? j['unlocked'] as bool : true,
      );
}

class PlayQuestion {
  final String id;
  final String prompt;
  final String promptAksara;
  final List<String> options;
  final int points;
  PlayQuestion({
    required this.id,
    required this.prompt,
    required this.promptAksara,
    required this.options,
    required this.points,
  });
  factory PlayQuestion.fromJson(Map<String, dynamic> j) => PlayQuestion(
        id: _str(j['id']),
        prompt: _str(j['prompt']),
        promptAksara: _str(j['prompt_aksara']),
        options:
            ((j['options'] as List?) ?? const []).map((e) => '$e').toList(),
        points: _int(j['points']),
      );
}

class PlaySession {
  final String sessionId;
  final Level level;
  final List<PlayQuestion> questions;
  final String expiresAt;
  PlaySession({
    required this.sessionId,
    required this.level,
    required this.questions,
    required this.expiresAt,
  });
  factory PlaySession.fromJson(Map<String, dynamic> j) => PlaySession(
        sessionId: _str(j['session_id']),
        level: Level.fromJson(
          (j['level'] as Map?)?.cast<String, dynamic>() ?? const {},
        ),
        questions: ((j['questions'] as List?) ?? const [])
            .map((e) => PlayQuestion.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
        expiresAt: _str(j['expires_at']),
      );
}

class AnswerDetail {
  final String questionId;
  final String prompt;
  final String yourAnswer;
  final String correctAnswer;
  final bool correct;
  final String explanation;
  AnswerDetail({
    required this.questionId,
    required this.prompt,
    required this.yourAnswer,
    required this.correctAnswer,
    required this.correct,
    required this.explanation,
  });
  factory AnswerDetail.fromJson(Map<String, dynamic> j) => AnswerDetail(
        questionId: _str(j['question_id']),
        prompt: _str(j['prompt']),
        yourAnswer: _str(j['your_answer']),
        correctAnswer: _str(j['correct_answer']),
        correct: j['correct'] == true,
        explanation: _str(j['explanation']),
      );
}

class QuizResult {
  final String levelId;
  final int score;
  final int pointsEarned;
  final int pointsTotal;
  final int correctCount;
  final int total;
  final bool passed;
  final int durationSeconds;
  final int timeBonus;
  final int finalPoints;
  final List<AnswerDetail> details;
  QuizResult({
    required this.levelId,
    required this.score,
    required this.pointsEarned,
    required this.pointsTotal,
    required this.correctCount,
    required this.total,
    required this.passed,
    required this.durationSeconds,
    required this.timeBonus,
    required this.finalPoints,
    required this.details,
  });
  factory QuizResult.fromJson(Map<String, dynamic> j) => QuizResult(
        levelId: _str(j['level_id']),
        score: _int(j['score']),
        pointsEarned: _int(j['points_earned']),
        pointsTotal: _int(j['points_total']),
        correctCount: _int(j['correct_count']),
        total: _int(j['total']),
        passed: j['passed'] == true,
        durationSeconds: _int(j['duration_seconds']),
        timeBonus: _int(j['time_bonus']),
        finalPoints: _int(j['final_points']),
        details: ((j['details'] as List?) ?? const [])
            .map((e) => AnswerDetail.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}

class LeaderboardEntry {
  final int rank;
  final String name;
  final int totalScore;
  final int totalSeconds;
  final int levelsCleared;
  final int plays;
  LeaderboardEntry({
    required this.rank,
    required this.name,
    required this.totalScore,
    required this.totalSeconds,
    required this.levelsCleared,
    required this.plays,
  });
  factory LeaderboardEntry.fromJson(Map<String, dynamic> j) => LeaderboardEntry(
        rank: _int(j['rank']),
        name: _str(j['name']),
        totalScore: _int(j['total_score']),
        totalSeconds: _int(j['total_seconds']),
        levelsCleared: _int(j['levels_cleared']),
        plays: _int(j['plays']),
      );
}

class Glyph {
  final String latin;
  final String aksara;
  final String name;
  final String example;
  Glyph({
    required this.latin,
    required this.aksara,
    required this.name,
    required this.example,
  });
  factory Glyph.fromJson(Map<String, dynamic> j) => Glyph(
        latin: _str(j['latin']),
        aksara: _str(j['aksara']),
        name: _str(j['name']),
        example: _str(j['example']),
      );
}

class ChartGroup {
  final String key;
  final String title;
  final String description;
  final List<Glyph> glyphs;
  ChartGroup({
    required this.key,
    required this.title,
    required this.description,
    required this.glyphs,
  });
  factory ChartGroup.fromJson(Map<String, dynamic> j) => ChartGroup(
        key: _str(j['key']),
        title: _str(j['title']),
        description: _str(j['description']),
        glyphs: ((j['glyphs'] as List?) ?? const [])
            .map((e) => Glyph.fromJson((e as Map).cast<String, dynamic>()))
            .toList(),
      );
}
