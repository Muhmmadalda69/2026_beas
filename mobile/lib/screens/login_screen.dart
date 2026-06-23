import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../config.dart';
import '../theme.dart';
import '../state/auth.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isRegister = false;
  bool _loading = false;
  String? _error;
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    final auth = context.read<AuthProvider>();
    try {
      if (_isRegister) {
        await auth.register(
            _name.text.trim(), _email.text.trim(), _password.text);
      } else {
        await auth.login(_email.text.trim(), _password.text);
      }
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      setState(() {
        _error = e is ApiException ? e.message : 'Gagal masuk. Coba lagi.';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _google() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final ok = await context.read<AuthProvider>().loginWithGoogle();
      if (ok && mounted) Navigator.of(context).pop();
    } catch (e) {
      String msg;
      if (e is ApiException) {
        msg = e.message;
      } else if (e is PlatformException) {
        // e.g. code "10" = Android OAuth client / SHA-1 not registered.
        msg = 'Google gagal (${e.code})${e.message != null ? ': ${e.message}' : ''}';
      } else {
        msg = 'Gagal masuk dengan Google: $e';
      }
      setState(() => _error = msg);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isRegister ? 'Daftar' : 'Masuk')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        children: [
          Center(
            child: Column(
              children: [
                Text('Bé${''}as', style: AppText.display(size: 30)),
                const SizedBox(height: 4),
                Text(
                  _isRegister
                      ? 'Buat akun untuk menyimpan progres'
                      : 'Masuk untuk main & naik peringkat',
                  style: const TextStyle(color: AppColors.muted),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Segmented toggle
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppColors.surface2,
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              children: [
                _toggle('Masuk', !_isRegister, () => setState(() {
                      _isRegister = false;
                      _error = null;
                    })),
                _toggle('Daftar', _isRegister, () => setState(() {
                      _isRegister = true;
                      _error = null;
                    })),
              ],
            ),
          ),
          const SizedBox(height: 20),
          if (_isRegister) ...[
            const _Label('Nama'),
            TextField(
              controller: _name,
              textCapitalization: TextCapitalization.words,
              decoration: const InputDecoration(hintText: 'Nama tampilan'),
            ),
            const SizedBox(height: 14),
          ],
          const _Label('Email'),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
            decoration: const InputDecoration(hintText: 'email@contoh.com'),
          ),
          const SizedBox(height: 14),
          const _Label('Kata sandi'),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: InputDecoration(
              hintText: _isRegister ? 'Minimal 8 karakter' : '••••••••',
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.danger.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(_error!,
                  style: const TextStyle(color: AppColors.danger)),
            ),
          ],
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: Text(_loading
                  ? 'Memproses…'
                  : _isRegister
                      ? 'Daftar'
                      : 'Masuk'),
            ),
          ),
          if (AppConfig.googleEnabled) ...[
            const SizedBox(height: 18),
            const Row(
              children: [
                Expanded(child: Divider(color: AppColors.border)),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 12),
                  child: Text('atau', style: TextStyle(color: AppColors.muted)),
                ),
                Expanded(child: Divider(color: AppColors.border)),
              ],
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _loading ? null : _google,
                icon: const Icon(Icons.account_circle_outlined,
                    color: AppColors.primary),
                label: const Text('Masuk dengan Google'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _toggle(String label, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: active ? AppColors.surface : Colors.transparent,
            borderRadius: BorderRadius.circular(999),
            border: active ? Border.all(color: AppColors.border) : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              color: active ? AppColors.primary : AppColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}

class _Label extends StatelessWidget {
  final String text;
  const _Label(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 6, left: 2),
        child: Text(text,
            style:
                const TextStyle(fontWeight: FontWeight.w600, fontSize: 13.5)),
      );
}
