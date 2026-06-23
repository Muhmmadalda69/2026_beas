import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'theme.dart';
import 'state/auth.dart';
import 'screens/root_scaffold.dart';

void main() {
  // Prevent google_fonts from fetching over the network at startup.
  // Fonts are bundled as local assets; system fallback applies otherwise.
  GoogleFonts.config.allowRuntimeFetching = false;
  runApp(const BeasApp());
}

class BeasApp extends StatelessWidget {
  const BeasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: 'Béas',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        home: const RootScaffold(),
      ),
    );
  }
}
