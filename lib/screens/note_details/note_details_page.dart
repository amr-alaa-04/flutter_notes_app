import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:note/controllers/location_controller.dart';
import 'package:note/controllers/notes_controller.dart';
import 'package:note/controllers/speech_controller.dart';
import 'package:note/db/entities/note.dart';
import 'package:note/main.dart';
import 'package:note/services/image_storage_service.dart';
import 'package:note/utils/app_colors.dart';
import 'package:note/utils/undoable_change.dart';
import 'package:note/widgets/camera_button.dart';
import 'package:note/widgets/image_preview_widget.dart';
import 'package:note/widgets/image_viewer.dart';
import 'package:note/widgets/location_row.dart';
import 'package:note/widgets/speech_controls.dart';
import 'package:note/widgets/title_input_dialog.dart';

/// View / edit screen of a single note.
///
/// The note is received as a *title* through `Get.arguments` (the home screen
/// only keeps titles), then loaded from the database on first build.
///
/// Saving is **optimistic**: the updated note is pushed into the reactive
/// [note] immediately and the edit mode is closed; if the insert fails the
/// previous note is restored and the screen goes back into edit mode so the
/// user does not lose anything.
///
/// A successful save also offers the **shared** Undo action (the same engine the
/// deletions use): it restores the complete previous version of the note in the
/// screen *and* in the database, for as long as the snackbar is visible.
class NoteDetailsPage extends StatefulWidget {
  const NoteDetailsPage({super.key});

  /// GetX tags of the per-screen controllers (one screen = one instance).
  static const String speechTag = 'note_details_speech';
  static const String locationTag = 'note_details_location';

  @override
  State<NoteDetailsPage> createState() => _NoteDetailsPageState();
}

class _NoteDetailsPageState extends State<NoteDetailsPage> {
  static const EdgeInsets _imagePadding = EdgeInsets.all(16.0);

  late final SpeechController _speech;
  late final LocationController _location;
  final ImageStorageService _images = ImageStorageService();

  final TextEditingController _contentController = TextEditingController();
  final TextEditingController _titleController = TextEditingController();

  /// The loaded note.
  final Rxn<Note> note = Rxn<Note>();

  /// `true` while the user is editing the note.
  final RxBool isEditing = false.obs;

  /// Title typed in the "Enter Note Title" dialog.
  final RxString title = ''.obs;

  /// `false` when the dialog's save button must stay disabled.
  final RxBool hasTitle = false.obs;

  /// "Update location" checkbox.
  final RxBool updateLocation = false.obs;

  /// Address stored with the note (reverse geocoded from its coordinates).
  final RxString locationName = ''.obs;

  /// Picture currently attached to the note.
  final Rxn<File> _image = Rxn<File>();

  @override
  void initState() {
    super.initState();

    _speech = Get.put(
      SpeechController(),
      tag: NoteDetailsPage.speechTag,
    )..attachContentController(_contentController);

    _location = Get.put(
      LocationController(),
      tag: NoteDetailsPage.locationTag,
    );

    _speech.initialize();
    _loadNote();
    _location.fetchCurrentLocation(reportWithSnackBar: true);
  }

  @override
  void dispose() {
    Get.delete<SpeechController>(tag: NoteDetailsPage.speechTag);
    Get.delete<LocationController>(tag: NoteDetailsPage.locationTag);
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Data
  // ───────────────────────────────────────────────────────────────────────────

  /// Loads the note referenced by `Get.arguments` and hydrates the screen.
  Future<void> _loadNote() async {
    final Note? loaded =
        await database.notedao.getNoteFromTitle(Get.arguments);

    if (loaded == null) return;

    note.value = loaded;
    _contentController.text = loaded.content;
    title.value = loaded.title;
    _image.value = ImageStorageService.fileFromPath(loaded.imagePath);

    await _applyStoredLocation(loaded);
  }

  /// Shows the stored address of [target], or nothing when it has no
  /// coordinates. Shared by loading a note and by restoring a previous version.
  Future<void> _applyStoredLocation(Note? target) async {
    if (target == null || target.lat == null || target.long == null) {
      locationName.value = '';
      return;
    }

    final String? address = await LocationController.describeCoordinates(
      target.lat!,
      target.long!,
    );

    locationName.value = address ?? 'no_address_found'.tr;
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
  // Title dialog
  // ───────────────────────────────────────────────────────────────────────────

  Future<void> _showTitleDialog() async {
    _titleController.text = note.value?.title ?? Get.arguments?.toString() ?? '';
    hasTitle.value = _titleController.text.isNotEmpty;

    final String? typed = await showTitleInputDialog(
      context: context,
      controller: _titleController,
      onChanged: (bool value) => hasTitle.value = value,
    );

    if (typed == null || !mounted) return;
    title.value = typed;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Save (optimistic)
  // ───────────────────────────────────────────────────────────────────────────

  Future<void> _saveNote() async {
    final String noteTitle = title.value.isNotEmpty
        ? title.value
        : (_titleController.text.isNotEmpty
            ? _titleController.text.trim()
            : (Get.arguments?.toString() ?? ''));

    if (noteTitle.isEmpty) {
      Get.snackbar('error_title'.tr, 'title_required'.tr);
      return;
    }

    // Snapshot for the rollback **and** for the Undo, taken before anything is
    // mutated. It is the complete previous version of the note (title, content,
    // image, coordinates and id), so Undo restores the note the user actually
    // had before this save — not a reloaded copy of the edited one.
    final Note? previousNote = note.value;

    // Resolve the coordinates first, so the optimistic note already carries
    // the final location instead of a temporary `null`.
    if (updateLocation.value && _location.position == null) {
      await _location.fetchCurrentLocation(reportWithSnackBar: true);
    }

    final Note updatedNote = Note(
      id: previousNote?.id,
      title: noteTitle,
      content: _contentController.text,
      long: updateLocation.value
          ? _location.position?.longitude
          : previousNote?.long,
      lat:
          updateLocation.value ? _location.position?.latitude : previousNote?.lat,
      imagePath: _image.value?.path,
    );

    // ── Optimistic update ────────────────────────────────────────────────
    note.value = updatedNote;
    isEditing.value = false;

    // One shared Undo engine: the save reaches the database, and while the
    // snackbar is on screen the *previous* version stays restorable. A failure
    // rolls the screen back and reports it, and no Undo is offered for a save
    // that never happened.
    final UndoableChange change = UndoableChange(
      successKey: 'note_updated',
      failureKey: 'update_note_failed',
      restore: () => _restorePreviousVersion(previousNote, updatedNote),
    );

    final Future<void> committed = commitUndoableChange(
      change,
      () => database.notedao.insertNote(updatedNote),
      () {
        // ── Rollback ─────────────────────────────────────────────────────
        note.value = previousNote;
        _image.value = ImageStorageService.fileFromPath(previousNote?.imagePath);
        isEditing.value = true;

        // The new location never reached the database, so it is dropped and the
        // previous address is shown again.
        updateLocation.value = false;
        _location.reset();
        _applyStoredLocation(previousNote);
      },
    );

    // A rejected save keeps the user here, with the error and the previous
    // version back on screen.
    await committed;
    if (change.failed) return;

    // Leaving **before** the snackbar is presented: a GetX snackbar lives in the
    // overlay of the route on top, so one shown while this screen is still
    // visible would disappear together with it.
    Get.back<void>();

    showUndoSnackbar(change);

    // The title may have changed, so the list underneath is re-read from the
    // database.
    await _refreshHomeTitles();
  }

  /// Restores the version a note had before its last successful save.
  ///
  /// The screen goes back to [previous] immediately (optimistic), then the row
  /// is written back with the **same primary key**, so `insertNote` replaces it
  /// and can never create a duplicate. When [previous] is `null` the note did
  /// not exist before the save, so the Undo is a delete instead of a restore.
  ///
  /// If the database rejects the restore, the screen is put back to [edited] —
  /// which is what is really stored — and the failure is reported, so the UI
  /// never shows a version the database does not have.
  Future<void> _restorePreviousVersion(Note? previous, Note edited) async {
    note.value = previous;
    _image.value = ImageStorageService.fileFromPath(previous?.imagePath);
    if (previous != null) title.value = previous.title;

    try {
      if (previous == null) {
        await database.notedao.deleteNote(edited);
      } else {
        await database.notedao.insertNote(previous);
      }
    } catch (error) {
      note.value = edited;
      _image.value = ImageStorageService.fileFromPath(edited.imagePath);
      showErrorSnackbar('restore_note_failed', error: error);
    }

    // An Undo can bring back a different title than the one the home list is
    // showing, so the list is re-read from the database either way.
    await _refreshHomeTitles();

    if (previous != null &&
        (previous.lat != edited.lat || previous.long != edited.long)) {
      // The undone location is no longer the note's location, so the pending
      // update is dropped and the restored address is shown instead.
      updateLocation.value = false;
      _location.reset();
      await _applyStoredLocation(previous);
    }
  }

  /// Re-reads the home list after an Undo changed what is stored.
  ///
  /// The home screen is always below this route, so its controller is available;
  /// it is only absent when the screen is used stand-alone (tests).
  Future<void> _refreshHomeTitles() async {
    if (!Get.isRegistered<NotesController>()) return;

    await Get.find<NotesController>().loadTitles();
  }

  Future<void> _toggleEditing() async {
    if (isEditing.value) {
      await _saveNote();
      return;
    }

    isEditing.value = true;
    _showTitleDialog();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Build
  // ───────────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Obx(() {
          final String displayTitle = isEditing.value && title.value.isNotEmpty
              ? title.value
              : (Get.arguments?.toString() ?? '');

          return Text(
            displayTitle,
            style: const TextStyle(
              color: AppColors.primaryForeground,
              fontWeight: FontWeight.bold,
            ),
          );
        }),
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
      ),

      floatingActionButton: FloatingActionButton(
        onPressed: _toggleEditing,
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        child: Obx(() => Icon(isEditing.value ? Icons.save : Icons.edit)),
      ),

      body: Obx(() {
        if (note.value == null) {
          return Center(child: Text('no_content'.tr));
        }

        return SingleChildScrollView(
          child: Column(
            children: <Widget>[
              // ── Content ─────────────────────────────────────────────────
              TextField(
                maxLines: null,
                controller: _contentController,
                textDirection:
                    _speech.isArabic ? TextDirection.rtl : TextDirection.ltr,
                textAlign: _speech.isArabic ? TextAlign.right : TextAlign.left,
                decoration: InputDecoration(
                  enabled: isEditing.value,
                  hintText: _speech.isArabic
                      ? 'اكتب أو اتكلم هنا...'
                      : 'Write content here...',
                  contentPadding: const EdgeInsets.all(8),
                  disabledBorder: InputBorder.none,
                  enabledBorder: InputBorder.none,
                ),
              ),

              // ── Picture (visible in both view and edit mode) ────────────
              Obx(() {
                final File? current = _image.value;
                if (current == null) return const SizedBox.shrink();

                return ImagePreviewWidget(
                  image: current,
                  padding: _imagePadding,
                  height: 200,
                  showDeleteButton: isEditing.value,
                  onDelete: () => _image.value = null,
                  onTap: () => ImageViewerPage.open(current),
                );
              }),

              // ── Edit only controls ──────────────────────────────────────
              Obx(() {
                if (!isEditing.value) return const SizedBox.shrink();

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    SpeechControls(controller: _speech),

                    const SizedBox(height: 8),

                    Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16.0,
                        vertical: 8.0,
                      ),
                      child: CameraButton(
                        onPressed: _takePhoto,
                        isArabic: _speech.isArabic,
                      ),
                    ),
                  ],
                );
              }),

              // ── Update location checkbox ────────────────────────────────
              Obx(
                () => CheckboxListTile(
                  title: Text('update_location'.tr),
                  value: updateLocation.value,
                  onChanged: isEditing.value
                      ? (bool? value) {
                          final bool checked = value ?? false;
                          updateLocation.value = checked;

                          // Same optimistic behaviour as the add-note screen:
                          // the controller publishes the new location through
                          // its reactive state straight away, so the row below
                          // shows it immediately instead of waiting for the save.
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

              // ── Location ────────────────────────────────────────────────
              // While "Update location" is ticked the row renders exactly what
              // the add-note screen renders — the live state of the controller —
              // so a new location appears without waiting for the database.
              // Unticked, the stored address of the note is shown as before.
              Obx(() {
                if (updateLocation.value) return _buildLocationPreview();

                if (locationName.value.isEmpty) {
                  return const SizedBox.shrink();
                }

                return LocationRow(
                  label: locationName.value,
                  padding: _imagePadding,
                );
              }),
            ],
          ),
        );
      }),
    );
  }

  /// Live location of the pending edit, mirroring the add-note preview.
  Widget _buildLocationPreview() {
    if (_location.isLoading.value) {
      return Padding(
        padding: _imagePadding,
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
        padding: _imagePadding,
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
        padding: _imagePadding,
        iconSize: 20,
      );
    }

    return const SizedBox.shrink();
  }
}
