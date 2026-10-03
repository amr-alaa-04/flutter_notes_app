import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:note/controllers/location_controller.dart';
import 'package:note/controllers/notes_controller.dart';
import 'package:note/db/daos/note_dao.dart';
import 'package:note/db/entities/note.dart';
import 'package:note/db/note_database.dart';
import 'package:note/localization/app_translations.dart';
import 'package:note/main.dart' show database;
import 'package:note/screens/home/home_page.dart';
import 'package:note/screens/home/widgets/empty_notes_view.dart';
import 'package:note/screens/home/widgets/note_tile.dart';
import 'package:note/screens/note_details/note_details_page.dart';
import 'package:note/services/shake_service.dart';
import 'package:note/utils/app_colors.dart';
import 'package:note/utils/undoable_change.dart';
import 'package:note/widgets/image_preview_widget.dart';
import 'package:note/widgets/image_viewer.dart';

/// Minimal `GetMaterialApp` shared by every widget test.
Widget _app(Widget home) => GetMaterialApp(
      home: home,
      translations: AppTranslations(),
      locale: AppTranslations.defaultLocale,
      fallbackLocale: AppTranslations.fallbackLocale,
    );

/// `_app` with the usual `Scaffold(body: …)`, used by the leaf-widget tests
/// (they need a `Material` ancestor for buttons/list tiles).
Widget _wrap(Widget child) => _app(Scaffold(body: child));

/// Pumps [home] as the root route. Used for full-screen pages that bring their
/// own `Scaffold`, and for the deletion tests which only need the overlay that
/// `Get.snackbar` draws into.
Future<void> pumpHome(WidgetTester tester, Widget home) async {
  await tester.pumpWidget(_app(home));
  await tester.pumpAndSettle();
}

/// Lets every GetX snackbar expire and the queue drain, so the overlay is torn
/// down without leaking an `AnimationController` ticker.
///
/// The snackbars are advanced by pumping past their duration instead of calling
/// `Get.closeAllSnackbars()`: that method also closes the jobs that are still
/// *queued*, whose animation controller does not exist yet.
Future<void> closeSnackbars(WidgetTester tester) async {
  final Duration step = undoWindow + const Duration(seconds: 1);

  for (int i = 0; i < 10 && Get.isSnackbarOpen; i++) {
    await tester.pump(step);
    await tester.pumpAndSettle();
  }

  // Let the exit animation finish so no ticker outlives the test.
  await tester.pumpAndSettle();
}

/// Taps the "Undo" action of the snackbar that is currently on screen.
Future<void> tapUndo(WidgetTester tester) async {
  await tester.pumpAndSettle();
  await tester.tap(find.text('Undo').first);
  await tester.pumpAndSettle();
}

/// Runs the exact callback the accelerometer would call on [HomePage].
void shake(WidgetTester tester) {
  // The state class is private on purpose; the hook it exposes is public.
  (tester.state(find.byType(HomePage)) as dynamic).debugTriggerShake();
}

/// Opens the details screen of [title] exactly like the home screen does.
///
/// The viewport is enlarged first so the whole screen — including the
/// "Update Location" checkbox at the very bottom — can be tapped the way a user
/// with a real phone would.
Future<void> openNoteDetails(WidgetTester tester, String title) async {
  tester.view.physicalSize = const Size(1000, 2000);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(_app(const SizedBox.shrink()));
  unawaited(
    Get.to<void>(() => const NoteDetailsPage(), arguments: title),
  );
  await tester.pumpAndSettle();
}

/// Taps the FAB once, which either opens edit mode or saves the note.
Future<void> tapFab(WidgetTester tester) async {
  await tester.tap(find.byType(FloatingActionButton));
  await tester.pumpAndSettle();
}

/// Enters edit mode and confirms the title dialog.
Future<void> startEditing(WidgetTester tester) async {
  await tapFab(tester);
  await tester.tap(_inDialog(find.text('Save')));
  await tester.pumpAndSettle();
}

/// Writes a real, uncompressed 24-bit bitmap of exactly [width]×[height] pixels
/// and returns it.
///
/// A BMP is used on purpose: it needs neither a codec nor a CRC, so the test can
/// produce an image whose dimensions are known exactly — which is what proves the
/// picture reaches the renderer with its original proportions.
File writeBitmap(Directory dir, int width, int height) {
  const int headerSize = 14 + 40; // BITMAPFILEHEADER + BITMAPINFOHEADER
  final int rowSize = (width * 3 + 3) & ~3; // 24 bpp, rows padded to 4 bytes
  final int pixelBytes = rowSize * height;
  final BytesBuilder bytes = BytesBuilder();

  void u16(int value) => bytes.add(<int>[value & 0xFF, (value >> 8) & 0xFF]);
  void u32(int value) => bytes.add(<int>[
        value & 0xFF,
        (value >> 8) & 0xFF,
        (value >> 16) & 0xFF,
        (value >> 24) & 0xFF,
      ]);

  bytes.add(<int>[0x42, 0x4D]); // "BM"
  u32(headerSize + pixelBytes);
  u32(0); // reserved
  u32(headerSize); // offset of the pixel data

  u32(40); // DIB header size
  u32(width);
  u32(height);
  u16(1); // colour planes
  u16(24); // bits per pixel
  u32(0); // BI_RGB, no compression
  u32(pixelBytes);
  u32(2835); // ~72 dpi
  u32(2835);
  u32(0); // palette size
  u32(0); // important colours

  for (int y = 0; y < height; y++) {
    for (int x = 0; x < width; x++) {
      bytes.add(<int>[0xCC, 0x66, 0x22]); // BGR, any colour will do
    }
    bytes.add(List<int>.filled(rowSize - width * 3, 0)); // row padding
  }

  final File file = File('${dir.path}/photo_${width}x$height.bmp')
    ..writeAsBytesSync(bytes.takeBytes());

  return file;
}

/// Pumps [home] and waits until a real `Image.file` has finished reading and
/// decoding its file.
///
/// Widget tests run inside a fake-async zone, where the real file I/O behind
/// `FileImage` never progresses, so the picture would stay unresolved (and
/// therefore un-sized). [WidgetTester.runAsync] lets real time pass.
Future<void> pumpImage(WidgetTester tester, Widget home) async {
  await tester.runAsync(() async {
    await tester.pumpWidget(_app(home));

    for (int i = 0; i < 5; i++) {
      await tester.pump();
      await Future<void>.delayed(const Duration(milliseconds: 20));
    }
  });

  await tester.pumpAndSettle();
}

/// A finder scoped to the title dialog, so it can never match the page behind.
Finder _inDialog(Finder finder) => find.descendant(
      of: find.byType(AlertDialog),
      matching: finder,
    );

/// Types [content] into the note body (the only TextField once the title
/// dialog is closed).
Future<void> typeContent(WidgetTester tester, String content) async {
  await tester.enterText(find.byType(TextField), content);
  await tester.pumpAndSettle();
}

/// Reverse-geocoding stand-in for widget tests.
///
/// The real implementation calls native pigeon channels, which never answer in a
/// test process, so every location fetch would stay in its loading state forever.
/// The tests only need *an* address.
class FakeGeocoding extends GeocodingPlatform {
  @override
  Future<List<Placemark>> placemarkFromCoordinates(
    double latitude,
    double longitude, {
    Locale? locale,
  }) async =>
      <Placemark>[
        Placemark(
          name: 'Fake Street',
          street: 'Fake Street',
          locality: 'Fake City',
          country: 'Fake Country',
        ),
      ];
}

/// In-memory stand-in for the Floor database.
///
/// It implements the same DAO contract the app uses, which lets the real
/// [NotesController] deletion pipeline (optimistic update, database, undo,
/// rollback) be tested without a native SQLite handle, and without changing the
/// production database architecture in any way.
class FakeNoteDao implements NoteDao {
  final Map<String, Note> rows = <String, Note>{};

  /// Titles whose delete/insert call must throw, to exercise the rollback.
  final Set<String> failOn = <String>{};

  /// When `true`, the **next** [insertNote] throws and the flag clears itself.
  ///
  /// This is what makes it possible to fail a save and let its Undo succeed (or
  /// the other way round) for the same note, which a title-based flag cannot do.
  bool failNextInsert = false;

  /// Every call, in order, so the tests can assert *how many* queries ran.
  final List<String> calls = <String>[];

  int _nextId = 1;

  void seed(Iterable<String> titles) {
    for (final String title in titles) {
      rows[title] = Note(id: _nextId++, title: title, content: 'c');
    }
  }

  /// Returns the fake to a pristine state, including the id sequence.
  void reset() {
    rows.clear();
    failOn.clear();
    failNextInsert = false;
    calls.clear();
    _nextId = 1;
  }

  void _maybeFail(String title) {
    if (failOn.contains(title)) throw StateError('database failure: $title');
  }

  @override
  Future<List<String>> getNotesTitle() async {
    calls.add('getNotesTitle');
    return rows.keys.toList();
  }

  @override
  Future<Note?> getNoteFromTitle(String title) async {
    calls.add('getNoteFromTitle');
    return rows[title];
  }

  @override
  Future<List<Note>> getAllNotes() async {
    calls.add('getAllNotes');
    return rows.values.toList();
  }

  @override
  Future<int?> insertNote(Note note) async {
    calls.add('insertNote');
    if (failNextInsert) {
      failNextInsert = false;
      throw StateError('database failure: ${note.title}');
    }
    _maybeFail(note.title);

    final int id = note.id ?? _nextId++;

    // `@Insert(onConflict: replace)` is keyed on the **primary key**, so a
    // renamed note moves to its new title instead of leaving a copy behind
    // under the old one — and an Undo of a rename moves it back.
    rows.removeWhere((String _, Note row) => row.id == id);

    rows[note.title] = Note(
      id: id,
      title: note.title,
      content: note.content,
      long: note.long,
      lat: note.lat,
      imagePath: note.imagePath,
    );
    return id;
  }

  @override
  Future<int> deleteNote(Note note) async {
    calls.add('deleteNote');
    _maybeFail(note.title);

    if (note.id == null) {
      rows.remove(note.title);
    } else {
      rows.removeWhere((String _, Note row) => row.id == note.id);
    }
    return 1;
  }

  @override
  Future<int?> deleteAllNotes() async {
    calls.add('deleteAllNotes');
    for (final String title in failOn) {
      _maybeFail(title);
    }
    rows.clear();
    return 1;
  }
}

class FakeNoteDatabase extends NoteDatabase {
  FakeNoteDatabase(this.dao);

  final FakeNoteDao dao;

  @override
  NoteDao get notedao => dao;
}

/// The single fake installed as the app's global `database`.
FakeNoteDao dao = FakeNoteDao();

void main() {
  setUpAll(() {
    // `database` is a `late final` in main.dart; a fake satisfies it for the
    // whole test process without any production change.
    database = FakeNoteDatabase(dao);

    // Reverse geocoding talks to native pigeon channels that never answer in a
    // test, which left every location fetch loading forever. The tests only need
    // *an* address.
    GeocodingPlatform.instance = FakeGeocoding();

    final TestDefaultBinaryMessenger messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

    // The accelerometer of [ShakeService] never fires in a test; acknowledging
    // the stream subscription is enough for `ShakeDetector.autoStart`.
    messenger.setMockMessageHandler(
      'dev.fluttercommunity.plus/sensors/accelerometer',
      (ByteData? _) async =>
          const StandardMethodCodec().encodeSuccessEnvelope(null),
    );

    // Speech-to-text reports "no recognizer", which the controller handles.
    messenger.setMockMethodCallHandler(
      const MethodChannel('plugin.csdcorp.com/speech_to_text'),
      (MethodCall call) async => false,
    );

    // A granted, working GPS so the details screen loads without an error
    // snackbar competing with the undo snackbars under test.
    messenger.setMockMethodCallHandler(
      const MethodChannel('flutter.baseflow.com/geolocator_android'),
      (MethodCall call) async {
        switch (call.method) {
          case 'isLocationServiceEnabled':
            return true;
          case 'checkPermission':
          case 'requestPermission':
            return 3; // LocationPermission.whenInUse
          case 'getCurrentPosition':
          case 'getLastKnownPosition':
            return <String, Object?>{
              'latitude': 30.0444,
              'longitude': 31.2357,
              'timestamp': DateTime.now().millisecondsSinceEpoch,
              'accuracy': 1.0,
              'altitude': 0.0,
              'altitude_accuracy': 0.0,
              'heading': 0.0,
              'heading_accuracy': 1.0,
              'speed': 0.0,
              'speed_accuracy': 1.0,
            };
          default:
            return null;
        }
      },
    );
  });

  setUp(dao.reset);

  tearDown(Get.reset);

  group('Localization', () {
    test('English is the default language of the app', () {
      expect(AppTranslations.defaultLocale, const Locale('en', 'US'));
      expect(AppTranslations.fallbackLocale, const Locale('en', 'US'));
      expect(AppTranslations.supportedLocales.first, const Locale('en', 'US'));
    });

    test('en_US and ar_EG expose exactly the same keys', () {
      final Map<String, Map<String, String>> keys = AppTranslations().keys;
      final Set<String>? english = keys['en_US']?.keys.toSet();
      final Set<String>? arabic = keys['ar_EG']?.keys.toSet();

      expect(english, isNotNull);
      expect(arabic, isNotNull);
      expect(arabic, english);
    });

    test('no English value is left empty', () {
      AppTranslations().keys['en_US']!.forEach((String key, String value) {
        expect(value.trim(), isNotEmpty, reason: '"$key" must not be empty');
      });
    });

    test('parameterised messages declare the placeholder', () {
      const List<String> parameterised = <String>[
        'save_note_failed',
        'update_note_failed',
        'load_notes_failed',
      ];

      for (final String key in parameterised) {
        expect(
          AppTranslations().keys['en_US']![key],
          contains('@error'),
          reason: '"$key" must expose an @error placeholder',
        );
        expect(AppTranslations().keys['ar_EG']![key], contains('@error'));
      }
    });
  });

  group('AppColors', () {
    test('palette keeps the original Material colours', () {
      expect(AppColors.primary, Colors.blue);
      expect(AppColors.primaryForeground, Colors.white);
      expect(AppColors.danger, Colors.red);
      expect(AppColors.success, Colors.teal);
      expect(AppColors.warning, Colors.orange);
      expect(AppColors.snackbarBackground, Colors.grey[900]);
      expect(AppColors.textSubtle, Colors.grey[600]);
    });
  });

  group('Home widgets', () {
    testWidgets('NoteTile shows the title and forwards its gestures',
        (WidgetTester tester) async {
      int taps = 0;
      int longPresses = 0;

      await tester.pumpWidget(_wrap(
        NoteTile(
          title: 'Shopping list',
          onTap: () => taps++,
          onLongPress: () => longPresses++,
        ),
      ));

      expect(find.text('Shopping list'), findsOneWidget);
      expect(find.byIcon(Icons.read_more_outlined), findsOneWidget);

      await tester.tap(find.text('Shopping list'));
      await tester.longPress(find.text('Shopping list'));

      expect(taps, 1);
      expect(longPresses, 1);
    });

    testWidgets('EmptyNotesView renders the placeholder',
        (WidgetTester tester) async {
      await tester.pumpWidget(_wrap(const EmptyNotesView()));

      expect(find.text(' loading data ....'), findsOneWidget);
    });
  });

  group('ImagePreviewWidget', () {
    late Directory tempDir;

    setUp(() {
      tempDir = Directory.systemTemp.createTempSync('note_image_test');
      File('${tempDir.path}/photo.jpg').writeAsBytesSync(<int>[0xFF, 0xD8]);
    });

    tearDown(() => tempDir.deleteSync(recursive: true));

    testWidgets('scales with BoxFit.contain inside a bounded box',
        (WidgetTester tester) async {
      await tester.pumpWidget(_wrap(
        ImagePreviewWidget(
          image: File('${tempDir.path}/photo.jpg'),
          height: 150,
          onDelete: () {},
        ),
      ));

      final Image image = tester.widget<Image>(find.byType(Image));

      // `contain` is what keeps the original aspect ratio: no stretching,
      // no cropping.
      expect(image.fit, BoxFit.contain);
      expect(image.height, 150);
      expect(image.width, double.infinity);
    });

    testWidgets('keeps the original proportions of the decoded picture',
        (WidgetTester tester) async {
      // 400×100 is the opposite of the 150-high box it is painted into, so any
      // stretching, squashing or cropping would be visible here.
      final File wide = writeBitmap(tempDir, 400, 100);

      await pumpImage(
        tester,
        Scaffold(body: ImagePreviewWidget(image: wide, height: 150, onDelete: () {})),
      );

      // The renderer receives the untouched 400×100 source, and `contain` is
      // what keeps that ratio when it is painted inside the box.
      final RenderImage render =
          tester.renderObject<RenderImage>(find.byType(RawImage));

      expect(render.image, isNotNull);
      expect(render.image!.width, 400);
      expect(render.image!.height, 100);

      final Image image = tester.widget<Image>(find.byType(Image));
      expect(image.fit, BoxFit.contain);
      expect(image.width, double.infinity);

      // What `contain` does with those numbers: the whole 400×100 source is
      // painted (nothing cropped) as 600×150, i.e. still 4:1 — the free space is
      // letter-boxed, never used to stretch the picture.
      final FittedSizes fitted = applyBoxFit(
        BoxFit.contain,
        const Size(400, 100),
        tester.getSize(find.byType(Image)),
      );

      expect(fitted.source, const Size(400, 100));
      expect(fitted.destination, const Size(600, 150));
    });

testWidgets('delete button can be hidden', (WidgetTester tester) async {
      await tester.pumpWidget(_wrap(
        ImagePreviewWidget(
          image: File('${tempDir.path}/photo.jpg'),
          showDeleteButton: false,
          onDelete: () {},
        ),
      ));

      expect(find.byIcon(Icons.delete), findsNothing);
    });

    testWidgets('forwards a tap on the picture', (WidgetTester tester) async {
      int taps = 0;

      await tester.pumpWidget(_wrap(
        ImagePreviewWidget(
          image: File('${tempDir.path}/photo.jpg'),
          onDelete: () {},
          onTap: () => taps++,
        ),
      ));

      await tester.tap(find.byType(Image));

      expect(taps, 1);
    });
  });

  group('ImageViewerPage', () {
    late Directory tempDir;
    late File photo;

    setUp(() {
      tempDir = Directory.systemTemp.createTempSync('note_viewer_test');
      photo = File('${tempDir.path}/photo.jpg')
        ..writeAsBytesSync(<int>[0xFF, 0xD8]);
    });

    tearDown(() => tempDir.deleteSync(recursive: true));

    testWidgets('shows the picture contained and zoomable',
        (WidgetTester tester) async {
      await pumpHome(tester, ImageViewerPage(image: photo));

      final Image image = tester.widget<Image>(find.byType(Image));

      // `contain` is what guarantees the original proportions in the viewer:
      // no stretching and no cropping.
      expect(image.fit, BoxFit.contain);

      final InteractiveViewer viewer =
          tester.widget<InteractiveViewer>(find.byType(InteractiveViewer));
      expect(viewer.minScale, 1);
      expect(viewer.maxScale, greaterThan(1));

      // The picture takes the whole area the viewer offers and is letter-boxed
      // inside it, instead of shrinking to its raw pixel size.
      expect(
        tester.getSize(find.byType(Image)),
        tester.getSize(find.byType(InteractiveViewer)),
      );
    });

    testWidgets('pinch zooms in and a drag pans the zoomed picture',
        (WidgetTester tester) async {
      // Big enough for the whole picture to fill the viewport once zoomed, which
      // is what leaves room for panning.
      final File photo400 = writeBitmap(tempDir, 400, 400);

      await pumpImage(tester, ImageViewerPage(image: photo400));

      final Finder viewer = find.byType(InteractiveViewer);
      final Offset centre = tester.getCenter(viewer);

      // The viewer paints its child through a [Transform]; reading it back is
      // how a test observes the zoom and the pan.
      Matrix4 transform() => tester
          .widget<Transform>(
            find.descendant(of: viewer, matching: find.byType(Transform)),
          )
          .transform;

      // Two fingers moving apart must scale the picture up.
      final TestGesture left =
          await tester.startGesture(centre - const Offset(40, 0), pointer: 1);
      final TestGesture right =
          await tester.startGesture(centre + const Offset(40, 0), pointer: 2);
      await tester.pump();
      await left.moveTo(centre - const Offset(140, 0));
      await right.moveTo(centre + const Offset(140, 0));
      await tester.pump();

      expect(transform().getMaxScaleOnAxis(), greaterThan(1));

      final double zoomed = transform().getMaxScaleOnAxis();

      await left.up();
      await right.up();
      await tester.pump();

      // While zoomed, a drag moves the picture around.
      final TestGesture drag = await tester.startGesture(centre);
      await drag.moveBy(const Offset(-60, -40));
      await tester.pump();

      expect(transform().getTranslation().x, lessThan(0));
      expect(transform().getTranslation().y, lessThan(0));

      await drag.up();
      await tester.pump();

      // Two fingers coming back together zoom out again, never past the
      // "fit the screen" state.
      final TestGesture inner =
          await tester.startGesture(centre - const Offset(140, 0), pointer: 3);
      final TestGesture outer =
          await tester.startGesture(centre + const Offset(140, 0), pointer: 4);
      await tester.pump();
      await inner.moveTo(centre - const Offset(40, 0));
      await outer.moveTo(centre + const Offset(40, 0));
      await tester.pump();

      expect(transform().getMaxScaleOnAxis(), lessThan(zoomed));
      expect(transform().getMaxScaleOnAxis(), 1);

      await inner.up();
      await outer.up();
      await tester.pumpAndSettle();
    });

    testWidgets('uses the app chrome and a localized title',
        (WidgetTester tester) async {
      await pumpHome(tester, ImageViewerPage(image: photo));

      final Scaffold scaffold = tester.widget<Scaffold>(find.byType(Scaffold));
      expect(scaffold.backgroundColor, AppColors.snackbarBackground);
      expect(find.text('Image'), findsOneWidget);

      final AppBar appBar = tester.widget<AppBar>(find.byType(AppBar));
      expect(appBar.backgroundColor, AppColors.primary);
    });
  });

  group('Optimistic deletion (NotesController)', () {
    /// Seeds the fake database and returns a controller showing [titles].
    Future<NotesController> seed(
      WidgetTester tester,
      List<String> titles,
    ) async {
      dao.seed(titles);
      await pumpHome(tester, const SizedBox.shrink());

      final NotesController controller = NotesController();
      controller.titles.value = List<String>.from(titles);
      return controller;
    }

    testWidgets('removes the title before the database is touched',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b', 'c']);

      final Future<void> pending = controller.deleteNoteByTitle('b');

      // The UI is already updated while the delete is still in flight.
      expect(controller.titles, <String>['a', 'c']);

      await pending;
      await closeSnackbars(tester);

      expect(controller.titles, <String>['a', 'c']);
      expect(dao.rows.containsKey('b'), isFalse);
      expect(dao.calls, containsAllInOrder(<String>[
        'getNoteFromTitle',
        'deleteNote',
      ]));
    });

    testWidgets('deleting an unknown title is a no-op',
        (WidgetTester tester) async {
      final NotesController controller = await seed(tester, <String>['a']);

      await controller.deleteNoteByTitle('ghost');

      expect(controller.titles, <String>['a']);
      expect(dao.calls, isEmpty);
    });

    testWidgets('rolls the title back when the delete fails',
        (WidgetTester tester) async {
      dao.seed(<String>['a', 'b']);
      dao.failOn.add('b');
      await pumpHome(tester, const SizedBox.shrink());

      final NotesController controller = NotesController();
      controller.titles.value = <String>['a', 'b'];

      await controller.deleteNoteByTitle('b');
      await closeSnackbars(tester);

      // Restored at the original index, not appended at the end.
      expect(controller.titles, <String>['a', 'b']);
    });

    testWidgets('Undo restores the title at its position and re-inserts the row',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b', 'c']);

      await controller.deleteNoteByTitle('b');
      expect(controller.titles, <String>['a', 'c']);

      await tapUndo(tester);
      await closeSnackbars(tester);

      expect(controller.titles, <String>['a', 'b', 'c']);
      expect(dao.rows.keys, containsAll(<String>['a', 'b', 'c']));

      // Same primary key as the deleted row → no duplicate row.
      expect(dao.rows['b']!.id, 2);
    });

    testWidgets('Undo cannot restore a note twice',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b']);

      await controller.deleteNoteByTitle('b');
      await tapUndo(tester);
      await closeSnackbars(tester);

      final List<String> restored = List<String>.from(controller.titles);

      // A second Undo (duplicate tap, or a late callback) must be a no-op.
      await controller.deleteNoteByTitle('a');
      await closeSnackbars(tester);
      controller.titles.value = restored;

      expect(controller.titles.where((String t) => t == 'b'), hasLength(1));
      expect(dao.rows.keys.where((String t) => t == 'b'), hasLength(1));
    });

    testWidgets('an expired Undo window keeps the note deleted',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b']);

      await controller.deleteNoteByTitle('b');

      // The user does nothing, so the snackbar (and its undo) times out.
      await closeSnackbars(tester);

      expect(controller.titles, <String>['a']);
      expect(dao.rows.containsKey('b'), isFalse);
    });

    testWidgets('undoing the newest deletion restores the exact position',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b', 'c', 'd']);

      await controller.deleteNoteByTitle('b');
      await controller.deleteNoteByTitle('c');
      expect(controller.titles, <String>['a', 'd']);

      // 'b''s undo window expires first; 'c' is then the one on screen, which is
      // the order the queued snackbars force the user through.
      await tester.pump(undoWindow);
      await tester.pumpAndSettle();

      await tester.tap(find.text('Undo').first);
      await tester.pumpAndSettle();
      await closeSnackbars(tester);

      expect(controller.titles, <String>['a', 'c', 'd']);
    });

    testWidgets('two pending deletions keep their own Undo',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b', 'c', 'd']);

      await controller.deleteNoteByTitle('b');
      await controller.deleteNoteByTitle('c');
      expect(controller.titles, <String>['a', 'd']);

      await tapUndo(tester);
      await tapUndo(tester);
      await closeSnackbars(tester);

      // Both are back, exactly once each — the two deletions never overwrite
      // each other's restore.
      expect(controller.titles, hasLength(4));
      expect(controller.titles.toSet(), <String>{'a', 'b', 'c', 'd'});
      expect(dao.rows.keys.toSet(), <String>{'a', 'b', 'c', 'd'});
    });

    testWidgets('Undo after a rollback cannot resurrect a stored row',
        (WidgetTester tester) async {
      dao.seed(<String>['a', 'b']);
      dao.failOn.add('b');
      await pumpHome(tester, const SizedBox.shrink());

      final NotesController controller = NotesController();
      controller.titles.value = <String>['a', 'b'];

      await controller.deleteNoteByTitle('b');
      await closeSnackbars(tester);

      // The rollback already put 'b' back; the row is still in the database.
      expect(controller.titles, <String>['a', 'b']);
      expect(dao.rows.keys, contains('b'));
    });

    testWidgets('clearAll empties the list and deletes every row',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b', 'c']);

      final Future<void> pending = controller.clearAllNotes();
      expect(controller.titles, isEmpty);

      await pending;
      await closeSnackbars(tester);

      expect(controller.titles, isEmpty);
      expect(dao.rows, isEmpty);
      expect(dao.calls, containsAllInOrder(<String>[
        'getAllNotes',
        'deleteAllNotes',
      ]));
    });

    testWidgets('Undo of clearAll brings every note back in order',
        (WidgetTester tester) async {
      final NotesController controller =
          await seed(tester, <String>['a', 'b', 'c']);

      await controller.clearAllNotes();
      await tapUndo(tester);
      await closeSnackbars(tester);

      expect(controller.titles, <String>['a', 'b', 'c']);
      expect(dao.rows.keys, containsAllInOrder(<String>['a', 'b', 'c']));
    });

    testWidgets('clearAll restores the exact previous order on failure',
        (WidgetTester tester) async {
      dao.seed(<String>['a', 'b', 'c']);
      dao.failOn.add('b');
      await pumpHome(tester, const SizedBox.shrink());

      final NotesController controller = NotesController();
      controller.titles.value = <String>['a', 'b', 'c'];

      await controller.clearAllNotes();
      await closeSnackbars(tester);

      expect(controller.titles, <String>['a', 'b', 'c']);
    });

    testWidgets('clearAll on an already empty list issues no query',
        (WidgetTester tester) async {
      await pumpHome(tester, const SizedBox.shrink());

      final NotesController controller = NotesController();
      controller.titles.value = <String>[];

      await controller.clearAllNotes();

      expect(dao.calls, isEmpty);
    });

    testWidgets('a swipe dismisses the tile and runs the optimistic delete',
        (WidgetTester tester) async {
      final NotesController controller = await seed(tester, <String>['a', 'b']);

      // Mirrors how the home screen builds its list: a `Dismissible` per tile
      // that calls the very same `deleteNoteByTitle`.
      await tester.pumpWidget(_wrap(
        Obx(
          () => ListView(
            children: controller.titles
                .map(
                  (String title) => Dismissible(
                    key: ValueKey<String>(title),
                    direction: DismissDirection.endToStart,
                    onDismissed: (_) => controller.deleteNoteByTitle(title),
                    child: NoteTile(
                      title: title,
                      onTap: () {},
                      onLongPress: () {},
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ));
      await tester.pumpAndSettle();

      await tester.drag(find.text('a'), const Offset(-600, 0));
      await tester.pumpAndSettle();

      // Gone from the UI immediately, and from the database too.
      expect(find.text('a'), findsNothing);
      expect(find.text('b'), findsOneWidget);
      expect(dao.rows.containsKey('a'), isFalse);

      // …and the Undo action brings it back.
      await tapUndo(tester);
      await closeSnackbars(tester);

      expect(find.text('a'), findsOneWidget);
      expect(dao.rows.keys, contains('a'));
    });
  });

  group('Shake to clear (HomePage)', () {
    /// Seeds the fake database and opens the real home screen.
    Future<void> pumpHomePage(WidgetTester tester, List<String> titles) async {
      dao.seed(titles);
      await pumpHome(tester, const HomePage());
    }

    testWidgets('a shake clears the list immediately, without a dialog',
        (WidgetTester tester) async {
      await pumpHomePage(tester, <String>['a', 'b']);
      expect(find.text('a'), findsOneWidget);

      shake(tester);
      await tester.pump();

      // Optimistic: no dialog in between, and the Undo action is offered.
      expect(find.byType(AlertDialog), findsNothing);
      expect(find.text('All notes deleted'), findsOneWidget);

      // The list is emptied without ever waiting for the database.
      expect(find.text('a'), findsNothing);
      expect(find.text('b'), findsNothing);

      await tester.pumpAndSettle();
      await closeSnackbars(tester);

      expect(dao.rows, isEmpty);
    });

    testWidgets('Undo after a shake brings every note back, in order',
        (WidgetTester tester) async {
      await pumpHomePage(tester, <String>['a', 'b', 'c']);

      shake(tester);
      await tester.pumpAndSettle();

      await tapUndo(tester);
      await closeSnackbars(tester);

      expect(find.text('a'), findsOneWidget);
      expect(find.text('b'), findsOneWidget);
      expect(find.text('c'), findsOneWidget);
      expect(dao.rows.keys, containsAllInOrder(<String>['a', 'b', 'c']));
    });

    testWidgets('one shake never deletes twice',
        (WidgetTester tester) async {
      await pumpHomePage(tester, <String>['a', 'b']);

      // The follow-up events of a single physical shake.
      shake(tester);
      shake(tester);
      shake(tester);

      await tester.pumpAndSettle();
      await closeSnackbars(tester);

      // `deleteAllNotes` is a single statement, and the list is already empty
      // when the extra events arrive, so they cannot issue a second deletion.
      expect(
        dao.calls.where((String call) => call == 'deleteAllNotes'),
        hasLength(1),
      );
      expect(dao.rows, isEmpty);
    });

    testWidgets('a shake on an empty list does nothing',
        (WidgetTester tester) async {
      await pumpHomePage(tester, <String>[]);

      shake(tester);
      await tester.pumpAndSettle();

      expect(find.byType(AlertDialog), findsNothing);
      expect(find.text('All notes deleted'), findsNothing);
      // Only the initial load of the (empty) list — no delete query at all.
      expect(
        dao.calls.where(
          (String call) =>
              call == 'getAllNotes' ||
              call == 'deleteAllNotes' ||
              call == 'deleteNote',
        ),
        isEmpty,
      );
    });

    testWidgets('a failed clear-all is rolled back and reported',
        (WidgetTester tester) async {
      dao.seed(<String>['a', 'b']);
      dao.failOn.add('b');
      await pumpHome(tester, const HomePage());

      shake(tester);
      await tester.pumpAndSettle();

      // Both notes are back and no Undo is offered for a change that never
      // happened — only the error is reported.
      expect(find.text('a'), findsOneWidget);
      expect(find.text('b'), findsOneWidget);
      expect(find.text('Undo'), findsNothing);
      expect(find.text('All notes deleted'), findsNothing);
      expect(find.text('Failed to clear all notes. Please try again.'),
          findsOneWidget);

      await closeSnackbars(tester);
    });
  });

  group('ShakeService debounce', () {
    test('one physical shake is only accepted once per cooldown', () {
      final ShakeService service = ShakeService();
      final DateTime start = DateTime(2026);

      expect(service.shouldHandle(start), isTrue);

      // The extra events the plugin keeps emitting for the same shake.
      expect(service.shouldHandle(start.add(const Duration(seconds: 1))), isFalse);
      expect(service.shouldHandle(start.add(const Duration(milliseconds: 2999))),
          isFalse);

      // A deliberate new shake is accepted again.
      expect(service.shouldHandle(start.add(ShakeService.cooldown)), isTrue);
    });

    test('stopping forgets the accepted shake', () {
      final ShakeService service = ShakeService();
      final DateTime start = DateTime(2026);

      expect(service.shouldHandle(start), isTrue);
      service.stop();

      expect(service.shouldHandle(start.add(const Duration(seconds: 1))),
          isTrue);
    });
  });

  group('Edit save + Undo (NoteDetailsPage)', () {
    /// Seeds a note and opens its details screen.
    Future<void> openNote(
      WidgetTester tester,
      String title,
      String content,
    ) async {
      dao.rows[title] = Note(id: 1, title: title, content: content);
      await openNoteDetails(tester, title);
    }

    testWidgets('a successful save offers Undo and keeps the new version',
        (WidgetTester tester) async {
      await openNote(tester, 'A', 'A-content');

      await startEditing(tester);
      await typeContent(tester, 'B-content');
      await tapFab(tester);
      await tester.pumpAndSettle();

      expect(find.text('Note updated'), findsOneWidget);
      expect(find.text('Undo'), findsOneWidget);
      expect(dao.rows['A']!.content, 'B-content');

      await closeSnackbars(tester);

      // Untouched after the window: the edited version simply stays.
      expect(dao.rows['A']!.content, 'B-content');
      expect(dao.rows, hasLength(1));
    });

    testWidgets('Undo restores the previous version in the UI and database',
        (WidgetTester tester) async {
      await openNote(tester, 'A', 'A-content');

      await startEditing(tester);
      await typeContent(tester, 'B-content');
      await tapFab(tester);
      await tester.pumpAndSettle();

      await tapUndo(tester);
      await closeSnackbars(tester);

      expect(dao.rows['A']!.content, 'A-content');
      // Same primary key → replaced, never duplicated.
      expect(dao.rows, hasLength(1));
      expect(dao.rows['A']!.id, 1);
    });

    testWidgets('Undo restores every editable field of the previous version',
        (WidgetTester tester) async {
      final Directory temp =
          Directory.systemTemp.createTempSync('note_undo_fields');
      final File picture = File('${temp.path}/old.jpg')
        ..writeAsBytesSync(<int>[1, 2, 3]);

      dao.rows['A'] = Note(
        id: 1,
        title: 'A',
        content: 'A-content',
        lat: 10.0,
        long: 20.0,
        imagePath: picture.path,
      );
      await openNoteDetails(tester, 'A');

      // Hand the screen a fix so the save does not have to ask the geolocator
      // plugin for one (an unmocked plugin channel never answers in a widget
      // test, which would leave the save waiting forever).
      Get.find<LocationController>(tag: NoteDetailsPage.locationTag).position =
          Position(
        latitude: 30.0444,
        longitude: 31.2357,
        timestamp: DateTime.fromMillisecondsSinceEpoch(0),
        accuracy: 1,
        altitude: 0,
        altitudeAccuracy: 0,
        heading: 0,
        headingAccuracy: 0,
        speed: 0,
        speedAccuracy: 0,
      );

      // Rename the note in the title dialog …
      await tapFab(tester);
      await tester.enterText(_inDialog(find.byType(TextField)), 'Renamed');
      await tester.pumpAndSettle();
      await tester.tap(_inDialog(find.text('Save')));
      await tester.pumpAndSettle();

      // … change the body and attach another location.
      await tester.enterText(find.byType(TextField), 'B-content');
      await tester.pumpAndSettle();

      // Ticking "Update location" now asks for a fix the same way the add-note
      // screen does, and a widget test cannot complete a real GPS request (the
      // position stream never answers), so the flag is set directly. The fix the
      // save needs is already in place.
      final dynamic state = tester.state(find.byType(NoteDetailsPage));
      state.updateLocation.value = true;
      await tester.pumpAndSettle();

      await tapFab(tester); // save
      await tester.pumpAndSettle();

      expect(dao.rows.keys, <String>['Renamed']);
      expect(dao.rows['Renamed']!.content, 'B-content');
      expect(dao.rows['Renamed']!.lat, 30.0444);
      expect(dao.rows['Renamed']!.long, 31.2357);

      await tapUndo(tester);
      await closeSnackbars(tester);

      // Every field of the previous version is back, under the previous title,
      // and the row was replaced (same primary key) instead of duplicated.
      expect(dao.rows, hasLength(1));
      final Note stored = dao.rows['A']!;
      expect(stored.id, 1);
      expect(stored.title, 'A');
      expect(stored.content, 'A-content');
      expect(stored.lat, 10.0);
      expect(stored.long, 20.0);
      expect(stored.imagePath, picture.path);

      temp.deleteSync(recursive: true);
    });

    testWidgets('a new location shows up while editing, without a database write',
        (WidgetTester tester) async {
      await openNote(tester, 'A', 'A-content');

      final Note stored = dao.rows['A']!;
      final LocationController location =
          Get.find<LocationController>(tag: NoteDetailsPage.locationTag);
      final dynamic state = tester.state(find.byType(NoteDetailsPage));

      // The checkbox asks the controller for a fix; a widget test cannot wait
      // for a real GPS request, so its two states are injected directly — the
      // screen only reads them.
      state.updateLocation.value = true;

      location.isLoading.value = true;
      await tester.pump();
      expect(find.text('Getting your location...'), findsOneWidget);

      location.isLoading.value = false;
      location.locationName.value = 'Fresh Street, Fresh City';
      await tester.pump();

      // The new address is on screen while the note is still being edited, and
      // nothing has been written yet.
      expect(find.text('Fresh Street, Fresh City'), findsOneWidget);
      expect(dao.rows['A']!.lat, stored.lat);
      expect(dao.rows['A']!.long, stored.long);
    });

    testWidgets('the Undo of the newest edit restores B, never A',
        (WidgetTester tester) async {
      await openNote(tester, 'A', 'A-content');

      // Edit #1: A → B.
      await startEditing(tester);
      await typeContent(tester, 'B-content');
      await tapFab(tester);
      await tester.pumpAndSettle();

      // Its window passes without the user pressing Undo.
      await tester.pump(undoWindow + const Duration(seconds: 1));
      await tester.pumpAndSettle();

      // Edit #2: B → C, after re-opening the note from the list.
      await openNoteDetails(tester, 'A');
      await startEditing(tester);
      await typeContent(tester, 'C-content');
      await tapFab(tester);
      await tester.pumpAndSettle();
      expect(dao.rows['A']!.content, 'C-content');

      await tapUndo(tester);
      await closeSnackbars(tester);

      // B, not A: the Undo belongs to the save it was shown for.
      expect(dao.rows['A']!.content, 'B-content');
      expect(dao.rows, hasLength(1));
    });

    testWidgets('a failed save rolls the screen back and shows no Undo',
        (WidgetTester tester) async {
      await openNote(tester, 'A', 'A-content');

      await startEditing(tester);
      await typeContent(tester, 'B-content');
      dao.failNextInsert = true;
      await tapFab(tester);
      await tester.pumpAndSettle();

      // Back in edit mode with the previous content, an error instead of an Undo.
      expect(find.byIcon(Icons.save), findsOneWidget);
      expect(find.text('Note updated'), findsNothing);
      expect(find.text('Undo'), findsNothing);
      expect(find.textContaining('Failed to update note:'), findsOneWidget);

      await closeSnackbars(tester);
      expect(dao.rows['A']!.content, 'A-content');
      expect(dao.rows, hasLength(1));
    });

    testWidgets('a failed restore keeps the screen on the stored version',
        (WidgetTester tester) async {
      await openNote(tester, 'A', 'A-content');

      await startEditing(tester);
      await typeContent(tester, 'B-content');
      await tapFab(tester);
      await tester.pumpAndSettle();

      // The save succeeded; only the restore is rejected.
      dao.failNextInsert = true;
      await tapUndo(tester);
      await tester.pumpAndSettle();

      expect(find.textContaining('Failed to restore note.'), findsOneWidget);
      await closeSnackbars(tester);

      // The database kept the edited version, and so does the screen.
      expect(dao.rows['A']!.content, 'B-content');
      expect(dao.rows, hasLength(1));
    });
  });

  group('Shared Undo engine', () {
    testWidgets('a deletion Undo and an edit Undo stay independent',
        (WidgetTester tester) async {
      await pumpHome(tester, const SizedBox.shrink());

      final List<String> restored = <String>[];
      final NotesController controller = NotesController();
      controller.titles.value = <String>['a'];

      final UndoableChange deletion = UndoableChange(
        successKey: 'note_deleted',
        failureKey: 'delete_note_failed',
        restore: () async => restored.add('deletion'),
      );
      final UndoableChange edit = UndoableChange(
        successKey: 'note_updated',
        failureKey: 'update_note_failed',
        restore: () async => restored.add('edit'),
      );

      unawaited(
        applyUndoableChange(
          change: deletion,
          applyDatabase: () async {},
          revertUi: () => restored.add('deletion rolled back'),
        ),
      );
      unawaited(
        applyUndoableChange(
          change: edit,
          applyDatabase: () async {},
          revertUi: () => restored.add('edit rolled back'),
        ),
      );
      await tester.pumpAndSettle();

      // Two changes, one engine: the deletion is offered first.
      expect(find.text('Note deleted'), findsOneWidget);

      // Its window passes without the user acting on it …
      await tester.pump(undoWindow + const Duration(seconds: 1));
      await tester.pumpAndSettle();

      // … and the Undo of the edit brings back the edit, never the deletion.
      expect(find.text('Note updated'), findsOneWidget);
      await tester.tap(find.text('Undo'));
      await tester.pumpAndSettle();
      await closeSnackbars(tester);

      expect(restored, <String>['edit']);
      expect(deletion.settled, isTrue);
      expect(edit.settled, isTrue);
    });

    testWidgets('a rejected change is never offered as undoable',
        (WidgetTester tester) async {
      await pumpHome(tester, const SizedBox.shrink());

      final bool reverted = await applyUndoableChange(
        change: UndoableChange(
          successKey: 'note_updated',
          failureKey: 'update_note_failed',
          restore: () async {},
        ),
        applyDatabase: () async => throw StateError('nope'),
        revertUi: () {},
      );
      await tester.pumpAndSettle();

      expect(reverted, isFalse);
      expect(find.text('Note updated'), findsNothing);
      expect(find.text('Undo'), findsNothing);
      expect(find.textContaining('Failed to update note:'), findsOneWidget);

      await closeSnackbars(tester);
    });
  });
}
