import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:note/utils/app_colors.dart';

/// Full screen viewer for a note picture.
///
/// Both the add-note and the note-details screens open **this** widget, so the
/// app has a single image-viewer implementation instead of one per screen.
///
/// The picture is drawn once with [BoxFit.contain] inside an [InteractiveViewer]:
///  * the image fills the whole area the viewer is given and is then letter-
///    boxed by [BoxFit.contain], so it is shown as large as the screen allows
///    while keeping its original proportions — never stretched, squashed or
///    cropped, and never collapsed to its raw pixel size;
///  * [InteractiveViewer.minScale] starts at the "fit the screen" state and
///    [InteractiveViewer.maxScale] lets the user pinch-zoom and pan up to 5×;
///  * zooming needs no controller of our own, so a new route always starts from
///    the fitted view and nothing has to be disposed.
///
/// The chrome reuses the app's existing colours: the same blue [AppBar] as every
/// other screen, over the app's existing dark snackbar colour so a photo can be
/// judged without a bright surround.
class ImageViewerPage extends StatelessWidget {
  const ImageViewerPage({super.key, required this.image});

  /// File to display at its original size.
  final File image;

  /// Opens the viewer using the same transition as the other routes of the app.
  ///
  /// Shared by both screens so the navigation stays in one place.
  static Future<void> open(File image) async {
    await Get.to<void>(
      () => ImageViewerPage(image: image),
      transition: Transition.rightToLeft,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.snackbarBackground,
      appBar: AppBar(
        title: Text(
          'image_viewer_title'.tr,
          style: const TextStyle(
            color: AppColors.primaryForeground,
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
      ),
      body: InteractiveViewer(
        minScale: 1,
        maxScale: 5,
        child: Image.file(
          image,

          // The viewer hands its child loose constraints, so without an explicit
          // size the picture would shrink to its raw pixel size and look tiny.
          // Taking the whole available area and letting `contain` letter-box it
          // shows it as large as possible without distorting it.
          width: double.infinity,
          height: double.infinity,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => Center(child: Text('no_content'.tr)),
        ),
      ),
    );
  }
}
