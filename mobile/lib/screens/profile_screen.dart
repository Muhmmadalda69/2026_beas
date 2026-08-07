import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../api.dart';
import '../services.dart';
import '../theme.dart';
import '../state/auth.dart';
import '../widgets/common.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    final initial =
        (user?.name.isNotEmpty ?? false) ? user!.name[0].toUpperCase() : '?';

    return Scaffold(
      appBar: AppBar(title: const Text('Profil')),
      body: user == null
          ? const ErrorView(message: 'Belum masuk.')
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
              children: [
                Center(
                  child: Column(
                    children: [
                      Container(
                        height: 88,
                        width: 88,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary.withValues(alpha: 0.12),
                        ),
                        child: Text(initial,
                            style: AppText.display(
                                size: 40, color: AppColors.primary)),
                      ),
                      const SizedBox(height: 14),
                      Text(user.name, style: AppText.display(size: 22)),
                      if (user.email.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(user.email,
                            style: const TextStyle(color: AppColors.muted)),
                      ],
                      const SizedBox(height: 10),
                      Pill(
                        user.role == 'superadmin'
                            ? 'Superadmin'
                            : user.role == 'admin'
                                ? 'Admin'
                                : 'Pemain',
                        color: AppColors.olive,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showSetPassword(context),
                    icon: const Icon(Icons.password_rounded),
                    label: const Text('Atur Kata Sandi'),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Buat kata sandi agar bisa login dengan email & kata sandi, '
                  'selain lewat Google.',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 12, color: AppColors.muted),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: BorderSide(color: AppColors.danger.withValues(alpha: 0.4)),
                    ),
                    onPressed: () async {
                      await context.read<AuthProvider>().logout();
                      if (context.mounted) Navigator.of(context).pop();
                    },
                    icon: const Icon(Icons.logout_rounded),
                    label: const Text('Keluar'),
                  ),
                ),
              ],
            ),
    );
  }
}

void _showSetPassword(BuildContext context) {
  final pass = TextEditingController();
  final confirm = TextEditingController();
  showDialog<void>(
    context: context,
    builder: (dialogCtx) {
      bool loading = false;
      String? error;
      return StatefulBuilder(
        builder: (ctx, setLocal) {
          Future<void> submit() async {
            if (pass.text.length < 8) {
              setLocal(() => error = 'Kata sandi minimal 8 karakter.');
              return;
            }
            if (pass.text != confirm.text) {
              setLocal(() => error = 'Konfirmasi kata sandi tidak cocok.');
              return;
            }
            setLocal(() {
              loading = true;
              error = null;
            });
            try {
              await AuthService.setPassword(pass.text);
              if (dialogCtx.mounted) Navigator.of(dialogCtx).pop();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                        'Kata sandi tersimpan. Kini bisa login pakai email & kata sandi.'),
                  ),
                );
              }
            } on ApiException catch (e) {
              setLocal(() {
                loading = false;
                error = e.message;
              });
            }
          }

          return AlertDialog(
            title: const Text('Atur Kata Sandi'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Buat kata sandi untuk login dengan email & kata sandi '
                  '(selain Google).',
                  style: TextStyle(fontSize: 13, color: AppColors.muted),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: pass,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Kata sandi baru'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: confirm,
                  obscureText: true,
                  decoration: const InputDecoration(labelText: 'Ulangi kata sandi'),
                ),
                if (error != null) ...[
                  const SizedBox(height: 10),
                  Text(error!,
                      style: const TextStyle(color: AppColors.danger, fontSize: 13)),
                ],
              ],
            ),
            actions: [
              TextButton(
                onPressed: loading ? null : () => Navigator.of(dialogCtx).pop(),
                child: const Text('Batal'),
              ),
              ElevatedButton(
                onPressed: loading ? null : submit,
                child: Text(loading ? 'Menyimpan…' : 'Simpan'),
              ),
            ],
          );
        },
      );
    },
  );
}
