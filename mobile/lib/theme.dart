import 'package:flutter/material.dart';

/// "Nature Distilled" heritage palette — shared with the Béas web app for a
/// consistent cross-platform brand.
class AppColors {
  static const background = Color(0xFFF6F1E7);
  static const surface = Color(0xFFFFFDF8);
  static const surface2 = Color(0xFFF1E9D8);
  static const foreground = Color(0xFF2E2518);
  static const muted = Color(0xFF6C5D46);
  static const border = Color(0xFFE3D6BD);
  static const primary = Color(0xFF9A4A2A);
  static const primaryHover = Color(0xFF823C21);
  static const primarySoft = Color(0xFFC67B5C);
  static const olive = Color(0xFF6B7B3C);
  static const gold = Color(0xFFB5651D);
  static const danger = Color(0xFFA83232);
}

class AppText {
  static TextStyle display({
    double size = 28,
    FontWeight weight = FontWeight.w700,
    Color color = AppColors.foreground,
    double? height,
  }) =>
      TextStyle(
        fontFamily: 'PlayfairDisplay',
        fontSize: size,
        fontWeight: weight,
        color: color,
        height: height,
      );

  /// Aksara Sunda Unicode glyphs.
  static TextStyle aksara({
    double size = 28,
    Color color = AppColors.foreground,
    FontWeight weight = FontWeight.w400,
  }) =>
      TextStyle(
        fontFamily: 'NotoSansSundanese',
        fontSize: size,
        color: color,
        fontWeight: weight,
        height: 1.6,
      );
}

ThemeData buildAppTheme() {
  final base = ThemeData(useMaterial3: true, brightness: Brightness.light);
  final scheme = const ColorScheme.light().copyWith(
    primary: AppColors.primary,
    onPrimary: AppColors.surface,
    secondary: AppColors.olive,
    onSecondary: AppColors.surface,
    surface: AppColors.surface,
    onSurface: AppColors.foreground,
    background: AppColors.background,
    onBackground: AppColors.foreground,
    error: AppColors.danger,
    outline: AppColors.border,
  );

  final textTheme = base.textTheme
      .apply(
        fontFamily: 'Inter',
        bodyColor: AppColors.foreground,
        displayColor: AppColors.foreground,
      )
      .copyWith(
        // Ensure headline/title styles inherit Inter weight correctly
        headlineLarge: base.textTheme.headlineLarge
            ?.copyWith(fontFamily: 'Inter', color: AppColors.foreground),
        headlineMedium: base.textTheme.headlineMedium
            ?.copyWith(fontFamily: 'Inter', color: AppColors.foreground),
        titleLarge: base.textTheme.titleLarge
            ?.copyWith(fontFamily: 'Inter', color: AppColors.foreground),
        titleMedium: base.textTheme.titleMedium
            ?.copyWith(fontFamily: 'Inter', color: AppColors.foreground),
      );

  return base.copyWith(
    colorScheme: scheme,
    scaffoldBackgroundColor: AppColors.background,
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.background,
      foregroundColor: AppColors.foreground,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: AppText.display(size: 22, weight: FontWeight.w700),
    ),
    cardTheme: CardTheme(
      color: AppColors.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: const BorderSide(color: AppColors.border),
      ),
      margin: EdgeInsets.zero,
    ),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: AppColors.surface2,
      side: const BorderSide(color: AppColors.border),
      labelStyle: const TextStyle(color: AppColors.foreground),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.surface,
      hintStyle: const TextStyle(color: AppColors.muted),
      contentPadding:
          const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: AppColors.primary, width: 1.6),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.surface,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.foreground,
        side: const BorderSide(color: AppColors.border),
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 14),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(999),
        ),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: AppColors.surface,
      surfaceTintColor: Colors.transparent,
      indicatorColor: AppColors.primary.withOpacity(0.12),
      elevation: 3,
      labelTextStyle: MaterialStateProperty.resolveWith(
        (states) => TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: states.contains(MaterialState.selected)
              ? AppColors.primary
              : AppColors.muted,
        ),
      ),
      iconTheme: MaterialStateProperty.resolveWith(
        (states) => IconThemeData(
          color: states.contains(MaterialState.selected)
              ? AppColors.primary
              : AppColors.muted,
        ),
      ),
    ),
    dividerColor: AppColors.border,
  );
}
