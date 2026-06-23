import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services.dart';
import '../theme.dart';

class TranslitScreen extends StatefulWidget {
  const TranslitScreen({super.key});
  @override
  State<TranslitScreen> createState() => _TranslitScreenState();
}

class _TranslitScreenState extends State<TranslitScreen> {
  final _controller = TextEditingController(text: 'Taruma Institute');
  Timer? _debounce;
  String _output = '';
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Transliterate the default value so output is shown immediately.
    if (_controller.text.trim().isNotEmpty) {
      _loading = true;
      WidgetsBinding.instance
          .addPostFrameCallback((_) => _run(_controller.text));
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String v) {
    _debounce?.cancel();
    if (v.trim().isEmpty) {
      setState(() {
        _output = '';
        _error = null;
        _loading = false;
      });
      return;
    }
    setState(() => _loading = true);
    _debounce = Timer(const Duration(milliseconds: 400), () => _run(v));
  }

  Future<void> _run(String text) async {
    try {
      final result = await TranslitService.transliterate(text);
      if (!mounted) return;
      setState(() {
        _output = result;
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Gagal mengubah teks.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transliterasi')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
        children: [
          const Text(
            'Ketik kata atau kalimat dalam huruf Latin, hasil Aksara Sunda muncul otomatis.',
            style: TextStyle(color: AppColors.muted, height: 1.5),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _controller,
            onChanged: _onChanged,
            minLines: 3,
            maxLines: 6,
            textCapitalization: TextCapitalization.none,
            decoration: const InputDecoration(
              hintText: 'cth. wilujeng sumping',
            ),
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 140),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('AKSARA SUNDA',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                          color: AppColors.muted,
                        )),
                    if (_output.isNotEmpty)
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        tooltip: 'Salin',
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: _output));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Disalin ke clipboard')),
                          );
                        },
                        icon: const Icon(Icons.copy_rounded,
                            size: 18, color: AppColors.primary),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: AppColors.primary),
                    ),
                  )
                else if (_error != null)
                  Text(_error!, style: const TextStyle(color: AppColors.danger))
                else
                  Text(
                    _output.isEmpty ? '—' : _output,
                    style: AppText.aksara(size: 34, color: AppColors.primary),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
