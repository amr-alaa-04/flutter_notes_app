import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:note/controllers/location_controller.dart';
import 'package:note/controllers/speech_controller.dart';
import 'package:note/db/entities/note.dart';
import 'package:note/main.dart';
import 'package:note/services/image_storage_service.dart';
import 'package:note/utils/app_colors.dart';
import 'package:note/widgets/camera_button.dart';
import 'package:note/widgets/image_preview_widget.dart';
import 'package:note/widgets/image_viewer.dart';
import 'package:note/widgets/location_row.dart';
import 'package:note/widgets/speech_controls.dart';
import 'package:note/widgets/title_input_dialog.dart';

/// Screen used to create a new note.
///
/// State is split between three collaborators:
///  * [SpeechController] – microphone + dictation,
///  * [LocationController] – geolocation + reverse geocoding,
///  * this screen – title, content and the picked image.
///
/// Saving is intentionally **not** optimistic: the screen is popped as soon as
/// the insert succeeds, and on failure the user stays here with the content
/// untouched, which is the correct behaviour for this flow (see `README.md`).
class AddNotePage extends StatefulWidget {
  const AddNotePage({super.key});

  /// GetX tags of the per-screen controllers (one screen = one instance).
  static const String speechTag = 'add_note_speech';
  static const String locationTag = 'add_note_location';

  @override
  State<AddNotePage> createState() => _AddNotePageState();
}

class _AddNotePageState extends State<AddNotePage> {
  static const EdgeInsets _locationPadding =
      EdgeInsets.symmetric(horizontal: 16, vertical: 8);

  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();

  late final SpeechController _speech;
  late final LocationController _location;
  final ImageStorageService _images = ImageStorageService();

  /// Title typed in the "Enter Note Title" dialog.
  final RxString title = ''.obs;

  /// `false` until a title has been entered – it also unlocks the editor.
  final RxBool hasTitle = false.obs;

  /// "Save location" checkbox.
  final RxBool saveLocation = false.obs;

  /// Picture attached to the note; only written to the database on save.
  final Rxn<File> _image = Rxn<File>();

  @override
  void initState() {
    super.initState();

    _speech = Get.put(
      SpeechController(initialLocale: SpeechController.arabicLocale),
      tag: AddNotePage.speechTag,
    )..attachContentController(_contentController);

    _location = Get.put(LocationController(), tag: AddNotePage.locationTag);

    _speech.initialize();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _showTitleDialog();
    });
  }

  @override
  void dispose() {
    Get.delete<SpeechController>(tag: AddNotePage.speechTag);
    Get.delete<LocationController>(tag: AddNotePage.locationTag);
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Title dialog
  // ───────────────────────────────────────────────────────────────────────────

  Future<void> _showTitleDialog() async {
    final String? typed = await showTitleInputDialog(
      context: context,
      controller: _titleController,
      onChanged: (bool value) => hasTitle.value = value,
      cancellable: false,
    );

    if (typed == null || !mounted) return;
    title.value = typed;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Camera
  // ───────────────────────────────────────────────────────────────────────────

  Future<void> _takePhoto() async {
    final File? photo = await _images.captureFromCamera();
    if (photo == null || !mounted) return;
    _image.value = photo;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Save
  // ───────────────────────────────────────────────────────────────────────────

  Future<void> _saveNote() async {
    try {
      final String noteTitle = title.value.isNotEmpty
          ? title.value
          : _titleController.text.trim();

      if (noteTitle.isEmpty) {
        Get.snackbar('error_title'.tr, 'title_required'.tr);
        return;
      }

      // Coordinates must be resolved *before* the note is written.
      if (saveLocation.value && _location.position == null) {
        await _location.fetchCurrentLocation();
      }

      await database.notedao.insertNote(
        Note(
          title: noteTitle,
          content: _contentController.text,
          long: saveLocation.value ? _location.position?.longitude : null,
          lat: saveLocation.value ? _location.position?.latitude : null,
          imagePath: _image.value?.path,
        ),
      );

      Get.back<void>();
    } catch (error) {
      debugPrint('Save note error: $error');
      Get.snackbar(
        'error_title'.tr,
        'save_note_failed'.trParams(<String, String>{'error': '$error'}),
      );
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Build
  // ───────────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: true,

      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        title: Obx(
          () => Text(
            title.value.isEmpty ? 'no_title_yet'.tr : title.value,
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: AppColors.primaryForeground,
            ),
          ),
        ),
      ),

      floatingActionButton: FloatingActionButton(
        onPressed: _saveNote,
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        child: const Icon(Icons.save),
      ),

      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            // ── Note content ────────────────────────────────────────────────
            Obx(
              () => TextField(
                maxLines: null,
                controller: _contentController,
                enabled: hasTitle.value,
                textDirection: _speech.isArabic
                    ? TextDirection.rtl
                    : TextDirection.ltr,
                textAlign:
                    _speech.isArabic ? TextAlign.right : TextAlign.left,
                decoration: InputDecoration(
                  hintText: _speech.isArabic
                      ? 'اكتب أو اتكلم هنا...'
                      : 'Write content here...',
                  contentPadding: const EdgeInsets.all(8),
                  disabledBorder: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                ),
              ),
            ),

            // ── Speech + camera controls ───────────────────────────────────
            Obx(() {
              if (!hasTitle.value) return const SizedBox.shrink();

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: <Widget>[
                  SpeechControls(controller: _speech),

                  const SizedBox(height: 8),

                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: <Widget>[
                        CameraButton(
                          onPressed: _takePhoto,
                          isArabic: _speech.isArabic,
                        ),

                        if (_image.value != null) ...<Widget>[
                          const SizedBox(height: 10),

                          // Same 150dp footprint as before, but the picture is
                          // letter-boxed instead of being cropped. Tapping it
                          // opens the shared full screen viewer.
                          ImagePreviewWidget(
                            image: _image.value!,
                            height: 150,
                            onDelete: () => _image.value = null,
                            onTap: () => ImageViewerPage.open(_image.value!),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              );
            }),

            const Divider(),

            // ── Save location checkbox ─────────────────────────────────────
            Obx(
              () => CheckboxListTile(
                title: Text('save_location'.tr),
                value: saveLocation.value,
                onChanged: hasTitle.value
                    ? (bool? value) {
                        final bool checked = value ?? false;
                        saveLocation.value = checked;

                        if (checked) {
                          _location.fetchCurrentLocation();
                        } else {
                          _location.reset();
                        }
                      }
                    : null,
                controlAffinity: ListTileControlAffinity.leading,
              ),
            ),

            // ── Location preview ───────────────────────────────────────────
            Obx(_buildLocationPreview),
          ],
        ),
      ),
    );
  }

  Widget _buildLocationPreview() {
    if (!saveLocation.value) return const SizedBox.shrink();

    if (_location.isLoading.value) {
      return Padding(
        padding: _locationPadding,
        child: Row(
          children: <Widget>[
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),

            const SizedBox(width: 10),

            Text(
              'getting_location'.tr,
              style: const TextStyle(color: AppColors.textSubtle),
            ),
          ],
        ),
      );
    }

    if (_location.locationError.value.isNotEmpty) {
      return Padding(
        padding: _locationPadding,
        child: Row(
          children: <Widget>[
            const Icon(
              Icons.location_off,
              color: AppColors.locationOffColor,
              size: 20,
            ),

            const SizedBox(width: 8),

            Expanded(
              child: Text(
                _location.locationError.value,
                style: const TextStyle(color: AppColors.locationOffColor),
              ),
            ),

            TextButton(
              onPressed: _location.fetchCurrentLocation,
              child: Text('retry'.tr),
            ),
          ],
        ),
      );
    }

    if (_location.locationName.value.isNotEmpty) {
      return LocationRow(
        label: _location.locationName.value,
        padding: _locationPadding,
        iconSize: 20,
      );
    }

    return const SizedBox.shrink();
  }
}
