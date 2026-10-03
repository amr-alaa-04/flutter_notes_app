import 'package:get/get.dart';
import 'package:note/db/entities/note.dart';
import 'package:note/main.dart';
import 'package:note/utils/undoable_change.dart';

/// A single note removed by an in-flight optimistic deletion.
class _DeletedNote {
  _DeletedNote({required this.title, required this.index});

  /// Title the note is stored under — the identity used everywhere in this app.
  final String title;

  /// Position the note occupied in the list before it was removed.
  final int index;

  /// Row read from the database right before the delete, so Undo can write the
  /// very same record (same `id`) back instead of inventing a new one.
  Note? note;
}

/// Owns the note list shown on the home screen.
///
/// Mutations use **Optimistic UI**:
///
/// ```text
/// user action ──▶ update the Rx list immediately
///              ──▶ run the database operation
///              ──▶ success : keep the new state (still undoable)
///              ──▶ failure : restore the snapshot + show an error snackbar
/// ```
///
/// There is exactly **one** deletion implementation ([_delete]): swiping a
/// tile, confirming the long-press dialog and shaking the phone all end up in
/// the same pipeline, so a bug can never be fixed in one gesture but not in the
/// other.
///
/// Every deletion is undoable for [undoWindow] through the shared Undo engine
/// (`lib/utils/undoable_change.dart`), which the note edit uses as well:
///
/// ```text
/// SWIPE / SHAKE ──▶ REMOVE FROM UI IMMEDIATELY ──▶ UNDO SNACKBAR
///                ──▶ DATABASE DELETE
///                ──▶ SUCCESS : KEEP DELETED
///                ──▶ FAILURE : ROLLBACK (snackbar becomes a no-op)
///                ──▶ UNDO    : RESTORE AT THE ORIGINAL POSITION + RE-INSERT
/// ```
class NotesController extends GetxController {
  /// Observable list of note titles rendered by the home screen.
  final RxList<String> titles = <String>[].obs;

  /// Deletions whose Undo snackbar has not expired yet. Only used by [onClose]
  /// to settle them, so no timer ever outlives the controller.
  final List<UndoableChange> _pendingDeletions = <UndoableChange>[];

  @override
  void onInit() {
    super.onInit();
    loadTitles();
  }

  @override
  void onClose() {
    for (final UndoableChange deletion in _pendingDeletions) {
      deletion.settle();
    }
    _pendingDeletions.clear();
    super.onClose();
  }

  /// Reloads the list from the database.
  Future<void> loadTitles() async {
    try {
      titles.value = await database.notedao.getNotesTitle();
    } catch (error) {
      showErrorSnackbar('load_notes_failed', error: error);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public entry points — every one of them ends in [_delete]
  // ───────────────────────────────────────────────────────────────────────────

  /// Deletes one note (swipe gesture or the long-press confirmation).
  ///
  /// The title is removed **synchronously**, before the first `await`, so the
  /// `Dismissible` that triggered the swipe already sees an updated list in the
  /// same frame. The database row is fetched and deleted afterwards and the
  /// whole operation stays undoable for [undoWindow].
  Future<void> deleteNoteByTitle(String noteTitle) async {
    final int index = titles.indexOf(noteTitle);

    // Already gone (double swipe, or two gestures racing): do nothing instead
    // of deleting the row twice.
    if (index < 0) return;

    final List<_DeletedNote> entries = <_DeletedNote>[
      _DeletedNote(title: noteTitle, index: index),
    ];

    // ── Optimistic UI ───────────────────────────────────────────────────────
    titles.removeAt(index);

    await _delete(
      entries,
      successKey: 'note_deleted',
      failureKey: 'delete_note_failed',
      runDatabase: (List<_DeletedNote> pending) async {
        final Note? note =
            await database.notedao.getNoteFromTitle(pending.first.title);
        if (note == null) return;
        pending.first.note = note;
        await database.notedao.deleteNote(note);
      },
    );
  }

  /// Deletes every note (the shake gesture) through the exact same pipeline.
  ///
  /// `deleteAllNotes()` is a single SQLite statement, therefore it either
  /// succeeds completely or leaves the table untouched — both cases keep the UI
  /// and the database in agreement.
  Future<void> clearAllNotes() async {
    if (titles.isEmpty) return;

    final List<_DeletedNote> entries = <_DeletedNote>[
      for (int index = 0; index < titles.length; index++)
        _DeletedNote(title: titles[index], index: index),
    ];

    // ── Optimistic UI ───────────────────────────────────────────────────────
    titles.clear();

    await _delete(
      entries,
      successKey: 'all_notes_deleted',
      failureKey: 'clear_all_failed',
      runDatabase: (List<_DeletedNote> pending) async {
        // One query for every row (instead of one per note), captured before
        // the delete so Undo can put the exact records back.
        final List<Note> rows = await database.notedao.getAllNotes();
        for (final _DeletedNote entry in pending) {
          entry.note = _noteWithTitle(rows, entry.title);
        }
        await database.notedao.deleteAllNotes();
      },
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // The single deletion pipeline
  // ───────────────────────────────────────────────────────────────────────────

  /// Runs the optimistic deletion of [entries] and offers the Undo snackbar.
  ///
  /// Callers are responsible for having already applied the optimistic UI
  /// change; the database work, the success/failure handling, the rollback and
  /// the Undo itself are delegated to the shared engine
  /// ([applyUndoableChange]), which the note edit uses too.
  Future<void> _delete(
    List<_DeletedNote> entries, {
    required String successKey,
    required String failureKey,
    required Future<void> Function(List<_DeletedNote> entries) runDatabase,
  }) async {
    // Declared before the closure so `restore` can await the in-flight delete:
    // a quick Undo press must never write a row back *before* the delete that
    // removed it has landed.
    late final UndoableChange change;

    change = UndoableChange(
      successKey: successKey,
      failureKey: failureKey,
      restore: () => _restore(entries, change),
    );

    // Only changes that can still be undone need to be tracked for [onClose];
    // dropping the settled ones keeps the list from growing over the session.
    _pendingDeletions.removeWhere((UndoableChange c) => c.settled);
    _pendingDeletions.add(change);

    await applyUndoableChange(
      change: change,
      applyDatabase: () => runDatabase(entries),
      revertUi: () => _restoreEntries(entries),
    );
  }

  /// Restores [entries] in the UI and in the database.
  ///
  /// Invoked by the shared Undo button, which already settled [change], so a
  /// double tap (or a tap after the rollback already restored the titles) can
  /// never duplicate a note.
  Future<void> _restore(List<_DeletedNote> entries, UndoableChange change) async {
    // ── Optimistic restore, immediately, before touching the database ────────
    _restoreEntries(entries);

    // Wait for the delete to finish before writing the rows back, otherwise a
    // still running delete would land *after* the restore.
    await change.committed;

    try {
      for (final _DeletedNote entry in entries) {
        final Note? note = entry.note;

        // The row was never in the database (e.g. the note disappeared on its
        // own), so there is nothing to write back.
        if (note == null) continue;

        // Same primary key as the deleted row → `replace` overwrites nothing
        // and never creates a second copy.
        await database.notedao.insertNote(note);
      }
    } catch (_) {
      showErrorSnackbar('restore_note_failed');

      // The rows really are gone: drop the restored titles and re-read the
      // database so the UI never shows a note that is not stored.
      await loadTitles();
    }
  }

  /// Puts the deleted titles back at the positions they had before.
  ///
  /// Idempotent — a title that is already in the list is skipped, so a rollback
  /// followed by a late Undo (or two Undo taps) cannot duplicate a note.
  ///
  /// Restoring per note instead of restoring one shared list snapshot is what
  /// keeps two simultaneous deletions from stepping on each other: each one
  /// only ever re-inserts its own rows.
  void _restoreEntries(List<_DeletedNote> entries) {
    for (final _DeletedNote entry in entries) {
      if (titles.contains(entry.title)) continue;
      titles.insert(entry.index.clamp(0, titles.length), entry.title);
    }
  }

  static Note? _noteWithTitle(List<Note> rows, String title) {
    for (final Note row in rows) {
      if (row.title == title) return row;
    }
    return null;
  }
}
