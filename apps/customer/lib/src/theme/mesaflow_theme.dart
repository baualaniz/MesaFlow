import 'package:flutter/material.dart';

abstract final class MesaFlowColors {
  static const sage = Color(0xFF91A88C);
  static const charcoal = Color(0xFF414141);
  static const ivory = Color(0xFFF5F4EF);
  static const softGreen = Color(0xFFB7C5B3);
  static const lightGray = Color(0xFFE7E7E7);
  static const white = Color(0xFFFFFFFF);
  static const success = Color(0xFF3F7251);
}

abstract final class MesaFlowTheme {
  static ThemeData get light {
    final scheme =
        ColorScheme.fromSeed(
          seedColor: MesaFlowColors.sage,
          brightness: Brightness.light,
          surface: MesaFlowColors.ivory,
        ).copyWith(
          primary: MesaFlowColors.charcoal,
          secondary: MesaFlowColors.sage,
          onPrimary: MesaFlowColors.white,
          onSurface: MesaFlowColors.charcoal,
        );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: MesaFlowColors.ivory,
      fontFamily: 'Inter',
      fontFamilyFallback: const ['Arial', 'sans-serif'],
    );

    return base.copyWith(
      textTheme: base.textTheme.copyWith(
        displaySmall: base.textTheme.displaySmall?.copyWith(
          fontFamily: 'Poppins',
          fontWeight: FontWeight.w700,
          color: MesaFlowColors.charcoal,
          letterSpacing: -1,
        ),
        headlineMedium: base.textTheme.headlineMedium?.copyWith(
          fontFamily: 'Poppins',
          fontWeight: FontWeight.w700,
          color: MesaFlowColors.charcoal,
        ),
        titleLarge: base.textTheme.titleLarge?.copyWith(
          fontFamily: 'Poppins',
          fontWeight: FontWeight.w600,
        ),
        titleMedium: base.textTheme.titleMedium?.copyWith(
          fontFamily: 'Poppins',
          fontWeight: FontWeight.w600,
        ),
      ),
      cardTheme: const CardThemeData(
        color: MesaFlowColors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(24)),
          side: BorderSide(color: MesaFlowColors.lightGray),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: MesaFlowColors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(18)),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(18)),
          borderSide: BorderSide(color: MesaFlowColors.lightGray),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(18)),
          borderSide: BorderSide(color: MesaFlowColors.sage, width: 2),
        ),
      ),
    );
  }
}
