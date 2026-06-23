import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
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
                          color: AppColors.primary.withOpacity(0.12),
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
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.danger,
                      side: BorderSide(color: AppColors.danger.withOpacity(0.4)),
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
