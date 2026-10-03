import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:note/controllers/notes_controller.dart';
import 'package:note/screens/add_note/add_note_page.dart';
import 'package:note/screens/home/widgets/empty_notes_view.dart';
import 'package:note/screens/home/widgets/note_tile.dart';
import 'package:note/screens/note_details/note_details_page.dart';
import 'package:note/services/shake_service.dart';
import 'package:note/utils/app_colors.dart';
import 'package:shake/shake.dart';

/// Home screen: lists every note title.
///
/// Besides the regular navigation it hosts the two destructive gestures:
///  * **swipe a tile** to delete it (optimistic, with Undo),
///  * **shake the phone** to clear every note immediately (also with Undo).
///
/// Both end up in [NotesController], which owns the single optimistic deletion
/// pipeline, so neither gesture re-implements deleting or rolling back, and both
/// offer the very same Undo action.
///
/// Exactly one accelerometer listener is registered in [initState] and cancelled
/// in [dispose]; [ShakeService] additionally debounces the events so one physical
/// shake can never start more than one deletion.
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final NotesController _notes;
  final ShakeService _shakeService = ShakeService();

  @override
  void initState() {
    super.initState();
    _notes = Get.put(NotesController());
    _shakeService.start((ShakeEvent _) => _onPhoneShake());
  }

  @override
  void dispose() {
    _shakeService.stop();
    Get.delete<NotesController>();
    super.dispose();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Shake to clear all notes
  // ───────────────────────────────────────────────────────────────────────────

  /// Shake → clear every note **immediately**, with no confirmation dialog.
  ///
  /// The deletion is the very same optimistic pipeline the swipe gesture uses:
  /// the list empties on this frame, the shared Undo snackbar appears and the
  /// controller performs the database delete, the rollback on failure and the
  /// Undo (which puts every note back, in order).
  ///
  /// Re-entrancy needs no extra guard:
  ///  * the follow-up events of a single physical shake are dropped by
  ///    [ShakeService.cooldown];
  ///  * `clearAllNotes()` empties [NotesController.titles] synchronously before
  ///    its first `await` and is a no-op on an already empty list, so any later
  ///    event finds nothing left to delete.
  void _onPhoneShake() {
    unawaited(_notes.clearAllNotes());
  }

  /// Runs the exact shake callback the accelerometer would call.
  ///
  /// Exposed so a widget test can verify the flow (immediate clear, no dialog,
  /// Undo) without a real accelerometer.
  @visibleForTesting
  void debugTriggerShake() => _onPhoneShake();

  // ───────────────────────────────────────────────────────────────────────────
  // Delete a single note
  // ───────────────────────────────────────────────────────────────────────────

  /// Confirmation for the long-press gesture.
  ///
  /// The snackbar is closed **before** the deletion starts, because
  /// `deleteNoteByTitle` opens the "Note deleted / Undo" snackbar itself and a
  /// `closeCurrentSnackbar()` afterwards would dismiss that one instead.
  void _showDeleteSnackbar(String noteTitle) {
    Get.snackbar(
      'delete_note_title'.tr,
      'delete_note_message'.tr,
      mainButton: TextButton(
        onPressed: () {
          unawaited(Get.closeCurrentSnackbar());
          unawaited(_notes.deleteNoteByTitle(noteTitle));
        },
        child: Text(
          'delete'.tr,
          style: const TextStyle(
            color: AppColors.danger,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      backgroundColor: AppColors.snackbarBackground,
      colorText: AppColors.primaryForeground,
      duration: const Duration(seconds: 5),
    );
  }

  /// Revealed while a tile is being swiped away.
  ///
  /// Uses the same red delete icon/colour as the delete button that already
  /// existed, and it is gone again as soon as the swipe is released, so the
  /// resting appearance of the list is untouched.
  Widget _buildSwipeBackground() {
    return Container(
      color: AppColors.danger,
      alignment: Alignment.centerRight,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: const Icon(Icons.delete, color: AppColors.primaryForeground),
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Navigation
  // ───────────────────────────────────────────────────────────────────────────

  Future<void> _openAddNote() async {
    await Get.to<void>(
      () => const AddNotePage(),
      transition: Transition.leftToRight,
    );
    await _notes.loadTitles();
  }

  Future<void> _openNoteDetails(String noteTitle) async {
    await Get.to<void>(
      () => const NoteDetailsPage(),
      transition: Transition.leftToRight,
      arguments: noteTitle,
    );
    await _notes.loadTitles();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'home_title'.tr,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: AppColors.primaryForeground,
          ),
        ),
        backgroundColor: AppColors.primary,
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _openAddNote,
        backgroundColor: AppColors.primary,
        foregroundColor: AppColors.primaryForeground,
        child: const Icon(Icons.add),
      ),
      body: Obx(() {
        if (_notes.titles.isEmpty) {
          return const EmptyNotesView();
        }

        return ListView.builder(
          itemCount: _notes.titles.length,
          itemBuilder: (_, int index) {
            final String noteTitle = _notes.titles[index];

            // The title is the identity of a note in this app (it is what the
            // details screen receives and what the DAO looks up), so it is also
            // the Dismissible key: one stable key per row, no duplicates.
            return Dismissible(
              key: ValueKey<String>(noteTitle),
              direction: DismissDirection.endToStart,
              background: _buildSwipeBackground(),
              onDismissed: (_) => _notes.deleteNoteByTitle(noteTitle),
              child: NoteTile(
                title: noteTitle,
                onTap: () => _openNoteDetails(noteTitle),
                onLongPress: () => _showDeleteSnackbar(noteTitle),
              ),
            );
          },
        );
      }),
    );
  }
}
