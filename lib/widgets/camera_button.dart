import 'package:flutter/material.dart';
import 'package:note/utils/app_colors.dart';

/// "Take photo" button shared by the add-note and note-details screens.
///
/// The label follows the **speech recognition language** exactly like it did
/// before the refactoring, therefore [isArabic] drives it instead of the
/// application language.
class CameraButton extends StatelessWidget {
  const CameraButton({
    super.key,
    required this.onPressed,
    required this.isArabic,
  });

  final VoidCallback onPressed;
  final bool isArabic;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.camera_alt),
      label: Text(isArabic ? 'التقط صورة (كاميرا)' : 'Take Photo (Camera)'),
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.success,
        foregroundColor: AppColors.primaryForeground,
        padding: const EdgeInsets.symmetric(vertical: 12),
      ),
    );
  }
}