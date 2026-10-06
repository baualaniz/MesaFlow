import 'package:flutter/material.dart';

abstract final class MesaFlowColors {
  static const sage = Color(0xFF91A88C);
  static const charcoal = Color(0xFF414141);
  static const ivory = Color(0xFFF5F4EF);
  static const softGreen = Color(0xFFB7C5B3);
  static const paleGreen = Color(0xFFE7EEE4);
  static const lightGray = Color(0xFFE7E7E7);
  static const mediumGray = Color(0xFF6A6A6A);
  static const white = Color(0xFFFFFFFF);
  static const success = Color(0xFF3F7251);
  static const successSurface = Color(0xFFE4F1E8);
  static const warning = Color(0xFF8A5A12);
  static const warningSurface = Color(0xFFFFF1D6);
  static const error = Color(0xFFB3261E);
  static const errorSurface = Color(0xFFFFE9E7);
  static const info = Color(0xFF315F7D);
  static const infoSurface = Color(0xFFE5F2FA);
}

abstract final class MesaFlowSpacing {
  static const xxs = 4.0;
  static const xs = 8.0;
  static const sm = 12.0;
  static const md = 16.0;
  static const lg = 24.0;
  static const xl = 32.0;
  static const xxl = 48.0;
}

abstract final class MesaFlowRadius {
  static const sm = 10.0;
  static const md = 18.0;
  static const lg = 24.0;
  static const pill = 99.0;
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
          error: MesaFlowColors.error,
          errorContainer: MesaFlowColors.errorSurface,
          outline: MesaFlowColors.lightGray,
          outlineVariant: MesaFlowColors.lightGray,
        );

    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: MesaFlowColors.ivory,
      fontFamily: 'Inter',
      fontFamilyFallback: const ['Arial', 'sans-serif'],
    );

    return base.copyWith(
      textTheme: base.textTheme
          .apply(fontFamily: 'Inter')
          .copyWith(
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
            bodyLarge: base.textTheme.bodyLarge?.copyWith(
              fontFamily: 'Inter',
              height: 1.5,
            ),
            bodyMedium: base.textTheme.bodyMedium?.copyWith(
              fontFamily: 'Inter',
              height: 1.45,
            ),
            bodySmall: base.textTheme.bodySmall?.copyWith(
              fontFamily: 'Inter',
              height: 1.4,
              color: MesaFlowColors.mediumGray,
            ),
          ),
      cardTheme: const CardThemeData(
        color: MesaFlowColors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(MesaFlowRadius.lg)),
          side: BorderSide(color: MesaFlowColors.lightGray),
        ),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        filled: true,
        fillColor: MesaFlowColors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(MesaFlowRadius.md)),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(MesaFlowRadius.md)),
          borderSide: BorderSide(color: MesaFlowColors.lightGray),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(MesaFlowRadius.md)),
          borderSide: BorderSide(color: MesaFlowColors.sage, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(MesaFlowRadius.md)),
          borderSide: BorderSide(color: MesaFlowColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.all(Radius.circular(MesaFlowRadius.md)),
          borderSide: BorderSide(color: MesaFlowColors.error, width: 2),
        ),
        contentPadding: EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        hintStyle: TextStyle(color: MesaFlowColors.mediumGray),
        errorStyle: TextStyle(
          color: MesaFlowColors.error,
          fontWeight: FontWeight.w600,
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: MesaFlowColors.charcoal,
          foregroundColor: MesaFlowColors.white,
          disabledBackgroundColor: MesaFlowColors.lightGray,
          disabledForegroundColor: MesaFlowColors.mediumGray,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 17),
          minimumSize: const Size(48, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MesaFlowRadius.md),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: MesaFlowColors.charcoal,
          side: const BorderSide(color: MesaFlowColors.charcoal),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          minimumSize: const Size(48, 52),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(MesaFlowRadius.md),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: MesaFlowColors.success,
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
      ),
      chipTheme: base.chipTheme.copyWith(
        backgroundColor: MesaFlowColors.white,
        selectedColor: MesaFlowColors.paleGreen,
        side: const BorderSide(color: MesaFlowColors.lightGray),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MesaFlowRadius.sm),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        labelStyle: const TextStyle(
          fontFamily: 'Inter',
          color: MesaFlowColors.charcoal,
          fontWeight: FontWeight.w600,
        ),
        checkmarkColor: MesaFlowColors.success,
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: MesaFlowColors.charcoal,
        contentTextStyle: const TextStyle(
          fontFamily: 'Inter',
          color: MesaFlowColors.white,
          fontWeight: FontWeight.w600,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(MesaFlowRadius.md),
        ),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: MesaFlowColors.white,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(
            top: Radius.circular(MesaFlowRadius.lg),
          ),
        ),
      ),
      dividerTheme: const DividerThemeData(
        color: MesaFlowColors.lightGray,
        thickness: 1,
        space: 24,
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: MesaFlowColors.success,
        linearTrackColor: MesaFlowColors.paleGreen,
      ),
      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: MesaFlowColors.charcoal,
          borderRadius: BorderRadius.circular(MesaFlowRadius.sm),
        ),
        textStyle: const TextStyle(
          fontFamily: 'Inter',
          color: MesaFlowColors.white,
        ),
      ),
    );
  }
}
