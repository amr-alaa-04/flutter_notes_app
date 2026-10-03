import 'package:flutter/material.dart';
import 'package:get/get.dart';

/// Placeholder rendered while the note list is empty.
///
/// The wording is intentionally identical to the one the app displayed before
/// the refactoring: it covers both "the database is still loading" and "there is
/// no note yet" without adding any new UI.
class EmptyNotesView extends StatelessWidget {
  const EmptyNotesView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(child: Text('home_loading'.tr));
  }
}