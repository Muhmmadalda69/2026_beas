import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../models.dart';
import '../services.dart';
import '../theme.dart';
import '../state/auth.dart';
import '../widgets/common.dart';
import 'login_screen.dart';

enum _Phase { loading, playing, result, error }

String _fmt(int s) =>
    '${(s ~/ 60)}:${(s % 60).toString().padLeft(2, '0')}';

class QuizPlayScreen extends StatefulWidget {
  final String levelId;
  final String levelTitle;
  const QuizPlayScreen({
    super.key,
    required this.levelId,
    required this.levelTitle,
  });
  @override
  State<QuizPlayScreen> createState() => _QuizPlayScreenState();
}

class _QuizPlayScreenState extends State<QuizPlayScreen> {
  _Phase _phase = _Phase.loading;
  PlaySession? _session;
  int _current = 0;
  final Map<String, String> _answers = {};
  QuizResult? _result;
  String _error = '';
  bool _submitting = false;
  int _elapsed = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _start() async {
    _timer?.cancel();
    setState(() {
      _phase = _Phase.loading;
      _answers.clear();
      _current = 0;
      _result = null;
      _elapsed = 0;
    });
    try {
      final s = await QuizService.play(widget.levelId);
      if (!mounted) return;
      setState(() {
        _session = s;
        _phase = _Phase.playing;
      });
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() => _elapsed++);
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _phase = _Phase.error;
      });
    }
  }

  Future<void> _submit() async {
    final s = _session;
    if (s == null) return;
    setState(() => _submitting = true);
    try {
      final r = await QuizService.submit(s.sessionId, _answers);
      _timer?.cancel();
      if (!mounted) return;
      setState(() {
        _result = r;
        _phase = _Phase.result;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _phase = _Phase.error;
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.levelTitle)),
      body: switch (_phase) {
        _Phase.loading => const LoadingView(),
        _Phase.error => _errorBody(),
        _Phase.result => _resultBody(),
        _Phase.playing => _playingBody(),
      },
    );
  }

  Widget _errorBody() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.info_outline, color: AppColors.muted, size: 40),
            const SizedBox(height: 12),
            Text(_error,
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.muted)),
            const SizedBox(height: 16),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Kembali'),
                ),
                const SizedBox(width: 10),
                ElevatedButton(
                    onPressed: _start, child: const Text('Coba lagi')),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _playingBody() {
    final auth = context.watch<AuthProvider>();
    final session = _session!;
    final total = session.questions.length;
    final q = session.questions[_current];
    final selected = _answers[q.id];
    final answered = _answers.length;
    final isLast = _current == total - 1;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.schedule, size: 16, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(_fmt(_elapsed),
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
            Text('Soal ${_current + 1} / $total',
                style: const TextStyle(color: AppColors.muted)),
          ],
        ),
        const SizedBox(height: 10),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: total == 0 ? 0 : (_current + 1) / total,
            minHeight: 8,
            backgroundColor: AppColors.surface2,
            valueColor: const AlwaysStoppedAnimation(AppColors.primary),
          ),
        ),
        if (!auth.isLoggedIn) ...[
          const SizedBox(height: 14),
          _guestBanner(context),
        ],
        const SizedBox(height: 20),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(q.prompt,
                  style: const TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w600, height: 1.4)),
              if (q.promptAksara.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(q.promptAksara,
                    style:
                        AppText.aksara(size: 40, color: AppColors.primarySoft)),
              ],
              const SizedBox(height: 18),
              for (var i = 0; i < q.options.length; i++)
                _option(q.options[i], i, q.options[i] == selected),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            OutlinedButton(
              onPressed:
                  _current == 0 ? null : () => setState(() => _current--),
              child: const Text('Sebelumnya'),
            ),
            if (isLast)
              ElevatedButton(
                onPressed:
                    (_submitting || answered < total) ? null : _submit,
                child: Text(_submitting
                    ? 'Mengirim…'
                    : answered < total
                        ? 'Jawab semua ($answered/$total)'
                        : 'Selesai & Lihat Nilai'),
              )
            else
              ElevatedButton(
                onPressed:
                    selected == null ? null : () => setState(() => _current++),
                child: const Text('Lanjut'),
              ),
          ],
        ),
      ],
    );
  }

  Widget _option(String opt, int index, bool active) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => setState(() => _answers[_session!.questions[_current].id] = opt),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: active ? AppColors.primary.withOpacity(0.1) : AppColors.background,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: active ? AppColors.primary : AppColors.border,
              width: active ? 1.6 : 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                height: 28,
                width: 28,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: active ? AppColors.primary : Colors.transparent,
                  border: Border.all(
                      color: active ? AppColors.primary : AppColors.border),
                ),
                child: Text(
                  String.fromCharCode(65 + index),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: active ? AppColors.surface : AppColors.muted,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(opt,
                    style: AppText.aksara(size: 24, color: AppColors.foreground)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _guestBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.gold.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.gold.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Expanded(
            child: Text('Main sebagai tamu — skor tidak masuk peringkat.',
                style: TextStyle(fontSize: 13)),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            ),
            child: const Text('Masuk'),
          ),
        ],
      ),
    );
  }

  Widget _resultBody() {
    final r = _result!;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: (r.passed ? AppColors.olive : AppColors.gold).withOpacity(0.07),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
                color: (r.passed ? AppColors.olive : AppColors.gold)
                    .withOpacity(0.4)),
          ),
          child: Column(
            children: [
              Text(
                r.passed ? 'Selamat, kamu lulus!' : 'Belum lulus, terus berlatih',
                style: const TextStyle(
                    fontWeight: FontWeight.w700, color: AppColors.muted),
              ),
              const SizedBox(height: 8),
              Text('${r.score}',
                  style: AppText.display(size: 56, weight: FontWeight.w800)),
              const Text('dari 100', style: TextStyle(color: AppColors.muted)),
              const SizedBox(height: 4),
              Text('${r.correctCount} dari ${r.total} soal benar',
                  style: const TextStyle(color: AppColors.muted)),
              const SizedBox(height: 18),
              Row(
                children: [
                  _stat('Akurasi', '${r.pointsEarned}'),
                  _stat('Bonus waktu', '+${r.timeBonus}',
                      hint: _fmt(r.durationSeconds), accent: true),
                  _stat('Poin akhir', '${r.finalPoints}', strong: true),
                ],
              ),
              const SizedBox(height: 18),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  ElevatedButton(
                      onPressed: _start,
                      child: const Text('Main lagi')),
                  const SizedBox(width: 10),
                  OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Level lain'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Text('Pembahasan', style: AppText.display(size: 18)),
        const SizedBox(height: 12),
        for (final d in r.details) _review(d),
      ],
    );
  }

  Widget _stat(String label, String value,
      {String? hint, bool accent = false, bool strong = false}) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 3),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color: strong ? AppColors.primary.withOpacity(0.06) : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: strong ? AppColors.primary : AppColors.border),
        ),
        child: Column(
          children: [
            Text(value,
                style: AppText.display(
                  size: 20,
                  weight: FontWeight.w800,
                  color: accent
                      ? AppColors.olive
                      : strong
                          ? AppColors.primary
                          : AppColors.foreground,
                )),
            const SizedBox(height: 2),
            Text(label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11, color: AppColors.muted)),
            if (hint != null)
              Text(hint,
                  style: const TextStyle(fontSize: 10, color: AppColors.muted)),
          ],
        ),
      ),
    );
  }

  Widget _review(AnswerDetail d) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            d.correct ? Icons.check_circle : Icons.cancel,
            color: d.correct ? AppColors.olive : AppColors.danger,
            size: 22,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(d.prompt,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Text('Jawabanmu: ',
                        style: TextStyle(fontSize: 13, color: AppColors.muted)),
                    Text(d.yourAnswer.isEmpty ? '—' : d.yourAnswer,
                        style: AppText.aksara(size: 18)),
                  ],
                ),
                if (!d.correct)
                  Row(
                    children: [
                      const Text('Benar: ',
                          style:
                              TextStyle(fontSize: 13, color: AppColors.muted)),
                      Text(d.correctAnswer,
                          style: AppText.aksara(size: 18, color: AppColors.olive)),
                    ],
                  ),
                if (d.explanation.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(d.explanation,
                      style: const TextStyle(
                          fontSize: 13,
                          fontStyle: FontStyle.italic,
                          color: AppColors.muted)),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
