import 'package:flutter/material.dart';

/// Centralised colour palette for the whole app.
///
/// Every colour used by a screen/widget comes from here so the visual identity
/// stays consistent and no screen invents its own hex value. The values are the
/// exact colours the app used before the refactoring (Flutter `Colors.*`), so
/// switching to this class is a no-op visually.
class AppColors {
  AppColors._();

  /// AppBar / FAB / accent colour.
  static const Color primary = Colors.blue;

  /// Text and icon colour on top of [primary].
  static const Color primaryForeground = Colors.white;

  /// Destructive actions (delete note, clear all, remove image).
  static const Color danger = Colors.red;

  /// Secondary accent (camera button).
  static const Color success = Colors.teal;

  /// Microphone permission button (orange).
  static const Color warning = Colors.orange;

  /// Snackbar background (was `Colors.grey[900]`).
  static const Color snackbarBackground = Color(0xFF212121);

  /// Location icon / location text.
  static const Color locationColor = Colors.blue;

  /// Location error icon / text.
  static const Color locationOffColor = Colors.red;

  /// Secondary/hint text (was `Colors.grey`).
  static const Color textMuted = Colors.grey;

  /// "Getting your location…" helper text (was `Colors.grey[600]`).
  static const Color textSubtle = Color(0xFF757575);
}