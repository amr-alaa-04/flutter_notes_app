import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' hide ByteData;
import 'package:get/get.dart';
import 'package:note/db/note_database.dart';
import 'package:note/localization/app_translations.dart';
import 'package:note/screens/home/home_page.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized(); // flutter engine
  await initDatabase();
  runApp(const MyApp());
}

/// Copies the bundled `notes.db` seed into the application documents directory.
///
/// The copy only happens once (first launch); afterwards the user database is
/// never overwritten, so no note is ever lost.
Future<void> copyDatabase() async {
  final dir = await getApplicationDocumentsDirectory();
  final path = join(dir.path, 'notes.db');

  if (File(path).existsSync()) return;

  ByteData data = await rootBundle.load(join('assets', 'database/notes.db'));
  List<int> bytes = data.buffer.asUint8List(
    data.offsetInBytes,
    data.lengthInBytes,
  );

  await File(path).writeAsBytes(bytes, flush: true);
}

late final NoteDatabase database;

Future<void> initDatabase() async {
  await copyDatabase();
  final dir = await getApplicationDocumentsDirectory();
  final path = join(dir.path, 'notes.db');
  database = await $FloorNoteDatabase.databaseBuilder(path)
      .addMigrations([migration1to2])
      .build();
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      home: const HomePage(),
      debugShowCheckedModeBanner: false,
      title: 'note',
      // Localization: English is the default language, Arabic is also shipped.
      translations: AppTranslations(),
      locale: AppTranslations.defaultLocale,
      fallbackLocale: AppTranslations.fallbackLocale,
    );
  }
}