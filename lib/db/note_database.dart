import 'dart:async';

// `sqflite` is used by the generated `note_database.g.dart` part file, therefore
// it must be imported here (and declared as a dependency in pubspec.yaml).
import 'package:sqflite/sqflite.dart' as sqflite;

import 'package:floor/floor.dart';
import 'package:note/db/daos/note_dao.dart';

import 'entities/note.dart';

part 'note_database.g.dart';

final migration1to2 = Migration(1, 2, (database) async {
  await database.execute('ALTER TABLE notes ADD COLUMN imagePath TEXT');
});

@Database(version: 2, entities: [Note])
abstract class NoteDatabase extends FloorDatabase {
  NoteDao get notedao;
}