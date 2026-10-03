import 'dart:io';

import 'package:flutter/material.dart';
import 'package:note/utils/app_colors.dart';

/// Renders a note picture with its **original aspect ratio**.
///
/// The image is laid out inside a box of [height] logical pixels and scaled
/// with [BoxFit.contain], which means:
///  * the picture is never stretched or squashed,
///  * it is never cropped to fill the box,
///  * any remaining space is simply letter-boxed.
///
/// The file on disk is only read, never re-encoded, so the stored bytes keep
/// their original proportions.
///
/// Tapping it forwards to [onTap], which both screens wire to
/// [ImageViewerPage.open] for the full screen view.
class ImagePreviewWidget extends StatelessWidget {
  const ImagePreviewWidget({
    super.key,
    required this.image,
    required this.onDelete,
    this.showDeleteButton = true,
    this.onTap,
    this.height = 200,
    this.padding = EdgeInsets.zero,
  });

  /// File to display.
  final File image;

  /// Invoked when the user taps the delete button.
  final VoidCallback onDelete;

  /// The delete button is only meaningful while the note can be edited.
  final bool showDeleteButton;

  /// Invoked when the user taps the picture (opens the full screen viewer).
  final VoidCallback? onTap;

  /// Height of the layout box. The picture is letter-boxed inside it.
  final double height;

  /// Padding around the [Stack] (delete button included).
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Stack(
        alignment: Alignment.topRight,
        children: <Widget>[
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: GestureDetector(
              onTap: onTap,
              behavior: HitTestBehavior.opaque,
              child: Image.file(
                image,
                width: double.infinity,
                height: height,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => SizedBox(height: height),
              ),
            ),
          ),
          if (showDeleteButton)
            IconButton(
              onPressed: onDelete,
              icon: const Icon(Icons.delete, color: AppColors.danger),
              style: IconButton.styleFrom(
                backgroundColor: AppColors.primaryForeground,
              ),
            ),
        ],
      ),
    );
  }
}