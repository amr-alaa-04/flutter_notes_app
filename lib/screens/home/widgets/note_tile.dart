import 'package:flutter/material.dart';

/// A single row of the notes list on the home screen.
class NoteTile extends StatelessWidget {
  const NoteTile({
    super.key,
    required this.title,
    required this.onTap,
    required this.onLongPress,
  });

  final String title;

  /// Opens the note.
  final VoidCallback onTap;

  /// Opens the "delete note" confirmation.
  final VoidCallback onLongPress;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      onLongPress: onLongPress,
      title: Text(title),
      trailing: const Icon(Icons.read_more_outlined),
    );
  }
}