import 'package:floor/floor.dart';

import '../entities/note.dart';

@dao
abstract class NoteDao {
  @Query('select title from notes')
  Future<List<String>> getNotesTitle();

  @Query('select * from notes where title=:title')
  Future<Note?> getNoteFromTitle(String title);

  @Query('select * from notes')
  Future<List<Note>> getAllNotes();

  @Insert(onConflict: OnConflictStrategy.replace)
  Future<int?> insertNote(Note note);

  @delete
  Future<int> deleteNote(Note note);

  /// Removes every row from `notes` with a single statement so the delete
  /// is atomic: it either succeeds completely or leaves the table untouched
  /// (which keeps the Optimistic-UI rollback consistent).
  @Query('delete from notes')
  Future<int?> deleteAllNotes();
}