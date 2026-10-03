/* =========================================================================
   content.js — the documentation corpus.
   Rules honoured by every line below:
     * only behaviour that exists in the project source is described;
     * file references are real paths and every snippet is copied from them;
     * anything absent is written as "Not found in the current implementation."
   Block types are rendered by app.js: p h ul ol keys table code callout cards
   stats chips tree steps src diagram qa lessons
   ========================================================================= */
window.DOC = {
  parts: [
    { id: 'orientation', num: 'I', title: 'Orientation' },
    { id: 'architecture', num: 'II', title: 'Architecture' },
    { id: 'features', num: 'III', title: 'Features' },
    { id: 'cross', num: 'IV', title: 'Cross-cutting concerns' },
    { id: 'learning', num: 'V', title: 'Learning & assessment' }
  ],
  sections: [],
  glossary: [],
  absent: []
};

function S(s) { window.DOC.sections.push(s); }

/* ══════════════════════ PART I — ORIENTATION ══════════════════════ */

S({
  id: 'overview', num: 1, part: 'orientation',
  title: 'What this application is',
  lede: 'An offline Flutter note-taking app whose distinguishing feature is not the note list — it is that every destructive or persistent action is optimistic and undoable.',
  tags: 'overview intro offline notes flutter getx floor summary',
  blocks: [
    { t: 'stats', items: [['1.0.0+1', 'app version'], ['38', 'doc sections'], ['44', 'tests'], ['1', 'table'], ['6', 'SQL methods'], ['38', 'i18n keys']] },
    { t: 'p', v: 'The package is declared in `pubspec.yaml` as `note` with the description *"Offline note taking app with camera attachments, GPS-tagged notes, speech-to-text and shake-to-clear (Flutter + GetX + Floor)."* Everything on this site is derived from that source tree; nothing is inferred from an external tutorial or a previous version of the project.' },
    { t: 'h', v: 'The three screens' },
    { t: 'table', head: ['Screen', 'Purpose', 'Source'], rows: [
      ['HomePage', 'Lists note titles; hosts swipe-delete, long-press delete and shake-to-clear', '`lib/screens/home/home_page.dart`'],
      ['AddNotePage', 'Creates a note (title, text, dictation, photo, optional coordinates)', '`lib/screens/add_note/add_note_page.dart`'],
      ['NoteDetailsPage', 'Views one note and edits it optimistically with Undo', '`lib/screens/note_details/note_details_page.dart`']
    ] },
    { t: 'h', v: 'What makes it unusual' },
    { t: 'cards', items: [
      { tag: 'Behaviour', title: 'Optimistic everywhere', body: 'The Rx list changes in the same frame as the gesture; the database runs afterwards and a failure rolls the UI back.' },
      { tag: 'Behaviour', title: 'One Undo engine', body: 'Deletions (swipe, long-press, shake) and edits share `UndoableChange` — one window, one guard, one snackbar.' },
      { tag: 'Behaviour', title: 'Undo is a real restore', body: 'Undo re-inserts the captured row with the same primary key, so it can never create a duplicate.' },
      { tag: 'Design', title: 'One deletion pipeline', body: 'Three gestures converge on `NotesController._delete`; a bug cannot exist in one gesture but not another.' }
    ] },
    { t: 'h', v: 'Data model in one line' },
    { t: 'code', lang: 'text', file: 'lib/db/entities/note.dart', v: 'Note(id?, title, content, long?, lat?, imagePath?)   →   table "notes"   →   SQLite file in the app documents directory' },
    { t: 'callout', kind: 'absent', title: 'Not in this application', v: 'There is no account system, no cloud sync, no in-app full-text search over note bodies, no folders or tags, no note pinning/ordering, no export or import, no dark theme, no in-app language switcher, no reminders and no widget or share support. Each of these is *Not found in the current implementation.* See section 38 for the full inventory.' },
    { t: 'src', v: 'pubspec' },
    { t: 'src', v: 'main' }
  ]
});

S({
  id: 'features', num: 2, part: 'orientation',
  title: 'Feature catalogue',
  lede: 'Every user-visible capability in the app, with the widget or method that implements it.',
  tags: 'features catalogue capabilities list',
  blocks: [
    { t: 'table', head: ['Feature', 'How it behaves', 'Implemented by'], rows: [
      ['Create a note', 'A title dialog opens immediately and cannot be cancelled; the editor stays disabled until a title exists.', '`AddNotePage._showTitleDialog`, `hasTitle`'],
      ['Write content', 'Multi-line `TextField`, borderless, direction follows the speech language.', '`AddNotePage` / `NoteDetailsPage` body'],
      ['Dictate a note', 'English (`en_US`) or Arabic (`ar_EG`) recognition; recognised words are appended to the existing text.', '`SpeechController`, `SpeechControls`'],
      ['Clear dictated text', 'Stops the session and empties the content field.', '`SpeechController.clearContent`'],
      ['Attach a photo', 'Camera capture copied into the documents directory under a UUID file name.', '`ImageStorageService.captureFromCamera`, `CameraButton`'],
      ['View / zoom a photo', 'Letter-boxed preview; tap opens a full-screen viewer with pinch-zoom and pan up to 5×.', '`ImagePreviewWidget`, `ImageViewerPage`'],
      ['Delete the photo', 'The delete icon appears only while the note is editable.', '`ImagePreviewWidget.showDeleteButton`'],
      ['Tag a note with coordinates', 'Optional checkbox; the live position and its reverse-geocoded address appear immediately.', '`LocationController`, `save_location`'],
      ['Re-tag a note', 'Same checkbox on the details screen while editing; stored coordinates are kept when the box is unticked.', '`updateLocation`, `_buildLocationPreview`'],
      ['Read a note', 'One row is fetched by title; the address is resolved from the stored coordinates.', '`NoteDao.getNoteFromTitle`, `_applyStoredLocation`'],
      ['Edit a note', 'FAB toggles edit mode; saving is optimistic and reopens edit mode on failure.', '`_toggleEditing`, `_saveNote`'],
      ['Delete one note', 'Swipe left, or long-press → confirmation snackbar. Both are optimistic and undoable.', '`deleteNoteByTitle`'],
      ['Delete everything', 'Shake the phone: the list empties on the same frame, no confirmation dialog, undoable.', '`clearAllNotes`, `ShakeService`'],
      ['Undo any change', '5-second window, one button, works for deletions and edits alike.', '`UndoableChange`, `showUndoSnackbar`'],
      ['Read the UI in Arabic', 'Every user-visible string is translated (38 keys, two locales).', '`AppTranslations`'],
      ['Empty state', 'A single placeholder covers both “loading” and “no notes yet”.', '`EmptyNotesView`']
    ] },
    { t: 'callout', kind: 'info', title: 'One feature, two report styles', v: 'Location is fetched by the same controller but reports differently: `reportWithSnackBar: false` renders the inline loading/error/retry row used by add-note, `true` raises snackbars as the details screen does.' },
    { t: 'src', v: 'notes-controller' },
    { t: 'src', v: 'speech-controller' },
    { t: 'src', v: 'image-storage' }
  ]
});

S({
  id: 'tech-stack', num: 3, part: 'orientation',
  title: 'Technology choices',
  lede: 'Why this stack: state management, persistence and the five device integrations the app relies on.',
  tags: 'stack flutter getx floor sqflite plugins',
  blocks: [
    { t: 'keys', v: [
      ['Flutter + Dart', 'UI toolkit. `environment.sdk: ^3.12.2`, `version: 1.0.0+1`.'],
      ['GetX (`get: ^4.7.3`)', 'Reactive state (`Rx`, `Obx`), dependency injection with tags, routing (`Get.to` / `Get.back`), snackbars and translations.'],
      ['Floor (`floor: ^1.5.0`)', 'Type-safe SQLite wrapper: the `@Entity` / `@dao` / `@Query` annotations generate `note_database.g.dart`.'],
      ['sqflite (`^2.4.2`)', 'The native SQLite handle Floor runs on. Imported by `note_database.dart` so the generated part file can use it.'],
      ['build_runner + floor_generator', 'Code generation for the database layer (`dev_dependencies`).'],
      ['geolocator (`^14.1.1`)', 'Location service check, permission handling and `getCurrentPosition`.'],
      ['geocoding (`^4.0.0`)', '`placemarkFromCoordinates` — turns coordinates into the address shown under the note.'],
      ['image_picker (`^1.1.2`)', 'Opens the camera and returns an `XFile`.'],
      ['speech_to_text (`^7.3.0`)', 'Microphone permission, `initialize`, `listen` / `stop`, recognised words.'],
      ['shake (`^3.0.0`)', 'Accelerometer-based shake detection.'],
      ['path_provider (`^2.1.6`)', '`getApplicationDocumentsDirectory` for the database and the photos.'],
      ['path (`^1.9.1`)', 'Joins path segments portably in `main.dart` and `ImageStorageService`.'],
      ['uuid (`^4.5.1`)', 'Generates the unique file name for every captured photo.'],
      ['flutter_lints (`^6.0.0`)', 'The only linter configuration (`analysis_options.yaml`); no custom rules.']
    ] },
    { t: 'h', v: 'The two decisions that shape the code' },
    { t: 'steps', items: [
      { title: 'Reactivity instead of setState', body: 'Every collaborator (`NotesController`, `SpeechController`, `LocationController`) exposes `Rx` values, so the UI reacts to the smallest change — `SpeechControls` wraps only itself in one `Obx`.' },
      { title: 'Annotated SQL instead of raw strings', body: 'The DAO is the only place that knows SQL. Controllers and screens never build a query, which is why the tests can swap the whole database for a `Map`.' }
    ] },
    { t: 'src', v: 'pubspec' },
    { t: 'src', v: 'note-dao' }
  ]
});

S({
  id: 'dependencies', num: 4, part: 'orientation',
  title: 'Dependency inventory',
  lede: 'Every declared package, its constraint and the single place in the code that imports it.',
  tags: 'dependencies packages versions pubspec imports',
  blocks: [
    { t: 'h', v: 'Runtime dependencies' },
    { t: 'table', head: ['Package', 'Constraint', 'Imported by'], rows: [
      ['`cupertino_icons`', '`^1.0.8`', 'not imported by any Dart file in `lib/`'],
      ['`floor`', '`^1.5.0`', '`note.dart`, `note_dao.dart`, `note_database.dart`'],
      ['`get`', '`^4.7.3`', '`main.dart`, all three controllers, all screens, `undoable_change.dart`, `image_viewer.dart`, `empty_notes_view.dart`, `speech_controls.dart`, `title_input_dialog.dart`, `app_translations.dart`'],
      ['`path`', '`^1.9.1`', '`main.dart` (`join`), `image_storage_service.dart` (`p.join`)'],
      ['`path_provider`', '`^2.1.6`', '`main.dart`, `image_storage_service.dart`'],
      ['`geolocator`', '`^14.1.1`', '`location_controller.dart`'],
      ['`geocoding`', '`^4.0.0`', '`location_controller.dart`'],
      ['`speech_to_text`', '`^7.3.0`', '`speech_controller.dart`'],
      ['`image_picker`', '`^1.1.2`', '`image_storage_service.dart`'],
      ['`uuid`', '`^4.5.1`', '`image_storage_service.dart`'],
      ['`shake`', '`^3.0.0`', 'Imported via `shake/shake.dart` by `home_page.dart` and `shake_service.dart`'],
      ['`sqflite`', '`^2.4.2`', '`note_database.dart` (aliased, for the generated part file)']
    ] },
    { t: 'h', v: 'Development dependencies' },
    { t: 'table', head: ['Package', 'Constraint', 'Role'], rows: [
      ['`flutter_test`', 'sdk', 'The only test dependency; every test lives in `test/widget_test.dart`.'],
      ['`flutter_lints`', '`^6.0.0`', 'Lints activated through `analysis_options.yaml`.'],
      ['`floor_generator`', '`^1.5.0`', 'Generates `note_database.g.dart`.'],
      ['`build_runner`', '`^2.4.13`', 'Drives `floor_generator`.']
    ] },
    { t: 'h', v: 'Asset and design declarations' },
    { t: 'ul', v: [
      '`flutter.uses-material-design: true` — the Material icon font.',
      '`flutter.assets: [assets/database/]` — the seed SQLite file loaded by `copyDatabase()`.',
      'No custom fonts are declared.'
    ] },
    { t: 'callout', kind: 'info', title: 'Regeneration', v: 'After changing `Note`, `NoteDao` or the `@Database` version, `note_database.g.dart` must be regenerated with `build_runner` — the file starts with `GENERATED CODE - DO NOT MODIFY BY HAND`.' },
    { t: 'src', v: 'pubspec' },
    { t: 'src', v: 'note-database-g' }
  ]
});

S({
  id: 'structure', num: 5, part: 'orientation',
  title: 'Project structure',
  lede: 'Twenty-four Dart files in `lib/`, one test file, three screens, three controllers, two services, six widgets.',
  tags: 'structure folders files tree layout',
  blocks: [
    { t: 'tree', v: [
      '<span class="dir">lib/</span>',
      '  <span class="dir">main.dart</span>                     <span class="hl">// bootstrap + GetMaterialApp</span>',
      '  <span class="dir">controllers/</span>',
      '    notes_controller.dart      <span class="hl">// titles + optimistic deletion + Undo</span>',
      '    location_controller.dart   <span class="hl">// geolocator + geocoding</span>',
      '    speech_controller.dart     <span class="hl">// speech_to_text</span>',
      '  <span class="dir">db/</span>',
      '    note_database.dart         <span class="hl">// @Database(version: 2) + migration1to2</span>',
      '    note_database.g.dart       <span class="hl">// generated — do not edit</span>',
      '    daos/note_dao.dart         <span class="hl">// 6 SQL methods</span>',
      '    entities/note.dart         <span class="hl">// @Entity(tableName: notes)</span>',
      '  <span class="dir">localization/</span>',
      '    app_translations.dart      <span class="hl">// en_US + ar_EG, 38 keys</span>',
      '  <span class="dir">screens/</span>',
      '    home/home_page.dart',
      '    home/widgets/note_tile.dart',
      '    home/widgets/empty_notes_view.dart',
      '    add_note/add_note_page.dart',
      '    note_details/note_details_page.dart',
      '  <span class="dir">services/</span>',
      '    image_storage_service.dart',
      '    shake_service.dart',
      '  <span class="dir">utils/</span>',
      '    app_colors.dart            <span class="hl">// 10 colour constants</span>',
      '    undoable_change.dart       <span class="hl">// the single Undo engine</span>',
      '  <span class="dir">widgets/</span>',
      '    camera_button.dart   image_preview_widget.dart   image_viewer.dart',
      '    location_row.dart    speech_controls.dart       title_input_dialog.dart',
      '<span class="dir">test/</span>',
      '  widget_test.dart             <span class="hl">// 10 groups / 44 tests</span>',
      '<span class="dir">assets/</span>',
      '  database/notes.db            <span class="hl">// 16 KB seed schema</span>',
      '<span class="dir">android/</span>  app/src/main/AndroidManifest.xml, app/build.gradle.kts',
      '<span class="dir">ios/</span>      Runner/Info.plist (no usage descriptions — see section 7)',
      '<span class="dir">web/</span>      default Flutter web placeholder'
    ].join('\n') },
    { t: 'h', v: 'Naming conventions actually used' },
    { t: 'ul', v: [
      'Screens are `*_page.dart` and hold private `State` classes (`_AddNotePageState`).',
      'Reusable UI is one public class per file under `lib/widgets/` or `screens/home/widgets/`.',
      'A service or helper is one top-level class per file; `AppColors` is the only one with a private constructor (`AppColors._()`).',
      'The one private helper class is `_TitleInputDialog` inside `title_input_dialog.dart`, plus `_DeletedNote` inside `notes_controller.dart`.',
      'Documents never appear in `lib/`; a `README.md` exists but its content is not part of the source of truth for this documentation.'
    ] },
    { t: 'src', v: 'main' }
  ]
});

S({
  id: 'workflow', num: 6, part: 'orientation',
  title: 'Run, analyse, test, build',
  lede: 'The exact commands used while producing this documentation, and what they prove.',
  tags: 'run build test analyze commands cli verification',
  blocks: [
    { t: 'code', lang: 'shell', file: 'terminal', v: [
      'flutter pub get',
      'flutter analyze          # static analysis + lints',
      'flutter test             # widget / unit tests',
      'flutter run              # debug on a connected device',
      'flutter build bundle     # asset + kernel bundle, no platform toolchain needed'
    ].join('\n') },
    { t: 'h', v: 'Verification recorded for this codebase' },
    { t: 'table', head: ['Command', 'Result'], rows: [
      ['`flutter analyze`', '`No issues found!`'],
      ['`flutter test`', '`00:06 +44: All tests passed!`'],
      ['`flutter build bundle`', 'exit code `0`']
    ] },
    { t: 'callout', kind: 'warn', title: 'What those results do not cover', v: 'A widget test process has no accelerometer, camera, microphone, GPS hardware or real speech recogniser. The camera, dictation, GPS accuracy, shake sensitivity and Arabic speech were therefore not verified by automated tests, and `build bundle` does not compile the Android, iOS or web targets.' },
    { t: 'h', v: 'Regenerating the database' },
    { t: 'code', lang: 'shell', file: 'terminal', v: 'dart run build_runner build --delete-conflicting-outputs' },
    { t: 'src', v: 'note-database-g' }
  ]
});

S({
  id: 'platform', num: 7, part: 'orientation',
  title: 'Platform configuration and permissions',
  lede: 'What each platform declares — including two configuration gaps that matter if the app is built for those targets.',
  tags: 'android ios web permissions manifest gradle configuration',
  blocks: [
    { t: 'h', v: 'Android' },
    { t: 'src', v: 'manifest' },
    { t: 'keys', v: [
      ['`ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`', 'Required by `geolocator` for the location checkbox.'],
      ['`RECORD_AUDIO`', 'Required by `speech_to_text` for dictation.'],
      ['`INTERNET`', 'Declared, although the app itself performs no network request.'],
      ['`android.speech.RecognitionService` (`<queries>`)', 'Lets the app see whether a speech recogniser exists.'],
      ['`android.intent.action.PROCESS_TEXT`, `VIEW https`, `VIEW geo` (`<queries>`)', 'Standard Flutter template entries.']
    ] },
    { t: 'p', v: 'The launcher activity is `.MainActivity`, a plain `FlutterActivity` subclass at `android/app/src/main/kotlin/com/amralaa/note/note/MainActivity.kt`. There is **no** `android.permission.CAMERA` entry in the manifest; `image_picker` therefore relies on the camera activity intent rather than a declared camera permission.' },
    { t: 'src', v: 'gradle' },
    { t: 'callout', kind: 'warn', title: 'Release signing is not configured', v: '`android/app/build.gradle.kts` still signs the release build with the debug keys (`signingConfig = signingConfigs.getByName("debug")`) and keeps the generated `applicationId` `com.amralaa.note.note`. Both are marked `TODO` in the file.' },
    { t: 'h', v: 'iOS' },
    { t: 'p', v: 'An `ios/` folder exists with the default Flutter `Runner` project, but `ios/Runner/Info.plist` contains **no** `NSMicrophoneUsageDescription` and **no** location usage descriptions. On a real iOS build the dictation and location features would be rejected by the system. Adding those keys is *Not found in the current implementation.*' },
    { t: 'h', v: 'Web' },
    { t: 'p', v: 'A `web/` folder exists with the unmodified Flutter web template (the description meta tag still reads `A new Flutter project.`). The plugins this app uses (camera, speech, GPS, accelerometer) have no web implementation configured here, so a web build was neither attempted nor verified.' },
    { t: 'src', v: 'manifest' },
    { t: 'src', v: 'gradle' }
  ]
});

/* ══════════════════════ PART II — ARCHITECTURE ══════════════════════ */

S({
  id: 'bootstrap', num: 8, part: 'architecture',
  title: 'Bootstrap: from cold start to first frame',
  lede: 'Four steps, all of them in `lib/main.dart`, before any widget is built.',
  tags: 'main bootstrap startup database asset migration runapp',
  blocks: [
    { t: 'diagram', id: 'bootstrap' },
    { t: 'p', v: '`main()` calls `WidgetsFlutterBinding.ensureInitialized()` first because both `copyDatabase()` (asset bundle) and Floor (platform channels) need the binding to exist. `runApp` happens after the database is open, so no screen can ever query a database that is not ready.' },
    { t: 'h', v: 'The seed database' },
    { t: 'p', v: '`copyDatabase()` reads `assets/database/notes.db` through `rootBundle`, converts the `ByteData` to a `List<int>` and writes it to `<documents>/notes.db` with `flush: true`. It returns immediately when the file already exists — the copy is a first-launch operation only, so reinstalling the app never overwrites a user database that is already on disk.' },
    { t: 'h', v: 'The global database handle' },
    { t: 'p', v: '`late final NoteDatabase database;` is a top-level global. `initDatabase()` assigns it once, and every controller, screen and test reads that same instance. Tests exploit this by assigning a fake before the first test runs, which is why no production code contains a test-only branch.' },
    { t: 'callout', kind: 'info', title: 'Why a global instead of GetX injection', v: 'The database is created before the widget tree exists, and it must be available to plain `State` objects and to tests. `GetMaterialApp.initialBinding` is not used anywhere in this project.' },
    { t: 'src', v: 'main' }
  ]
});

S({
  id: 'layers', num: 9, part: 'architecture',
  title: 'Layer map',
  lede: 'Screens own no device logic, controllers own no SQL, and the DAO knows nothing about widgets.',
  tags: 'layers architecture separation responsibilities',
  blocks: [
    { t: 'diagram', id: 'layers' },
    { t: 'h', v: 'The dependency rule' },
    { t: 'p', v: 'Imports always point downwards: a screen may import a controller, a service or a widget; a controller may import the DAO and other controllers’ concerns; the DAO imports only `floor` and the entity. No file in `lib/widgets/` imports a screen, and no controller imports a widget.' },
    { t: 'table', head: ['Layer', 'Files', 'May depend on'], rows: [
      ['Screens', '`home_page`, `add_note_page`, `note_details_page`, `home/widgets/*`', 'controllers, services, widgets, `main.dart` (for `database`), `db/entities/note.dart`'],
      ['Widgets', '`camera_button`, `image_preview_widget`, `image_viewer`, `location_row`, `speech_controls`, `title_input_dialog`', 'one controller or `File`, `AppColors`, `AppTranslations`'],
      ['Controllers', '`notes_controller`, `location_controller`, `speech_controller`', 'plugins, `db/daos/note_dao.dart` (through the global `database`), `utils/undoable_change.dart`'],
      ['Services', '`image_storage_service`, `shake_service`', 'plugins only'],
      ['Data', '`note.dart`, `note_dao.dart`, `note_database.dart`(+generated)', '`floor`, `sqflite`']
    ] },
    { t: 'h', v: 'Where state lives' },
    { t: 'p', v: '`HomePage` holds no note state (the controller does). `AddNotePage` and `NoteDetailsPage` are the two screens that keep their own `Rx` fields because they describe *form* state — title, hasTitle, hasImage, update/save-location flags, editing flag, loaded note — while everything device-related lives in a controller.' },
    { t: 'src', v: 'notes-controller' },
    { t: 'src', v: 'image-preview' }
  ]
});

S({
  id: 'note-entity', num: 10, part: 'architecture',
  title: 'The Note entity and the table',
  lede: 'Six fields, one auto-generated primary key, three nullable columns.',
  tags: 'entity model schema notes table fields primarykey',
  blocks: [
    { t: 'src', v: 'note' },
    { t: 'table', head: ['Column', 'Dart type', 'Null?', 'Meaning'], rows: [
      ['`id`', '`int?`', 'nullable in Dart', '`@PrimaryKey(autoGenerate: true)` — SQLite assigns it on insert; it is echoed back on update so a note keeps its identity.'],
      ['`title`', '`String`', 'no', 'Required, and the app-wide identity: list key, `Get.arguments`, DAO lookup key.'],
      ['`content`', '`String`', 'no', 'The note body; may be an empty string.'],
      ['`long`', '`double?`', 'yes', 'Longitude, stored only when the location checkbox is on.'],
      ['`lat`', '`double?`', 'yes', 'Latitude, stored under the same condition.'],
      ['`imagePath`', '`String?`', 'yes', 'Absolute path of the copied photo; added by `migration1to2`.']
    ] },
    { t: 'callout', kind: 'info', title: 'Why the entity is immutable', v: 'All six fields are `final` and the constructor is not `const`. A change therefore always means a *new* `Note` instance — which is exactly what makes “snapshot the previous version for Undo” a one-liner instead of a diff.' },
    { t: 'h', v: 'Identity: title vs id' },
    { t: 'p', v: 'The UI treats the **title** as the identity (it is the `Dismissible` key, the route argument and the lookup key), while the database treats the **id** as the identity (`@Insert(onConflict: OnConflictStrategy.replace)` is keyed on the primary key). Both are needed: renaming a note must move the row rather than copy it, and Undo must re-insert the row that existed before.' },
    { t: 'callout', kind: 'warn', title: 'Consequence of title-as-identity', v: 'Two notes with the same title are indistinguishable to the list, the swipe key and `getNoteFromTitle`. The code does not enforce unique titles anywhere.' }
  ]
});

S({
  id: 'note-dao', num: 11, part: 'architecture',
  title: 'NoteDao — the complete persistence surface',
  lede: 'Six methods. Every read and write in the app goes through one of them.',
  tags: 'dao sql queries select insert delete',
  blocks: [
    { t: 'src', v: 'note-dao' },
    { t: 'table', head: ['Method', 'SQL', 'Used by'], rows: [
      ['`getNotesTitle()`', '`select title from notes`', '`NotesController.loadTitles` — the home list'],
      ['`getNoteFromTitle(title)`', '`select * from notes where title=:title`', '`NoteDetailsPage._loadNote`, and the row capture before a single delete'],
      ['`getAllNotes()`', '`select * from notes`', '`clearAllNotes` — one query instead of one per note'],
      ['`insertNote(note)`', '`@Insert(onConflict: OnConflictStrategy.replace)`', 'create, edit, undo-restore of a deletion and undo-restore of an edit'],
      ['`deleteNote(note)`', '`@delete`', 'single-note deletion, and undo of an edit when the note did not exist before'],
      ['`deleteAllNotes()`', '`delete from notes`', 'shake-to-clear']
    ] },
    { t: 'h', v: 'Three decisions worth knowing' },
    { t: 'steps', items: [
      { title: 'The list query returns strings', body: '`select title from notes` means the home screen never loads an image path or coordinates for rows it is not showing.' },
      { title: 'Clear-all is one statement', body: '`delete from notes` is atomic, so the optimistic rollback stays consistent: either every row is gone or the table is untouched.' },
      { title: 'Every write is a replace-insert', body: 'Because `insertNote` is used for creation, editing and both Undo paths, the “restore” of a deletion cannot create a second row — as long as the restored `Note` carries the original `id`.' }
    ] },
    { t: 'callout', kind: 'info', title: 'No ORDER BY', v: 'None of the queries specify an ordering, so the list order is whatever SQLite returns. The Undo path does not rely on it: it restores each title at the index it occupied before.' }
  ]
});

S({
  id: 'database', num: 12, part: 'architecture',
  title: 'Database construction, migration and the generated code',
  lede: 'Version 2, one migration, one `part` file — and the reason `sqflite` is imported by hand.',
  tags: 'floor migration version 1to2 generated sqflite seed',
  blocks: [
    { t: 'src', v: 'note-database' },
    { t: 'p', v: '`note_database.dart` imports `package:sqflite/sqflite.dart` *as `sqflite`* purely so the generated part file can reference it. The comment in the source states this explicitly. Removing the import breaks the generated code even though the app code never calls sqflite directly.' },
    { t: 'h', v: 'The migration' },
    { t: 'code', lang: 'sql', file: 'lib/db/note_database.dart', v: 'ALTER TABLE notes ADD COLUMN imagePath TEXT' },
    { t: 'p', v: '`migration1to2` is registered in `initDatabase()` via `.addMigrations([migration1to2])`. Because the seed database ships an `imagePath`-less schema, every existing install receives the column the first time the new build opens the file. `main()` passes a file path, not `inMemoryDatabaseBuilder()`, so this is the production path.' },
    { t: 'h', v: 'The generated file' },
    { t: 'src', v: 'note-database-g' },
    { t: 'keys', v: [
      ['`$FloorNoteDatabase.databaseBuilder(path)`', 'Builds the typed accessor used by `initDatabase()`.'],
      ['`inMemoryDatabaseBuilder()`', 'Present in the generated code, never called by this app.'],
      ['`part of \'note_database.dart\'`', 'The generated file is a part, not a standalone library — its classes are only visible through `note_database.dart`.']
    ] },
    { t: 'callout', kind: 'info', title: 'Seed asset', v: '`assets/database/notes.db` is a 16 KB SQLite file declared in `pubspec.yaml`. It contains the schema; whether it contains rows is decided by that file, and the application code never inspects it beyond copying it on first launch.' }
  ]
});

S({
  id: 'getx', num: 13, part: 'architecture',
  title: 'Reactive state with GetX',
  lede: 'Four Rx variables, one Rx list, and small `Obx` scopes that rebuild exactly what changed.',
  tags: 'getx reactive rx obx state observable',
  blocks: [
    { t: 'table', head: ['Observable', 'Owner', 'Type', 'Read by'], rows: [
      ['`titles`', '`NotesController`', '`RxList<String>`', 'the whole home body'],
      ['`note`', '`NoteDetailsPage` (screen state)', '`Rxn<Note>`', 'details body, app bar, image, location'],
      ['`isEditing`, `title`, `hasTitle`, `updateLocation`, `locationName`', '`NoteDetailsPage`', '`RxBool` / `RxString`', 'FAB icon, app bar, checkbox, image delete button'],
      ['`title`, `hasTitle`, `saveLocation`', '`AddNotePage`', '`RxString` / `RxBool`', 'app bar, editor, speech block, checkbox'],
      ['`isEnabled`, `isInitializing`, `isListening`, `statusText`, `selectedLocale`', '`SpeechController`', '`RxBool` / `RxString`', '`SpeechControls` (single `Obx`), content field direction'],
      ['`isLoading`, `locationName`, `locationError`', '`LocationController`', '`RxBool` / `RxString`', 'location preview rows, checkbox flow']
    ] },
    { t: 'h', v: 'Scope discipline' },
    { t: 'p', v: 'The app keeps each `Obx` as small as the state it depends on. `SpeechControls` rebuilds only itself; the note body is rebuilt by the surrounding `Obx` in `NoteDetailsPage` because the FAB, editor and image all depend on `isEditing`/`note`. This is why toggling the speech language does not re-lay-out the whole page.' },
    { t: 'callout', kind: 'good', title: 'Non-reactive state is deliberate', v: '`LocationController.position` is a plain field, not an `Rx`. It is read only while a note is saved, so it stays out of every `Obx` dependency and cannot cause a rebuild at the wrong moment.' },
    { t: 'h', v: 'Reading a value without subscribing' },
    { t: 'p', v: 'Two places deliberately read an `Rx` outside of a widget: `AddNotePage` reads `_speech.isArabic` when computing text direction and the camera label, and `NoteDetailsPage` does the same for the content field. Both are inside an `Obx` that already depends on the speech state, so the rebuild is already scheduled.' }
  ]
});

S({
  id: 'navigation', num: 14, part: 'architecture',
  title: 'Navigation and route arguments',
  lede: 'Three routes, two transitions, and a list refresh after every return.',
  tags: 'navigation routing get.to get.back arguments transitions',
  blocks: [
    { t: 'diagram', id: 'navigation' },
    { t: 'table', head: ['From', 'Call', 'Transition', 'Argument'], rows: [
      ['`main()`', '`GetMaterialApp(home: HomePage())`', '—', '—'],
      ['`HomePage`', '`Get.to(() => const AddNotePage())`', '`Transition.leftToRight`', 'none'],
      ['`HomePage`', '`Get.to(() => const NoteDetailsPage(), arguments: noteTitle)`', '`Transition.leftToRight`', 'the note **title**'],
      ['add / details', '`ImageViewerPage.open(file)` → `Get.to(...)`', '`Transition.rightToLeft`', 'a `File` captured by the widget'],
      ['`AddNotePage`', '`Get.back<void>()` after a successful insert', 'default', '—'],
      ['`NoteDetailsPage`', '`Get.back<void>()` after a successful save, before the Undo snackbar', 'default', '—']
    ] },
    { t: 'h', v: 'The list is re-read after every round trip' },
    { t: 'p', v: 'Both `_openAddNote` and `_openNoteDetails` `await` the navigation and then call `_notes.loadTitles()`. The details screen additionally calls `Get.find<NotesController>().loadTitles()` itself (`_refreshHomeTitles`) when an Undo changes the stored title, guarded by `Get.isRegistered<NotesController>()` so the screen still works when it is pumped stand-alone in a test.' },
    { t: 'callout', kind: 'good', title: 'Why only the title crosses the boundary', v: 'Passing the whole `Note` would keep a stale copy alive in the route argument. Passing the title and re-reading the row means the screen always hydrates from what is actually stored.' },
    { t: 'src', v: 'home-page' },
    { t: 'src', v: 'details-save' }
  ]
});

S({
  id: 'di-lifecycle', num: 15, part: 'architecture',
  title: 'Controller registration and lifetime',
  lede: 'One untagged controller, four tagged instances — and every one of them deleted in `dispose()`.',
  tags: 'dependency injection get.put tag delete lifecycle dispose',
  blocks: [
    { t: 'table', head: ['Instance', 'Registered in', 'Tag', 'Removed in'], rows: [
      ['`NotesController`', '`HomePage.initState`', 'none', '`HomePage.dispose`'],
      ['`SpeechController`', '`AddNotePage.initState` (`initialLocale: SpeechController.arabicLocale`)', '`add_note_speech`', '`AddNotePage.dispose`'],
      ['`LocationController`', '`AddNotePage.initState`', '`add_note_location`', '`AddNotePage.dispose`'],
      ['`SpeechController`', '`NoteDetailsPage.initState` (default `en_US`)', '`note_details_speech`', '`NoteDetailsPage.dispose`'],
      ['`LocationController`', '`NoteDetailsPage.initState`', '`note_details_location`', '`NoteDetailsPage.dispose`']
    ] },
    { t: 'h', v: 'Why tags are needed' },
    { t: 'p', v: 'Both note screens need a microphone session and a location controller at the same time. GetX keys controllers by type, so registering a second untagged instance would return the first one and the two screens would share state — including a live speech session. The tags are constants on the widgets (`AddNotePage.speechTag`, etc.), so the registration and the deletion cannot drift apart.' },
    { t: 'callout', kind: 'info', title: 'The two speech defaults differ on purpose', v: 'Add-note starts with `ar_EG`, the details screen with `en_US`. Each screen therefore opens with the recognition language it has always used, and the dropdown switches it per screen instance.' },
    { t: 'h', v: 'Side effects started in initState' },
    { t: 'code', lang: 'dart', file: 'lib/screens/note_details/note_details_page.dart', at: 75, v: [
      '_speech.initialize();',
      '_loadNote();',
      '_location.fetchCurrentLocation(reportWithSnackBar: true);'
    ].join('\n') },
    { t: 'p', v: 'The details screen asks for the current position on open so that ticking “Update location” can be instantaneous later. `_loadNote` runs in parallel and hydrates the note plus its stored address; if the note has no coordinates, `_applyStoredLocation` clears the address instead of resolving anything.' }
  ]
});

S({
  id: 'ui-composition', num: 16, part: 'architecture',
  title: 'Widget composition and rebuild boundaries',
  lede: 'Which widget owns which pixels, and what a rebuild costs.',
  tags: 'widgets composition rebuild obx layout',
  blocks: [
    { t: 'table', head: ['Widget', 'Owner', 'Children', 'Purpose'], rows: [
      ['`NoteTile`', '`HomePage`', '`ListTile`', 'One row: title, read-more icon, tap and long-press callbacks.'],
      ['`EmptyNotesView`', '`HomePage`', '`Center` + `Text`', 'Placeholder for an empty (or still loading) list.'],
      ['`CameraButton`', 'add + details', '`ElevatedButton.icon`', 'Teal “Take Photo” button; label follows the speech language.'],
      ['`ImagePreviewWidget`', 'add + details', '`Stack` of `ClipRRect` + `IconButton`', 'Letter-boxed thumbnail with an optional delete button.'],
      ['`ImageViewerPage`', 'add + details', '`Scaffold` + `InteractiveViewer`', 'Full-screen zoomable picture.'],
      ['`LocationRow`', 'add + details', '`Row` of icon + text', 'Resolved address.'],
      ['`SpeechControls`', 'add + details', 'one `Obx` `Column`', 'Language dropdown, permission/listen button, clear button, status.'],
      ['`showTitleInputDialog`', 'add + details', '`AlertDialog`', 'Mandatory title entry; cancellable only on the details screen.']
    ] },
    { t: 'h', v: 'The share-and-reuse pattern' },
    { t: 'p', v: 'Six widgets are used by both note screens. Each one takes either a plain value (`File`, `String`, `bool`) or a controller instance — never a whole screen — which is what keeps them testable in isolation: the image, speech and title widgets are all covered by tests that do not build a page.' },
    { t: 'callout', kind: 'good', title: 'Where duplication was removed', v: 'The location preview markup, the speech controls, the title dialog and the image widgets each used to exist twice. The current code has one implementation of each; the only intentional duplication left is the small `_buildLocationPreview()` in the two screens, which differs in its padding constant and in which controller flag gates it.' }
  ]
});

/* ══════════════════════ PART III — FEATURES ══════════════════════ */

S({
  id: 'home', num: 17, part: 'features',
  title: 'Home screen: the note list',
  lede: 'Titles only, rebuilt from one Rx list, with two destructive gestures.',
  tags: 'home screen list titles dismissible swipe shake empty view',
  blocks: [
    { t: 'src', v: 'home-list' },
    { t: 'h', v: 'Rendering' },
    { t: 'ul', v: [
      '`Obx` watches `NotesController.titles`; an empty list renders `EmptyNotesView` instead of the list.',
      '`ListView.builder` creates rows lazily and never asks the database for anything but titles.',
      'Each row is wrapped in `Dismissible` with `key: ValueKey<String>(noteTitle)` and `direction: DismissDirection.endToStart`; the red delete background is built once per build in `_buildSwipeBackground`.',
      'Tap opens the details screen, long-press opens the confirmation snackbar.'
    ] },
    { t: 'h', v: 'Lifecycle' },
    { t: 'p', v: '`initState` puts the `NotesController` (which calls `loadTitles()` from its own `onInit`) and starts the accelerometer through `ShakeService.start`. `dispose` stops the shake listener and deletes the controller, so leaving the screen removes both the sensor subscription and the reactive state.' },
    { t: 'callout', kind: 'info', title: 'The loading placeholder is shared', v: '`EmptyNotesView` renders the `home_loading` string. The source comment states that this one widget intentionally covers both “the database is still loading” and “there is no note yet”, because no separate loading state exists.' },
    { t: 'callout', kind: 'absent', title: 'Not implemented', v: 'There is no search field, no sort control, no pinning, no grouping and no pagination on this screen.' }
  ]
});

S({
  id: 'delete-gestures', num: 18, part: 'features',
  title: 'Deleting one note: swipe and long-press',
  lede: 'Two gestures, one pipeline, and a deletion that is undone by re-inserting the captured row.',
  tags: 'delete swipe dismissible long press confirmation snackbar undo rollback',
  blocks: [
    { t: 'diagram', id: 'optimistic-delete' },
    { t: 'h', v: 'Swipe' },
    { t: 'p', v: '`Dismissible.onDismissed` calls `deleteNoteByTitle(title)`. The method first looks the title up with `titles.indexOf`; a title that is already gone returns immediately, which makes a double swipe or two racing gestures harmless. `titles.removeAt(index)` runs before the first `await`, so the frame that removes the tile already contains the updated list.' },
    { t: 'h', v: 'Long press' },
    { t: 'p', v: 'A long press raises a confirmation snackbar with a “Delete” main button. The button closes the snackbar *first* and only then starts the deletion — the reverse order would dismiss the “Note deleted / Undo” snackbar that the deletion itself opens. The confirmation uses a 5-second duration and `AppColors.danger` for the action text.' },
    { t: 'h', v: 'What the database sees' },
    { t: 'code', lang: 'dart', file: 'lib/controllers/notes_controller.dart', at: 89, v: [
      'runDatabase: (List<_DeletedNote> pending) async {',
      '  final Note? note =',
      '      await database.notedao.getNoteFromTitle(pending.first.title);',
      '  if (note == null) return;',
      '  pending.first.note = note;',
      '  await database.notedao.deleteNote(note);',
      '},'
    ].join('\n') },
    { t: 'p', v: 'The row is read *before* the delete, so `_DeletedNote.note` holds the exact record — same `id`, same image path — and Undo has something faithful to write back. If the row no longer exists, nothing is deleted and nothing is restored.' },
    { t: 'callout', kind: 'good', title: 'Idempotent restore', v: '`_restoreEntries` skips a title that is already in the list and clamps the index to the current length, so a rollback followed by a late Undo (or two Undo taps) cannot duplicate or crash.' }
  ]
});

S({
  id: 'shake', num: 19, part: 'features',
  title: 'Shake to clear every note',
  lede: 'No dialog, no count, no “are you sure”: the list empties on the same frame and the Undo snackbar is the safety net.',
  tags: 'shake accelerometer clear all delete debounce cooldown',
  blocks: [
    { t: 'src', v: 'shake-service' },
    { t: 'h', v: 'From sensor to pipeline' },
    { t: 'code', lang: 'dart', file: 'lib/screens/home/home_page.dart', at: 38, v: [
      '_shakeService.start((ShakeEvent _) => _onPhoneShake());',
      '...',
      'void _onPhoneShake() {',
      '  unawaited(_notes.clearAllNotes());',
      '}',
      '',
      '/// Runs the exact shake callback the accelerometer would call.',
      '@visibleForTesting',
      'void debugTriggerShake() => _onPhoneShake();'
    ].join('\n') },
    { t: 'h', v: 'Two independent guards' },
    { t: 'ul', v: [
      '`ShakeService.shouldHandle` rejects any event within `cooldown` (3 s) of the last accepted one, so the burst of events a single physical shake produces cannot start a second deletion.',
      '`clearAllNotes()` empties `titles` synchronously and returns immediately when the list is already empty, so a later event has nothing left to delete.'
    ] },
    { t: 'p', v: 'Because both guards exist, the shake handler needs no re-entrancy flag — the source comment says so explicitly. `debugTriggerShake` is annotated `@visibleForTesting` and is what the widget tests call instead of a real accelerometer.' },
    { t: 'h', v: 'Clear-all versus single delete' },
    { t: 'table', head: ['', 'Single delete', 'Shake / clear-all'], rows: [
      ['Titles captured', 'one `_DeletedNote`', 'one per note, with its index'],
      ['Rows read before deleting', '`getNoteFromTitle`', '`getAllNotes` (one query)'],
      ['SQL executed', '`deleteNote(note)`', '`deleteAllNotes()` (atomic)'],
      ['Success message', '`note_deleted`', '`all_notes_deleted`'],
      ['Failure message', '`delete_note_failed`', '`clear_all_failed`'],
      ['Undo restores', 'that note at its index', 'every note, each at its own index, in order']
    ] }
  ]
});

S({
  id: 'add-note', num: 20, part: 'features',
  title: 'Creating a note',
  lede: 'The only flow that is deliberately not optimistic: nothing disappears until the insert has succeeded.',
  tags: 'add note create insert title dialog save camera location',
  blocks: [
    { t: 'diagram', id: 'add-note' },
    { t: 'src', v: 'add-note-save' },
    { t: 'h', v: 'Order of operations' },
    { t: 'steps', items: [
      { title: 'The title dialog opens first', body: 'From a post-frame callback in `initState`, so the screen is mounted and the dialog can be shown. `cancellable: false` means the user cannot dismiss it and cannot create an untitled note.' },
      { title: 'hasTitle unlocks the editor', body: 'The content field, the speech controls and the location checkbox are all gated on `hasTitle`; `Obx` swaps them for a collapsed widget while it is false.' },
      { title: 'Optional location resolves before the write', body: 'If the box is ticked but no position has been acquired yet, `fetchCurrentLocation()` is awaited so the inserted row never carries a temporary `null`.' },
      { title: 'One insert, then pop', body: '`insertNote` is awaited; on success `Get.back()` returns to home, which calls `loadTitles()`. On failure the user stays on the page with the draft untouched and sees `save_note_failed` with the error appended.' }
    ] },
    { t: 'h', v: 'What is stored' },
    { t: 'code', lang: 'dart', file: 'lib/screens/add_note/add_note_page.dart', at: 135, v: [
      'await database.notedao.insertNote(',
      '  Note(',
      '    title: noteTitle,',
      '    content: _contentController.text,',
      '    long: saveLocation.value ? _location.position?.longitude : null,',
      '    lat: saveLocation.value ? _location.position?.latitude : null,',
      '    imagePath: _image.value?.path,',
      '  ),',
      ');'
    ].join('\n') },
    { t: 'callout', kind: 'good', title: 'Title fallback chain', v: 'The saved title is `title.value`, or the text controller if the Rx is empty, or nothing — in which case a `title_required` snackbar is shown and the function returns without writing anything.' },
    { t: 'callout', kind: 'info', title: 'Image is only a path in the row', v: 'The `File` lives in an `Rxn<File>` on the screen; the database stores the path string only, and the file itself was already copied into the documents directory by `ImageStorageService`.' }
  ]
});

S({
  id: 'title-dialog', num: 21, part: 'features',
  title: 'The title dialog and the RenderFlex decision',
  lede: 'One dialog for both screens, built on `AlertDialog` on purpose — and the reason is documented in the source.',
  tags: 'dialog title alertdialog get defaultdialog renderflex wrap layout',
  blocks: [
    { t: 'src', v: 'title-dialog' },
    { t: 'h', v: 'The API' },
    { t: 'keys', v: [
      ['`context`, `controller`, `onChanged`', 'Required. `onChanged` reports whether the trimmed text is non-empty, which is how `hasTitle` is kept in sync.'],
      ['`cancellable`', '`false` on add-note (the title is mandatory), `true` on the details screen (the existing title is pre-filled).'],
      ['returns', 'The typed `String`, or `null` when cancelled — callers simply ignore `null`.'],
      ['`barrierDismissible: false`', 'Always: tapping the barrier cannot dismiss the dialog.']
    ] },
    { t: 'h', v: 'Why not Get.defaultDialog' },
    { t: 'p', v: 'The doc comment on `showTitleInputDialog` states the reason precisely: `Get.defaultDialog` lays its `confirm`/`cancel` buttons out inside a `Wrap`, which gives them unbounded width. This app uses `Expanded` / `double.infinity` buttons, and that combination throws a `RenderFlex` assertion while the dialog is laid out on current Flutter versions. A plain `AlertDialog` reproduces the same look and lays out correctly.' },
    { t: 'h', v: 'Small behaviours worth knowing' },
    { t: 'ul', v: [
      'The save button is disabled while the field is empty (`_hasTitle` is mirrored inside the dialog state).',
      'When `cancellable` is `false` the save button is the only one and spans the full width.',
      'The details screen pre-fills the field with `note.value?.title`, falling back to `Get.arguments`.',
      'Dialog strings (`note_title_dialog_title`, `note_title_dialog_hint`, `save`, `no`) are translation keys.'
    ] }
  ]
});

S({
  id: 'details-view', num: 22, part: 'features',
  title: 'The note details screen in view mode',
  lede: 'A title arrives by route argument; the row, the picture and the address are hydrated from the database.',
  tags: 'details view load arguments hydrate image address',
  blocks: [
    { t: 'h', v: 'Loading sequence' },
    { t: 'code', lang: 'dart', file: 'lib/screens/note_details/note_details_page.dart', at: 107, v: [
      'Future<void> _loadNote() async {',
      '  final Note? loaded =',
      '      await database.notedao.getNoteFromTitle(Get.arguments);',
      '',
      '  if (loaded == null) return;',
      '',
      '  note.value = loaded;',
      '  _contentController.text = loaded.content;',
      '  title.value = loaded.title;',
      '  _image.value = ImageStorageService.fileFromPath(loaded.imagePath);',
      '',
      '  await _applyStoredLocation(loaded);',
      '}'
    ].join('\n') },
    { t: 'ul', v: [
      '`note.value == null` renders `no_content` in the centre of the screen — the only “missing note” handling that exists.',
      'The picture is resolved from the stored path through `ImageStorageService.fileFromPath`, which returns `null` when the file no longer exists (for example after clearing app storage), so no widget tries to decode a missing image.',
      'The address is reverse-geocoded from the **stored** coordinates via the static `LocationController.describeCoordinates`, falling back to `no_address_found`.'
    ] },
    { t: 'h', v: 'View-mode chrome' },
    { t: 'ul', v: [
      'The app bar shows the title while editing, otherwise `Get.arguments`.',
      'The FAB shows an edit icon and becomes a save icon while editing.',
      'The picture stays visible in both modes; only its delete button is gated by `isEditing`.',
      'The speech controls and camera button are rendered only while editing.',
      'The “Update location” checkbox is rendered always but disabled outside edit mode.'
    ] }
  ]
});

S({
  id: 'edit-save', num: 23, part: 'features',
  title: 'Editing and saving a note',
  lede: 'Optimistic: the screen shows the new version immediately, and goes back into edit mode if the database refuses it.',
  tags: 'edit save optimistic rollback previous version snapshot',
  blocks: [
    { t: 'diagram', id: 'optimistic-delete' },
    { t: 'src', v: 'details-save' },
    { t: 'h', v: 'Entering edit mode' },
    { t: 'code', lang: 'dart', file: 'lib/screens/note_details/note_details_page.dart', at: 305, v: [
      'Future<void> _toggleEditing() async {',
      '  if (isEditing.value) {',
      '    await _saveNote();',
      '    return;',
      '  }',
      '',
      '  isEditing.value = true;',
      '  _showTitleDialog();',
      '}'
    ].join('\n') },
    { t: 'h', v: 'What the optimistic save does' },
    { t: 'steps', items: [
      { title: 'Snapshot', body: '`final Note? previousNote = note.value;` — the complete previous version, taken before anything is mutated. This single object serves both the rollback and the Undo.' },
      { title: 'Resolve location first', body: 'If the checkbox is ticked and no position is held, `fetchCurrentLocation(reportWithSnackBar: true)` runs before the new `Note` is built, so the optimistic row already carries the final coordinates.' },
      { title: 'Push the new version', body: '`note.value = updatedNote; isEditing.value = false;` — the screen now shows the saved version and the FAB flips back to edit.' },
      { title: 'Commit through the shared engine', body: '`commitUndoableChange` runs `insertNote` and, on failure, calls the rollback closure: restore `note.value`, re-resolve the image from the previous path, reopen edit mode, drop the pending location and show the restored address.' },
      { title: 'Pop, then offer Undo', body: 'After a successful commit the screen pops and only then calls `showUndoSnackbar`. A GetX snackbar belongs to the overlay of the topmost route, so presenting it before the pop would make it disappear with the screen. A failed save returns early, so no Undo is offered for a change that never happened.' }
    ] },
    { t: 'h', v: 'Field-by-field behaviour' },
    { t: 'table', head: ['Field', 'While the location box is unticked', 'While it is ticked'], rows: [
      ['`title`', '`title.value`, else the dialog text, else `Get.arguments`', 'same'],
      ['`content`', '`TextEditingController.text`', 'same'],
      ['`long` / `lat`', 'kept from `previousNote`', 'replaced by the freshly resolved position'],
      ['`imagePath`', '`_image.value?.path` (which may be `null` after deleting the picture)', 'same'],
      ['`id`', '`previousNote?.id` — the row is replaced, never duplicated', 'same']
    ] },
    { t: 'callout', kind: 'info', title: 'Why the rollback reopens edit mode', v: 'The user asked for a change and did not get it. Returning to view mode would hide their unsaved text behind a disabled field, so the screen goes back into editing with the previous version intact.' }
  ]
});

S({
  id: 'edit-undo', num: 24, part: 'features',
  title: 'Undo of an edit',
  lede: 'The same 5-second window as a deletion, restoring the complete previous version — including its title, image and coordinates.',
  tags: 'edit undo restore same primary key replace delete when previous null',
  blocks: [
    { t: 'src', v: 'details-undo' },
    { t: 'diagram', id: 'undo-state-machine' },
    { t: 'h', v: 'The three cases' },
    { t: 'steps', items: [
      { title: 'Optimistic restore', body: '`note.value = previous` and the image are updated immediately, so the list item the user is looking at flips back on the same frame.' },
      { title: 'Database restore', body: 'If a previous version exists it is re-inserted with the same primary key, so `OnConflictStrategy.replace` overwrites the edited row. If `previous == null` the note did not exist before the save, so the Undo deletes the inserted row instead.' },
      { title: 'Failure handling', body: 'If the restore throws, the screen is put back to the **edited** version — the one that is really stored — and `restore_note_failed` is shown. The UI never displays a version the database does not have.' }
    ] },
    { t: 'h', v: 'Side effects' },
    { t: 'ul', v: [
      '`_refreshHomeTitles()` re-reads the list, because an Undo can bring back a different title than the one the home list is showing. It is a no-op when `NotesController` is not registered (stand-alone tests).',
      'When the coordinates of the two versions differ, the pending “update location” state is dropped (`updateLocation = false`, `_location.reset()`) and the restored address is shown instead, so the row does not keep displaying a location that is no longer the note’s.'
    ] },
    { t: 'callout', kind: 'good', title: 'Two independent Undos', v: 'A deletion and an edit each own their `UndoableChange`, so undoing the newest change can never restore the older one’s state. This is covered by the tests “the Undo of the newest edit restores B, never A” and “a deletion Undo and an edit Undo stay independent”.' }
  ]
});

S({
  id: 'images-capture', num: 25, part: 'features',
  title: 'Camera capture and photo storage',
  lede: 'Picked bytes are copied into the app documents directory under a UUID name — never re-encoded, never resized.',
  tags: 'camera image_picker uuid copy documents path exists',
  blocks: [
    { t: 'src', v: 'image-storage' },
    { t: 'h', v: 'Capture' },
    { t: 'code', lang: 'dart', file: 'lib/services/image_storage_service.dart', at: 21, v: [
      'final XFile? photo = await _picker.pickImage(',
      '  source: ImageSource.camera,',
      '  imageQuality: 85,',
      ');',
      '',
      'if (photo == null) return null;',
      '',
      'final directory = await getApplicationDocumentsDirectory();',
      'final fileName = \'${const Uuid().v4()}.jpg\';',
      '',
      'return File(photo.path).copy(p.join(directory.path, fileName));'
    ].join('\n') },
    { t: 'h', v: 'Consequences of this design' },
    { t: 'ul', v: [
      'Two notes can never share a path, because the name is a fresh UUID v4.',
      'The original bytes and therefore the original aspect ratio survive; nothing re-encodes the image.',
      '`imageQuality: 85` asks the picker for a JPEG at that quality — this is a request to the platform, not a second re-encode inside the app.',
      'Cancelling the camera returns `null`, and both screens then return without touching their state.'
    ] },
    { t: 'h', v: 'Loading a stored picture' },
    { t: 'p', v: '`ImageStorageService.fileFromPath` is `static` and returns `null` for a null/empty path or a file that no longer exists (`existsSync`). Both screens call it whenever they hydrate a note or roll back to a previous version, which is what keeps a missing file from reaching `Image.file`.' },
    { t: 'callout', kind: 'absent', title: 'Not implemented', v: 'There is no gallery import (`ImageSource.gallery`), no thumbnail generation, no image compression step, no file cleanup when a note or the picture is deleted, and no camera permission declared in `AndroidManifest.xml`.' }
  ]
});

S({
  id: 'image-preview', num: 26, part: 'features',
  title: 'The picture preview widget',
  lede: 'One bounded box, `BoxFit.contain`, an optional delete button, and a tap that opens the viewer.',
  tags: 'preview widget contain letterbox clip rrect delete button',
  blocks: [
    { t: 'src', v: 'image-preview' },
    { t: 'h', v: 'The contract' },
    { t: 'keys', v: [
      ['`image`', 'The `File` to render.'],
      ['`onDelete`', 'Required; invoked by the red delete icon.'],
      ['`showDeleteButton`', '`true` by default. The details screen passes `isEditing.value`, so the button only exists while the note can be changed.'],
      ['`onTap`', 'Optional; both screens pass `() => ImageViewerPage.open(current)`.'],
      ['`height`', 'Default `200`; the add-note screen uses `150`.'],
      ['`padding`', 'Wraps the whole `Stack`, delete button included.']
    ] },
    { t: 'h', v: 'Why the picture is never distorted' },
    { t: 'p', v: 'The picture is laid out in a box of exactly `height` logical pixels and scaled with `BoxFit.contain`, so the image keeps its aspect ratio and the remaining space is letter-boxed. `ClipRRect` with a 12-pixel radius rounds the corners, and `GestureDetector(behavior: HitTestBehavior.opaque)` makes the whole picture tappable, not just the painted pixels.' },
    { t: 'callout', kind: 'info', title: 'Failure behaviour', v: '`errorBuilder` renders an empty `SizedBox(height: height)`, so a corrupt or unreadable file leaves the layout intact instead of throwing.' },
    { t: 'callout', kind: 'good', title: 'Tested with real files', v: 'The test suite writes real 24-bit BMP files of known dimensions, decodes them and asserts that the delivered size matches `BoxFit.contain` maths, that proportions survive, that the delete button can be hidden and that a tap is forwarded.' }
  ]
});

S({
  id: 'image-viewer', num: 27, part: 'features',
  title: 'The full-screen image viewer',
  lede: 'As large as the screen allows, never stretched — then pinch-zoom and pan up to 5×.',
  tags: 'viewer interactiveviewer zoom pinch pan contain full screen',
  blocks: [
    { t: 'src', v: 'image-viewer' },
    { t: 'h', v: 'Sizing: the subtle part' },
    { t: 'p', v: '`InteractiveViewer` hands its child loose constraints. Without an explicit size, `Image.file` collapses to its raw pixel size and can look tiny on a high-resolution screen. The fix is `width: double.infinity, height: double.infinity` together with `fit: BoxFit.contain`: the picture takes the whole available area and is then letter-boxed, which is the largest undistorted rendering possible. The inline comment in the source records exactly this reasoning.' },
    { t: 'table', head: ['Property', 'Value', 'Effect'], rows: [
      ['`minScale`', '`1`', 'A new route always starts from the “fit the screen” state.'],
      ['`maxScale`', '`5`', 'Pinch-zoom up to five times the fitted size.'],
      ['`fit`', '`BoxFit.contain`', 'No stretching, no cropping.'],
      ['`errorBuilder`', '`no_content` text', 'A missing file shows a message instead of crashing.'],
      ['chrome', '`AppColors.primary` AppBar + `snackbarBackground` body', 'The same blue bar and dark surround as the rest of the app.']
    ] },
    { t: 'h', v: 'No controller of its own' },
    { t: 'p', v: 'The widget keeps no `TransformationController`, so there is nothing to dispose and nothing to leak between routes; every visit starts from the fitted view. Navigation goes through `ImageViewerPage.open(file)` with `Transition.rightToLeft`, shared by both screens so the transition lives in one place.' },
    { t: 'callout', kind: 'good', title: 'Covered by tests', v: 'Tests assert the contained size, that a pinch gesture increases the transform, that a drag pans the zoomed picture, that zooming back out returns to the fitted size, and that the app chrome plus the localized title are used.' }
  ]
});

S({
  id: 'location', num: 28, part: 'features',
  title: 'Location and reverse geocoding',
  lede: 'A controller with two reporting styles, a static address resolver, and four distinct failure messages.',
  tags: 'geolocator geocoding permission placemark location retry',
  blocks: [
    { t: 'src', v: 'location-controller' },
    { t: 'h', v: 'The two fetch modes' },
    { t: 'table', head: ['Mode', 'Used by', 'Loading', 'Error', 'Success'], rows: [
      ['`_fetchInline()` (`reportWithSnackBar: false`)', 'add-note, and the live preview on the details screen', 'inline spinner + `getting_location`', 'inline red row + “Retry” button', 'inline `LocationRow`'],
      ['`_fetchWithSnackBars()` (`true`)', 'details screen on open and before an optimistic save', 'none', '`Get.snackbar` with a localization key', 'snackbar-free; the caller decides what to show']
    ] },
    { t: 'h', v: 'The permission ladder' },
    { t: 'steps', items: [
      { title: 'Is the location service on?', body: '`Geolocator.isLocationServiceEnabled()` — otherwise `location_services_disabled`.' },
      { title: 'Ask for permission only if needed', body: '`checkPermission()`; `requestPermission()` is called only when the answer is `denied`. A second refusal reports `location_permission_denied` / `location_permissions_denied`.' },
      { title: 'A permanent denial is terminal', body: '`deniedForever` produces `location_permission_denied_forever` and no further request is attempted.' },
      { title: 'Any thrown error collapses to one message', body: 'The `catch` reports `location_failed`, and `finally` always clears `isLoading`.' }
    ] },
    { t: 'h', v: 'Resolving an address' },
    { t: 'src', v: 'location-describe' },
    { t: 'p', v: '`describeCoordinates` joins the non-empty parts of the first placemark (`name`, `street`, `locality`, `country`) with `, `, after passing them through a `Set` so a field repeated by the platform is not printed twice. It returns `null` when no placemark is available or the call throws, and every caller supplies its own fallback: `location_unknown` for a live fetch, `no_address_found` for a stored note.' },
    { t: 'callout', kind: 'good', title: 'Static on purpose', body: 'Because the method is static and takes coordinates, the details screen can show the address of a note saved yesterday without ever touching GPS.' }
  ]
});

S({
  id: 'location-edit', num: 29, part: 'features',
  title: 'Re-tagging a note with a new location',
  lede: 'The details screen now behaves exactly like the add-note screen: the new address appears while you are still editing.',
  tags: 'update location optimistic preview rollback undo reset',
  blocks: [
    { t: 'h', v: 'The rule' },
    { t: 'p', v: 'While “Update location” is ticked, the row under the checkbox renders the **live** controller state — spinner, error with retry, or the freshly resolved address. Unticked, it renders the stored address of the note exactly as before. Both branches are reactive, so nothing waits for a database write.' },
    { t: 'code', lang: 'dart', file: 'lib/screens/note_details/note_details_page.dart', at: 414, v: [
      'onChanged: isEditing.value',
      '    ? (bool? value) {',
      '        final bool checked = value ?? false;',
      '        updateLocation.value = checked;',
      '',
      '        // Same optimistic behaviour as the add-note screen:',
      '        // the controller publishes the new location through',
      '        // its reactive state straight away, so the row below',
      '        // shows it immediately instead of waiting for the save.',
      '        if (checked) {',
      '          _location.fetchCurrentLocation();',
      '        } else {',
      '          _location.reset();',
      '        }',
      '      }',
      '    : null,'
    ].join('\n') },
    { t: 'h', v: 'The three places pending state is dropped' },
    { t: 'table', head: ['When', 'What happens'], rows: [
      ['User unticks the checkbox', '`_location.reset()` clears name, error, loading and position; the stored address reappears.'],
      ['The save is rejected', '`updateLocation.value = false`, `_location.reset()`, then `_applyStoredLocation(previousNote)` — the new coordinates never reached the database, so they must not stay on screen.'],
      ['An Undo changes the coordinates', 'If the restored and edited versions differ in `lat`/`long`, the pending update is dropped and the restored address is shown instead.']
    ] },
    { t: 'callout', kind: 'info', title: 'Coordinates kept when unticked', v: '`long`/`lat` fall back to `previousNote.long` / `previousNote.lat` while the box is unticked, so saving an unrelated text edit never silently drops an existing location.' },
    { t: 'callout', kind: 'good', title: 'Regression test', v: '“a new location shows up while editing, without a database write” drives the controller state directly and asserts the new address is on screen while no insert has been issued.' }
  ]
});

S({
  id: 'speech', num: 30, part: 'features',
  title: 'Speech to text',
  lede: 'One controller owns the microphone; the UI is a single `Obx`; recognised words are appended, never replaced.',
  tags: 'speech_to_text microphone permission locale en_us ar_eg dictation rtl',
  blocks: [
    { t: 'src', v: 'speech-controller' },
    { t: 'h', v: 'State' },
    { t: 'table', head: ['Rx', 'Meaning', 'Drives'], rows: [
      ['`isEnabled`', 'Permission granted and the engine is usable', 'mic icon and button label'],
      ['`isInitializing`', 'Permission request / warm-up running', 'a spinner instead of the button'],
      ['`isListening`', 'A recognition session is active', 'stop icon, red button, disabled dropdown'],
      ['`statusText`', 'Progress or error message', 'a centred red status line'],
      ['`selectedLocale`', '`en_US` or `ar_EG`', 'the dropdown, the content field direction and the camera label']
    ] },
    { t: 'h', v: 'The listening flow' },
    { t: 'steps', items: [
      { title: 'First tap only asks for permission', body: '`toggleListening` calls `initialize()` when `isEnabled` is false and returns — it never tries to listen before the engine is ready.' },
      { title: 'Permission outcome is explained', body: 'Success clears `statusText`; refusal or unsupported hardware shows “Permission denied or microphone is not supported”; a thrown error is reported with the error text.' },
      { title: 'Locale switching stops the session first', body: '`changeLocale` stops a running session, assigns the new locale and clears the status, so the next session uses it. The dropdown is disabled while listening, so this only happens from the controller side or programmatically.' },
      { title: 'Words are appended to the field', body: '`_baseText` is snapshotted when the session starts; `_onSpeechResult` inserts a separating space only when needed and moves the caret to the end.' }
    ] },
    { t: 'h', v: 'Two independent languages' },
    { t: 'p', v: 'The dropdown selects the **recognition** language, not the app language. That is why `isArabic` drives the content field’s `textDirection`/`textAlign`, the “Write content here…” hint, the camera button label and the RTL alignment of the speech labels — while everything else in the app follows `AppTranslations`. The distinction is stated in the doc comments of both `SpeechController` and `AppTranslations`.' },
    { t: 'callout', kind: 'absent', title: 'Not implemented', v: 'There is no partial/streaming display toggle, no confidence reporting, no custom vocabulary, no audio recording or playback, and no persistence of recognised text other than through the content field.' }
  ]
});

/* ══════════════════════ PART IV — CROSS-CUTTING ══════════════════════ */

S({
  id: 'localization-theme', num: 31, part: 'cross',
  title: 'Localization and visual identity',
  lede: '38 keys in two languages, ten colour constants, and no `ThemeData` at all.',
  tags: 'localization translations tr params ar_eg colours theme appcolors',
  blocks: [
    { t: 'src', v: 'translations' },
    { t: 'h', v: 'How translations are wired' },
    { t: 'keys', v: [
      ['`AppTranslations extends Translations`', 'GetX resolves the map `{\'en_US\': _en, \'ar_EG\': _ar}` by locale name.'],
      ['`defaultLocale` / `fallbackLocale`', 'Both `Locale(\'en\', \'US\')`, passed to `GetMaterialApp`.'],
      ['`\'.tr`', 'Used in widgets for plain keys, e.g. `Text(\'update_location\'.tr)`.'],
      ['`\'.trParams({...})`', 'Used for the three keys that contain `@error`: `save_note_failed`, `update_note_failed`, `load_notes_failed`.']
    ] },
    { t: 'h', v: 'The 38 keys' },
    { t: 'table', head: ['Group', 'Keys'], rows: [
      ['Generic (5)', '`error_title`, `save`, `no`, `cancel`, `retry`'],
      ['Home (2)', '`home_title`, `home_loading`'],
      ['Title dialog (4)', '`note_title_dialog_title`, `note_title_dialog_hint`, `no_title_yet`, `title_required`'],
      ['Delete / clear / Undo (11)', '`delete_note_title`, `delete_note_message`, `delete`, `note_deleted`, `all_notes_deleted`, `note_updated`, `undo`, `undo_hint`, `delete_note_failed`, `clear_all_failed`, `restore_note_failed`'],
      ['Add note (2)', '`save_note_failed`, `save_location`'],
      ['Details (4)', '`update_location`, `no_content`, `update_note_failed`, `no_address_found`'],
      ['Image viewer (1)', '`image_viewer_title`'],
      ['Location (8)', '`location_services_disabled`, `location_permission_denied`, `location_permission_denied_forever`, `location_permissions_denied`, `location_permissions_denied_forever`, `location_unknown`, `location_failed`, `getting_location`'],
      ['Database (1)', '`load_notes_failed`']
    ] },
    { t: 'callout', kind: 'good', title: 'Enforced by tests', v: '“en_US and ar_EG expose exactly the same keys” and “no English value is left empty” mean a key cannot be added to one language only, and “parameterised messages declare the placeholder” keeps the `@error` contract honest.' },
    { t: 'h', v: 'Colours' },
    { t: 'src', v: 'app-colors' },
    { t: 'p', v: 'Ten constants replace every inline Flutter colour: `primary` blue for AppBars/FABs, `danger` red for destructive actions, `success` teal for the camera button, `warning` orange for the microphone-permission button, `snackbarBackground #212121` for every snackbar, plus location, muted and subtle text colours. No `ThemeData`, `themeMode`, `darkTheme` or `SystemChrome` call exists in the project, so the app renders with the default Material theme only.' },
    { t: 'callout', kind: 'absent', title: 'No runtime language switch and no dark mode', v: '`Get.updateLocale` is never called and no settings screen exists. Switching the app language would require adding that call — *Not found in the current implementation.*' }
  ]
});

S({
  id: 'optimistic-ui', num: 32, part: 'cross',
  title: 'Optimistic UI and the Undo engine',
  lede: 'The architectural centre of the app: one class, four functions, two callers.',
  tags: 'optimistic undo snackbar settle rollback timer committed',
  blocks: [
    { t: 'diagram', id: 'undo-state-machine' },
    { t: 'src', v: 'undoable-change' },
    { t: 'h', v: 'The four public functions' },
    { t: 'table', head: ['Function', 'Shows the Undo snackbar?', 'Used by'], rows: [
      ['`commitUndoableChange(change, applyDatabase, revertUi)`', 'no', '`NoteDetailsPage._saveNote` — it must pop before presenting'],
      ['`applyUndoableChange({change, applyDatabase, revertUi})`', 'yes, when the change succeeded', '`NotesController._delete`'],
      ['`showUndoSnackbar(change, {window})`', 'yes', 'the details screen after its pop'],
      ['`showErrorSnackbar(messageKey, {error})`', 'no', 'failures and restore failures across the app']
    ] },
    { t: 'h', v: 'Five invariants' },
    { t: 'steps', items: [
      { title: 'A rejected change is never undoable', body: '`_commit` sets `failed = true` and calls `settle()` before `revertUi()`, and `showUndoSnackbar` returns early for a failed or settled change.' },
      { title: 'The window starts when the snackbar opens', body: 'The `Timer` is armed from `snackbarStatus: SnackbarStatus.OPEN`, not when the change happens, because GetX queues snackbars and a later one may only appear seconds afterwards.' },
      { title: 'Closing settles, however it happens', body: '`SnackbarStatus.CLOSED` settles the change, so timeout, swipe-away and programmatic close all end up in the same state.' },
      { title: 'Undo awaits the database', body: '`restore` awaits `change.committed` before writing anything back, so a fast tap cannot be overtaken by the very operation it undoes.' },
      { title: 'Tracked changes are settled on close', body: '`NotesController.onClose` settles every pending deletion, so no timer outlives the controller.' }
    ] },
    { t: 'src', v: 'undo-commit' },
    { t: 'src', v: 'undo-snackbar' },
    { t: 'callout', kind: 'good', title: 'Why this design scales', v: 'Two simultaneous deletions keep separate `UndoableChange` objects with separate timers and separate restore closures, which is what makes “undoing the newest change never restores an older one” a property of the design rather than a special case.' }
  ]
});

S({
  id: 'error-handling', num: 33, part: 'cross',
  title: 'Error handling and user feedback',
  lede: 'Every failure mode has a named, translated message — and none of them is a crash.',
  tags: 'errors exceptions snackbar messages debugprint failure',
  blocks: [
    { t: 'table', head: ['Where', 'Failure', 'User sees'], rows: [
      ['`NotesController.loadTitles`', 'DAO throws', '`load_notes_failed` snackbar with the error'],
      ['`NotesController._restore`', 're-insert throws', '`restore_note_failed`, then `loadTitles()` so the UI matches the database'],
      ['`NoteDetailsPage._restorePreviousVersion`', 're-insert throws', 'the stored (edited) version stays on screen + `restore_note_failed`'],
      ['`AddNotePage._saveNote`', 'insert throws', '`save_note_failed` with the error; the draft is untouched'],
      ['`NoteDetailsPage._saveNote`', 'insert throws', 'rollback to the previous version, edit mode reopened, `update_note_failed`'],
      ['`UndoableChange._commit`', 'any optimistic change throws', '`debugPrint` + the caller’s failure key snackbar'],
      ['`LocationController._fetchInline`', 'service off / permission / throw', 'inline message + a “Retry” button'],
      ['`LocationController._fetchWithSnackBars`', 'same causes', 'error snackbar'],
      ['`SpeechController.initialize`', 'permission refused / engine error', 'status line under the buttons'],
      ['`ImageStorageService`', 'camera cancelled', 'nothing — the screens return early on `null`'],
      ['`ImagePreviewWidget` / `ImageViewerPage`', 'file unreadable', 'empty box / `no_content` text'],
      ['`NoteDetailsPage._loadNote`', 'title not found', '`no_content` in the centre of the screen']
    ] },
    { t: 'h', v: 'Two conventions' },
    { t: 'ul', v: [
      'Errors are never shown as raw exception text unless a key is parameterised with `@error` — and only three keys are.',
      'Diagnostics go to `debugPrint` (`Save note error:`, `Optimistic change "…" failed:`); the user-facing text always comes from `AppTranslations`.'
    ] },
    { t: 'callout', kind: 'good', title: 'No bare `catch (e)` swallowing a rollback', v: 'Where a failure could leave the UI disagreeing with the database, the code re-reads the database instead of guessing: `_restore` calls `loadTitles()`, and the edit Undo puts the stored version back on screen.' }
  ]
});

S({
  id: 'lifecycle-resources', num: 34, part: 'cross',
  title: 'Lifecycle, cleanup and owned resources',
  lede: 'Sensors, timers, text controllers, plugin listeners and route arguments — everything that must be released, and where.',
  tags: 'lifecycle dispose cleanup resources timer sensor textcontroller',
  blocks: [
    { t: 'table', head: ['Resource', 'Acquired in', 'Released in', 'Notes'], rows: [
      ['Accelerometer listener', '`HomePage.initState` → `ShakeService.start`', '`HomePage.dispose` → `stop()`', '`stop()` is idempotent and also clears the cooldown stamp.'],
      ['`NotesController`', '`HomePage.initState` → `Get.put`', '`HomePage.dispose` → `Get.delete`', '`onClose` settles pending Undo timers.'],
      ['`SpeechController` / `LocationController`', '`initState` of each note screen, tagged', '`dispose` of the same screen', 'Deleting the controller stops a running session through `onClose`.'],
      ['`TextEditingController`s (2 per screen)', 'field initialisers', '`dispose`', 'Title, content and speech share the content controller.'],
      ['Undo timer', '`SnackbarStatus.OPEN`', '`settle()` / `onClose`', 'Only one timer per change, guarded by `timer == null`.'],
      ['GetX controllers in tests', '—', '`tearDown(Get.reset)`', 'Keeps snackbar queues and tags from leaking between tests.']
    ] },
    { t: 'h', v: 'Plugin sessions' },
    { t: 'code', lang: 'dart', file: 'lib/controllers/speech_controller.dart', at: 148, v: [
      '@override',
      'void onClose() {',
      '  if (_speechToText.isListening) {',
      '    _speechToText.stop();',
      '  }',
      '',
      '  _contentController = null;',
      '  super.onClose();',
      '}'
    ].join('\n') },
    { t: 'p', v: 'Both `clearContent()` and `onClose()` stop an active session before clearing or dropping the controller, so a recogniser is never left running in the background after leaving the screen.' },
    { t: 'callout', kind: 'info', title: 'What the app does not own', v: 'No `StreamSubscription`, no `Timer.periodic`, no `AnimationController` and no background isolate exist in `lib/`. Snackbar animation teardown is a test-only concern, handled by pumping past `undoWindow` instead of calling `Get.closeAllSnackbars()`.' }
  ]
});

S({
  id: 'testing', num: 35, part: 'cross',
  title: 'Testing strategy',
  lede: 'One test file, ten groups, 44 tests — and no production code was changed to make them possible.',
  tags: 'testing widget tests fakes mocks 44 tests groups coverage',
  blocks: [
    { t: 'diagram', id: 'test-map' },
    { t: 'h', v: 'The ten groups' },
    { t: 'table', head: ['Group', 'Tests', 'What it pins down'], rows: [
      ['Localization', '4', 'default/fallback locale, identical key sets, no empty value, `@error` placeholders'],
      ['AppColors', '1', 'the palette still equals the original Material colours'],
      ['Home widgets', '2', '`NoteTile` gestures and `EmptyNotesView` text'],
      ['ImagePreviewWidget', '4', '`BoxFit.contain` geometry, decoded proportions, hideable delete button, forwarded tap'],
      ['ImageViewerPage', '3', 'contained size, pinch-zoom + pan, zoom-out back to fit, app chrome + localized title'],
      ['Optimistic deletion', '14', 'synchronous removal, unknown title no-op, rollback, Undo once, expired window, position restore, two independent deletions, clear-all + order + failure, swipe dismissal'],
      ['Shake to clear', '5', 'immediate clear without a dialog, Undo in order, one shake never deletes twice, empty list no-op, failure rollback'],
      ['ShakeService debounce', '2', 'one accepted shake per cooldown, `stop()` forgets the stamp'],
      ['Edit save + Undo', '7', 'successful save offers Undo, previous version restored in UI **and** database, every field restored, live location without a write, newest-edit-only Undo, failed save shows no Undo, failed restore keeps the stored version'],
      ['Shared Undo engine', '2', 'a deletion Undo and an edit Undo stay independent, a rejected change is never offered as undoable']
    ] },
    { t: 'h', v: 'The four test doubles' },
    { t: 'ul', v: [
      '`FakeNoteDao implements NoteDao` — an in-memory `Map<String, Note>` with `failOn`, `failNextInsert` and a `calls` log, including re-implemented replace-on-conflict semantics.',
      '`FakeNoteDatabase extends NoteDatabase` — installed once as the global `database` in `setUpAll`.',
      '`FakeGeocoding extends GeocodingPlatform` — returns a fixed placemark because native pigeon calls never answer in a test process.',
      'Method-channel mocks for `geolocator_android` (granted `whenInUse` permission and a fix at 30.0444, 31.2357), `speech_to_text` (returns `false`, i.e. no recogniser) and the accelerometer stream (acknowledged subscription).'
    ] },
    { t: 'src', v: 'test-fake-dao' },
    { t: 'src', v: 'test-set-up' },
    { t: 'h', v: 'Image testing with real pixels' },
    { t: 'p', v: '`writeBitmap` hand-builds a 24-bit BMP whose width and height are known exactly, which avoids any codec dependency and lets the tests assert the *decoded* size against the `BoxFit.contain` maths. `pumpImage` wraps the pump in `WidgetTester.runAsync` because widget tests run in a fake-async zone where the real file I/O behind `FileImage` never progresses.' },
    { t: 'callout', kind: 'absent', title: 'Not covered', v: 'There are no unit tests for `ImageStorageService` or `LocationController` in isolation, no golden tests, no integration_test folder, no coverage configuration in `pubspec.yaml`, and no test for `AppTranslations` Arabic *values* — only their presence.' }
  ]
});

/* ══════════════════════ PART V — LEARNING & ASSESSMENT ══════════════════════ */

S({
  id: 'learning-path', num: 36, part: 'learning',
  title: 'Progressive learning path',
  lede: 'A route through this codebase from “what is a widget” to “why is this Undo implementation race-free”. Filter by level.',
  tags: 'learning path beginner intermediate advanced tutorial steps',
  blocks: [
    { t: 'lessons', items: [
      { lv: 1, title: 'Read the bootstrap first', body: 'Start at `lib/main.dart` and follow `main → copyDatabase → initDatabase → MyApp`. It is 60 lines and it explains why the database is a global and why a seed asset exists.', files: ['main'] },
      { lv: 1, title: 'Learn one screen end to end', body: '`HomePage` contains a widget tree you already know (`Scaffold`, `AppBar`, `FAB`, `ListView.builder`) plus two new ideas: a `Dismissible` and a sensor listener started in `initState`.', files: ['home-page', 'home-list'] },
      { lv: 1, title: 'Get comfortable with Rx and Obx', body: '`Rx` is a mutable box; `Obx` subscribes to whatever Rx values are read while it builds. `NotesController.titles` is an `RxList<String>` — the simplest possible example.', files: ['notes-controller'] },
      { lv: 1, title: 'Trace the data', body: '`Note` → `NoteDao` → `notes` table. Write down what each of the six DAO methods returns; most app questions answer themselves once this is solid.', files: ['note', 'note-dao'] },
      { lv: 2, title: 'Understand GetX dependency injection with tags', body: 'Two screens each need a `SpeechController`. `Get.put(type, tag: ...)` plus `Get.delete(type, tag: ...)` in `dispose` is the whole pattern; understand what breaks without the tag.', files: ['add-note-init', 'speech-controller'] },
      { lv: 2, title: 'Study a plugin wrapper', body: '`LocationController` wraps two plugins, exposes three Rx values and offers two reporting styles through one flag. This is the shape of every service in the app.', files: ['location-controller'] },
      { lv: 2, title: 'Learn `Obx` boundaries', body: 'Compare `SpeechControls` (one small `Obx`) with the details body (one large `Obx`). Ask what each extra subscription costs and which state actually changes.', files: ['speech-controls'] },
      { lv: 2, title: 'Write the Undo invariants down', body: 'Five rules make the engine correct: rejected ⇒ never undoable, window starts at OPEN, CLOSED settles, restore awaits `committed`, `settle()` is idempotent. Verify each against `undoable_change.dart`.', files: ['undoable-change', 'undo-commit', 'undo-snackbar'] },
      { lv: 2, title: 'Read the race-condition comments', body: 'The comments in `notes_controller.dart` and `note_details_page.dart` explain three real races: delete-vs-restore ordering, double-gesture deletion, and the snackbar-after-pop problem. Redraw the timelines.', files: ['notes-controller-restore', 'details-save'] },
      { lv: 2, title: 'Reverse-engineer a layout bug', body: 'Why does `Image.file` look tiny inside `InteractiveViewer`? Answer from the constraint rules, then check the inline comment and the tests that pin the behaviour.', files: ['image-viewer'] },
      { lv: 3, title: 'Analyse the GetX snackbar queue', body: 'Snackbars are queued per route overlay. Derive why the Undo timer is armed on `SnackbarStatus.OPEN` and not at creation, and what would break with two changes in quick succession.', files: ['undo-snackbar'] },
      { lv: 3, title: 'Reason about `@Insert(onConflict: replace)`', body: 'Every write is a replace keyed on the primary key. Work out what happens on rename, on Undo of a rename, and if two notes shared a title.', files: ['note-dao', 'test-fake-dao'] },
      { lv: 3, title: 'Model the lifecycle matrix', body: 'Sensors, timers, text controllers, plugin sessions and tagged controllers: build the acquire/release table yourself and check it against section 34.', files: ['lifecycle-resources'] },
      { lv: 3, title: 'Design what is missing', body: 'Take one item from section 38 — for example search over note bodies or a real iOS permission set — and write the smallest change set that would add it without breaking the Undo invariants.', files: ['absent-features'] }
    ] }
  ]
});

S({
  id: 'interview', num: 37, part: 'learning',
  title: 'Interview preparation',
  lede: 'Questions an interviewer can ask about this exact codebase, with answers that cite the code. Filter by category.',
  tags: 'interview questions answers assessment quiz',
  blocks: [
    { t: 'qa', items: [
      { q: 'Explain the optimistic UI pattern as it is used in this app.', tags: 'architecture', a: 'The reactive state is updated before the database call, so the frame that follows the gesture already shows the new state. The database work then runs; on success the change is kept and offered as Undo, on failure the UI is rolled back and an error is reported. Implemented once in `applyUndoableChange`/`commitUndoableChange` and used by both the deletion pipeline and the note edit.' },
      { q: 'Why does the deletion remove the title before the first `await`?', tags: 'state', a: 'Because `Dismissible.onDismissed` and the Rx list must be consistent within the same frame. If the removal happened after an `await`, the widget that triggered the swipe would still be visible while the list already claimed otherwise. `deleteNoteByTitle` therefore calls `titles.removeAt(index)` synchronously, and the row is only read and deleted afterwards.' },
      { q: 'How does Undo of a deletion avoid creating a duplicate note?', tags: 'database', a: 'Before deleting, the controller reads the row with `getNoteFromTitle` and keeps it in `_DeletedNote.note`. Undo re-inserts that exact object, including its original `id`. Because `insertNote` is declared with `OnConflictStrategy.replace` and is keyed on the primary key, the write replaces the row instead of adding a second one.' },
      { q: 'What stops a user from restoring the same note twice?', tags: 'undo', a: '`UndoableChange.settled`. The Undo button returns early when the change is settled, `settle()` itself is idempotent, and the snackbar’s `CLOSED` callback settles the change as well — so a double tap, a late tap or a tap after the timeout is a no-op. The same flag is set before the rollback on failure, which also prevents undoing a change that never reached the database.' },
      { q: 'Why does the Undo timer start when the snackbar opens?', tags: 'undo', a: 'GetX queues snackbars. If the window were counted from the moment of the change, a second change queued behind another snackbar could already have expired while it was still waiting to be shown. The timer is therefore armed from `snackbarStatus: SnackbarStatus.OPEN`.' },
      { q: 'Why is the snackbar shown *after* the details screen pops?', tags: 'getx', a: 'A GetX snackbar is rendered into the overlay of the topmost route. Showing it while `NoteDetailsPage` is still on top would make it disappear together with that route. The save therefore commits first, returns early on failure, pops, and only then calls `showUndoSnackbar`.' },
      { q: 'What happens if the Undo restore itself fails?', tags: 'errors', a: 'For an edit, the screen is put back to the edited version — the one that is actually stored — and `restore_note_failed` is shown, then the home list is re-read. For a deletion, the restored titles are dropped and `loadTitles()` re-reads the database. In both cases the UI never shows a version the database does not have.' },
      { q: 'How is the shake gesture prevented from deleting twice?', tags: 'sensors', a: 'Two independent guards: `ShakeService.shouldHandle` rejects events within the 3-second cooldown of the last accepted shake, and `clearAllNotes` returns immediately on an empty list because it empties `titles` synchronously. The handler therefore needs no re-entrancy flag.' },
      { q: 'Why are the controllers registered with tags?', tags: 'getx', a: 'GetX keys controllers by type. Both note screens need a `SpeechController` and a `LocationController` at the same time, so untagged registration would hand the second screen the first screen’s instance — including a live microphone session. Each screen uses its own tag constant and deletes that exact instance in `dispose`.' },
      { q: 'How does the app decide whether a note has coordinates?', tags: 'data', a: 'By the nullable `lat`/`long` columns. When the location checkbox is unticked during an edit, both fall back to `previousNote.lat/long`, so an unrelated text edit cannot silently drop an existing location. `_applyStoredLocation` clears the displayed address when either value is null.' },
      { q: 'Why is `describeCoordinates` static?', tags: 'location', a: 'It takes coordinates and returns an address. Making it static lets the details screen resolve the address of a note stored earlier without acquiring a GPS fix or touching the reactive state of a controller.' },
      { q: 'Why does the picture not get distorted in the viewer?', tags: 'ui', a: '`InteractiveViewer` gives its child loose constraints, so an `Image.file` without an explicit size collapses towards its raw pixel size. The widget sets `width`/`height` to `double.infinity` and lets `BoxFit.contain` letter-box the picture — the largest possible rendering that keeps the original proportions.' },
      { q: 'Where is the database file and how is it created?', tags: 'data', a: '`<application documents>/notes.db`. On first launch `copyDatabase` copies the bundled `assets/database/notes.db` into that path; afterwards it returns early, so user data is never overwritten. `initDatabase` then opens the same path through `$FloorNoteDatabase.databaseBuilder(path)` with `migration1to2` registered.' },
      { q: 'What does `migration1to2` do and when does it run?', tags: 'data', a: 'It runs `ALTER TABLE notes ADD COLUMN imagePath TEXT`, upgrading version 1 to version 2. It is registered in `initDatabase`, so it runs the first time a new build opens an existing version-1 file.' },
      { q: 'How is the app tested without a real database or real hardware?', tags: 'testing', a: 'The global `late final database` is assigned a `FakeNoteDatabase` wrapping `FakeNoteDao` in `setUpAll`, `GeocodingPlatform.instance` is replaced with `FakeGeocoding`, and method channels for geolocator, speech-to-text and the accelerometer are mocked. No production code contains a test-only branch.' },
      { q: 'Why does the test fake re-implement replace-on-conflict?', tags: 'testing', a: 'Because the tests exercise renames and Undo of renames. A naive “insert a new row” fake would leave a copy under the old title and the assertions about the resulting list and database state would be wrong — the fake has to behave like the real table.' },
      { q: 'What is the difference between the app language and the speech language?', tags: 'i18n', a: 'The app language comes from `AppTranslations` (`en_US` default, `ar_EG` fallback) and drives every user-visible string. The speech language is a feature setting on `SpeechController` (`en_US` / `ar_EG`) that decides the recogniser locale, the direction of the content field and the labels inside `SpeechControls`. There is no UI to change the app language at runtime.' },
      { q: 'What happens to a photo when its note is deleted?', tags: 'images', a: 'The database row (and with it the `imagePath` string) is deleted. The copied JPEG in the documents directory is not removed — no file cleanup exists anywhere in the code. This is a real, documentable gap.' },
      { q: 'Name three things this app does not have.', tags: 'scope', a: 'No accounts or cloud sync, no in-app search over note bodies, and no in-app language switcher. It also has no folders/tags, no ordering or pinning, no export, and no dark theme. Section 38 lists the full inventory.' },
      { q: 'If you had to add full-text search, what would you touch?', tags: 'design', a: 'Add a DAO query such as `select title from notes where content like :q or title like :q`, expose it through `NotesController` as a new Rx state, and change the home body to switch between `ListView.builder` and an empty search state. Nothing in `undoable_change.dart` needs to change, because deletions keep working on titles.' }
    ] }
  ]
});

S({
  id: 'absent-features', num: 38, part: 'learning',
  title: 'What the implementation does not contain',
  lede: 'The accuracy section: everything below was searched for in the source and is Not found in the current implementation.',
  tags: 'absent missing not implemented scope gaps accuracy',
  blocks: [
    { t: 'callout', kind: 'absent', title: 'How this list was produced', v: 'Each item was checked by searching `lib/`, `test/`, `pubspec.yaml`, `android/app/src/main/AndroidManifest.xml` and `ios/Runner/Info.plist`. If you find one of these features in a different branch, this page is out of date — the source, not this page, is authoritative.' },
    { t: 'table', head: ['Feature', 'State in this codebase'], rows: [
      ['Accounts / sign-in', 'Not found in the current implementation.'],
      ['Cloud sync or any network call', 'Not found — no HTTP client, no backend, no Firebase; `INTERNET` is declared but unused.'],
      ['In-app search over titles or bodies', 'Not found — the home screen has no search field and the DAO has no `LIKE` query.'],
      ['Folders, tags, categories, pinning or manual ordering', 'Not found — and no DAO query has an `ORDER BY`.'],
      ['Export / import / share of notes', 'Not found in the current implementation.'],
      ['Dark mode or theme switching', 'Not found — no `ThemeData`, `darkTheme` or `themeMode` anywhere; only `AppColors` constants.'],
      ['In-app language switcher', 'Not found — `AppTranslations` is registered but `Get.updateLocale` is never called.'],
      ['Reminders, alarms or notifications', 'Not found — no notification plugin in `pubspec.yaml`.'],
      ['Home-screen widgets or shortcuts', 'Not found in the current implementation.'],
      ['Gallery / file import for pictures', 'Not found — only `ImageSource.camera` is used; there is no `CAMERA` permission either.'],
      ['Image cleanup when a note or picture is removed', 'Not found — copied files stay in the documents directory.'],
      ['Multiple notes with the same title', 'Possible: nothing enforces unique titles, although the list key and `getNoteFromTitle` both assume the title identifies a note.'],
      ['iOS permission usage descriptions', 'Not found — `NSMicrophoneUsageDescription` and location descriptions are absent from `ios/Runner/Info.plist`.'],
      ['Verified web build', 'Not found — `web/` holds the unmodified Flutter template and the plugins used here have no web configuration.'],
      ['Release signing for Android', 'Not configured — the release build type still uses the debug signing config, marked `TODO`.'],
      ['Repository / version control', 'Not found in the project directory — there is no Git repository.'],
      ['Separate unit tests for services', 'Not found — `test/` contains only `widget_test.dart`.'],
      ['Coverage configuration, golden tests, integration tests', 'Not found in the current implementation.']
    ] },
    { t: 'p', v: 'If you extend the app, keep two invariants intact: every new persistent action should go through `UndoableChange` (so it inherits the window, the settle guard and the rollback path), and every plugin wrapper should expose `Rx` state rather than pushing values into a widget.' }
  ]
});

/* ══════════════════════ glossary (tool route) ══════════════════════ */

DOC.glossary = [
  ['Obx', 'GetX widget that rebuilds when any Rx value read inside its builder changes.'],
  ['Rx / RxList / Rxn', 'Reactive holders: a value, a list, and a nullable value.'],
  ['GetX DI', 'Registering controllers with `Get.put` (optionally with a `tag`) and removing them with `Get.delete`.'],
  ['Get.arguments', 'The value passed to `Get.to(..., arguments: x)`; here always a note title.'],
  ['Floor', 'Type-safe SQLite wrapper whose annotations generate a `*.g.dart` part file.'],
  ['Entity', 'A `@Entity` class mapped to one database table (`Note` → `notes`).'],
  ['DAO', 'Data-access object: the annotated queries of a Floor database.'],
  ['Migration', 'A versioned schema change executed when an existing database file is upgraded.'],
  ['Optimistic UI', 'Updating the interface before the database, then rolling back if the write fails.'],
  ['Rollback', 'Restoring the pre-change state after the database rejected it.'],
  ['UndoableChange', 'The app\'s single Undo unit: keys, a restore closure, `settled`, `failed`, `timer`, `committed`.'],
  ['settle()', 'Idempotent guard that makes sure a change is handled exactly once.'],
  ['committed', 'A future that completes when the database part of a change finished (or rolled back).'],
  ['undoWindow', '`Duration(seconds: 5)` — both the Undo lifetime and the snackbar duration.'],
  ['Dismissible', 'Flutter widget that slides a list item away and reports `onDismissed`.'],
  ['InteractiveViewer', 'Built-in zoom/pan wrapper; here `minScale: 1`, `maxScale: 5`.'],
  ['BoxFit.contain', 'Scales a picture to fit its box while preserving its aspect ratio (letter-boxing).'],
  ['Reverse geocoding', 'Turning coordinates into a human-readable address (`placemarkFromCoordinates`).'],
  ['Placemark', 'The platform address record returned by the geocoding plugin.'],
  ['Accelerometer shake', 'Detected by `package:shake`; debounced here by a 3-second cooldown.'],
  ['Method channel', 'The Dart↔platform message channel mocked in tests for geolocator, speech and sensors.'],
  ['Pigeon', 'Flutter’s generated platform-channel mechanism; native calls never answer in a unit test.'],
  ['Tagged controller', 'A GetX controller registered under a string key so two screens can own separate instances.'],
  ['Seed asset', 'A bundled database file copied into the documents directory on first launch.'],
  ['Replace-on-conflict', 'An upsert keyed on the primary key; the mechanism that makes Undo idempotent.']
];

DOC.absent = DOC.sections[DOC.sections.length - 1].blocks[1].rows;
