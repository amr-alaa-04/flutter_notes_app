import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:note/utils/app_colors.dart';

/// How long a change stays undoable — also the lifetime of its snackbar.
const Duration undoWindow = Duration(seconds: 5);

/// One optimistic change that can still be undone.
///
/// This is the **single** Undo mechanism of the app. Every optimistic operation
/// — a note deletion (swipe, long-press or shake) and a note edit — creates one
/// of these and hands it to [applyUndoableChange], so the snackbar, the window,
/// the "already handled" guard and the localized messages exist exactly once.
///
/// A change owns its own state ([settled], [timer], [committed]) and its own
/// [restore] closure, which is what keeps two pending Undo actions completely
/// independent: two deletions, a deletion plus an edit, or two consecutive edits
/// can never restore each other's state.
class UndoableChange {
  UndoableChange({
    required this.successKey,
    required this.restore,
    this.failureKey,
  });

  /// Snackbar title shown once the change reached the database.
  ///
  /// Must be an existing localization key (`note_deleted`, `note_updated`, …).
  final String successKey;

  /// Snackbar message shown when the database rejected the change.
  ///
  /// Parameterised keys (containing `@error`) are filled with the error.
  final String? failureKey;

  /// Reverts the change: the UI first (optimistic), then the database.
  ///
  /// Invoked at most once per change, and only while the change is unsettled.
  final Future<void> Function() restore;

  /// `true` once Undo **or** the snackbar timeout was applied. Every later
  /// attempt for this change becomes a no-op, which is what prevents a
  /// duplicated restoration and a duplicated rollback.
  bool settled = false;

  /// `true` when the database rejected the change, i.e. [UndoableChange.restore]
  /// must never run for it.
  bool failed = false;

  /// Dismisses the Undo snackbar and settles the change once the window is over.
  ///
  /// Started when the snackbar is actually **on screen**, not when the change
  /// happens: GetX queues snackbars, so with several changes in a row the second
  /// one may only appear seconds later and a window counted from the change
  /// would have expired while the action was still in front of the user.
  Timer? timer;

  /// Completes when the database part finished — either successfully or after
  /// its rollback. Undo awaits it before writing anything back, so a quick Undo
  /// press can never be overtaken by the operation it undoes.
  Future<void> committed = Future<void>.value();

  /// Marks the change as handled, so the timeout, a rollback and the Undo button
  /// can only ever fire once.
  void settle() {
    if (settled) return;
    settled = true;
    timer?.cancel();
  }
}

/// Applies [change] to the database and offers the shared Undo snackbar.
///
/// The caller is responsible for having already applied its optimistic UI
/// change; everything after that lives here exactly once:
///
/// ```text
/// optimistic UI → applyDatabase() ──► success → "… / Undo" snackbar
///                                  └► failure → settle + revertUi() + error
/// ```
///
/// [revertUi] undoes the optimistic UI change when the database rejects the
/// change (the snackbar then becomes a no-op). Returns `true` when the change
/// reached the database.
Future<bool> applyUndoableChange({
  required UndoableChange change,
  required Future<void> Function() applyDatabase,
  required void Function() revertUi,
}) async {
  await commitUndoableChange(change, applyDatabase, revertUi);

  // Only a change that reached the database is ever offered as undoable: a
  // rejected one has already been rolled back and reported, so presenting an
  // Undo action for it would be a lie the user could act on.
  if (change.failed) return false;

  showUndoSnackbar(change);

  return true;
}

/// Applies [change] to the database and rolls the UI back when it is rejected,
/// **without** presenting the Undo snackbar.
///
/// [applyUndoableChange] is exactly this function plus [showUndoSnackbar]. A
/// screen that is about to be popped uses this pair instead, because a GetX
/// snackbar is attached to the overlay of the route that is currently on top: it
/// has to be presented *after* the pop, while a failure is still reported on the
/// screen the user is looking at.
Future<void> commitUndoableChange(
  UndoableChange change,
  Future<void> Function() applyDatabase,
  void Function() revertUi,
) {
  change.committed = _commit(change, applyDatabase, revertUi);

  return change.committed;
}

/// Runs the database part of [change] and rolls the UI back on failure.
Future<void> _commit(
  UndoableChange change,
  Future<void> Function() applyDatabase,
  void Function() revertUi,
) async {
  try {
    await applyDatabase();
  } catch (error) {
    debugPrint('Optimistic change "${change.successKey}" failed: $error');

    change.failed = true;

    // Settle first: the snackbar must not be able to undo a change that never
    // reached the database.
    change.settle();
    revertUi();

    final String? failureKey = change.failureKey;
    if (failureKey != null) {
      showErrorSnackbar(failureKey, error: error);
    }
  }
}

/// Shows the shared `change / Undo` snackbar for [change].
///
/// The button restores the change at most once, whatever the user does: a
/// double tap, a tap after the snackbar was swiped away or a tap after the
/// database already rejected the change are all no-ops.
void showUndoSnackbar(UndoableChange change, {Duration? window}) {
  // A change that was rejected before the snackbar could be presented (the
  // database threw synchronously) has already been rolled back and reported;
  // showing an Undo action for it would be a lie.
  if (change.failed || change.settled) return;

  final Duration duration = window ?? undoWindow;

  Get.snackbar(
    change.successKey.tr,
    'undo_hint'.tr,
    mainButton: TextButton(
      onPressed: () {
        if (change.settled) return;

        change.settle();

        // The snackbar is on screen, so it is safe to close the current one.
        unawaited(Get.closeCurrentSnackbar());

        // Optimistic restore first (inside `restore`), database afterwards.
        unawaited(change.restore());
      },
      child: Text(
        'undo'.tr,
        style: const TextStyle(
          color: AppColors.primaryForeground,
          fontWeight: FontWeight.bold,
        ),
      ),
    ),
    // Covers every way the snackbar can leave the screen (timeout, swipe,
    // programmatic close) so the change is always settled exactly once.
    snackbarStatus: (SnackbarStatus? status) {
      if (status == SnackbarStatus.OPEN) {
        if (!change.settled && change.timer == null) {
          change.timer = Timer(duration, change.settle);
        }
      } else if (status == SnackbarStatus.CLOSED) {
        change.settle();
      }
    },
    backgroundColor: AppColors.snackbarBackground,
    colorText: AppColors.primaryForeground,
    duration: duration,
  );
}

/// Shows a localized error snackbar.
///
/// Parameterised keys (containing `@error`) receive the error text; plain keys
/// ignore it, so both kinds can share this one helper.
void showErrorSnackbar(String messageKey, {Object? error}) {
  Get.snackbar(
    'error_title'.tr,
    error == null
        ? messageKey.tr
        : messageKey.trParams(<String, String>{'error': '$error'}),
    backgroundColor: AppColors.snackbarBackground,
    colorText: AppColors.primaryForeground,
  );
}
