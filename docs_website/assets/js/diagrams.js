/* =========================================================================
   diagrams.js — interactive SVG diagrams (no dependencies).
   Every node explains itself in a detail panel and links to the real source
   file(s) it was derived from.
   ========================================================================= */
(function (global) {
  'use strict';

  function n(id, x, y, w, label, sub, detail, files) {
    return { id: id, x: x, y: y, w: w, h: sub ? 54 : 42, label: label, sub: sub || '', detail: detail || '', files: files || [] };
  }
  function e(from, to, label, dashed) {
    return { from: from, to: to, label: label || '', dashed: !!dashed };
  }

  var list = [
    /* ───────────────────────────── 1. layers ───────────────────────────── */
    {
      id: 'layers',
      title: 'Layer map',
      blurb: 'Who calls whom. Every arrow here exists as a real import in the code.',
      viewBox: '0 0 920 560',
      legend: [
        { color: 'var(--primary)', label: 'UI' },
        { color: 'var(--success)', label: 'Reactive state' },
        { color: 'var(--warning)', label: 'Platform integration' },
        { color: 'var(--text-faint)', label: 'Persistence' }
      ],
      nodes: [
        n('home', 20, 20, 200, 'HomePage', 'screens/home', 'Lists note titles. Owns the two destructive gestures (swipe, shake) and registers the single accelerometer listener in initState / dispose.', ['lib/screens/home/home_page.dart']),
        n('add', 250, 20, 200, 'AddNotePage', 'screens/add_note', 'Creates a note. Title dialog is mandatory and not cancellable; speech, camera and location are collaborators; save is *not* optimistic.', ['lib/screens/add_note/add_note_page.dart']),
        n('detail', 480, 20, 200, 'NoteDetailsPage', 'screens/note_details', 'Views and edits one note that arrives by title through Get.arguments. Save is optimistic with rollback + Undo.', ['lib/screens/note_details/note_details_page.dart']),
        n('viewer', 710, 20, 200, 'ImageViewerPage', 'widgets/image_viewer', 'Full-screen picture with InteractiveViewer (minScale 1, maxScale 5) and BoxFit.contain. Opened by both note screens.', ['lib/widgets/image_viewer.dart']),

        n('preview', 20, 150, 200, 'ImagePreviewWidget', 'widgets', 'Letter-boxed thumbnail in a bounded box; optional delete button; tap opens the viewer.', ['lib/widgets/image_preview_widget.dart']),
        n('speechw', 250, 150, 200, 'SpeechControls', 'widgets', 'Single Obx around the speech area only; labels follow the *recognition* language, not the app language.', ['lib/widgets/speech_controls.dart']),
        n('locrow', 480, 150, 200, 'LocationRow', 'widgets', 'Shared icon + address row used by add-note and note-details.', ['lib/widgets/location_row.dart']),
        n('titledlg', 710, 150, 200, 'showTitleInputDialog', 'widgets/title_input_dialog', 'Plain AlertDialog (not Get.defaultDialog) because full-width buttons in GetX Wrap layout throw RenderFlex.', ['lib/widgets/title_input_dialog.dart']),

        n('notes', 20, 290, 200, 'NotesController', 'RxList<String> titles', 'Single optimistic deletion pipeline for swipe, long-press and shake, plus the Undo restore.', ['lib/controllers/notes_controller.dart']),
        n('speech', 250, 290, 200, 'SpeechController', 'Rx isEnabled / isListening', 'Owns microphone permission, the listening session, locale switching and appending recognised words to the content field.', ['lib/controllers/speech_controller.dart']),
        n('location', 480, 290, 200, 'LocationController', 'Rx isLoading / name / error', 'Wraps geolocator + geocoding. Two fetch modes: inline row (add-note) and snackbar reporting (details).', ['lib/controllers/location_controller.dart']),
        n('colors', 710, 290, 200, 'AppColors', 'utils/app_colors', 'Every colour in the app is declared here; the docs site borrows the same palette.', ['lib/utils/app_colors.dart']),

        n('shake', 20, 430, 200, 'ShakeService', 'services', 'One accelerometer subscription, plugin thresholds plus a 3 s cooldown so one shake can never delete twice.', ['lib/services/shake_service.dart']),
        n('images', 250, 430, 200, 'ImageStorageService', 'services', 'Camera capture copied into the documents directory under a UUID name; never re-encoded.', ['lib/services/image_storage_service.dart']),
        n('undo', 480, 430, 200, 'UndoableChange', 'utils/undoable_change', 'The app\'s single Undo mechanism: window, settle guard, commit/rollback and the shared snackbar.', ['lib/utils/undoable_change.dart']),
        n('dao', 710, 430, 200, 'NoteDao + Floor', 'db/', 'Six SQL methods over the notes table; sqflite is the native handle, Floor generates note_database.g.dart.', ['lib/db/daos/note_dao.dart', 'lib/db/note_database.dart'])
      ],
      edges: [
        e('home', 'notes'), e('home', 'shake'), e('home', 'preview'),
        e('add', 'speech'), e('add', 'location'), e('add', 'preview'), e('add', 'titledlg'), e('add', 'images'),
        e('detail', 'speech'), e('detail', 'location'), e('detail', 'preview'), e('detail', 'undo'), e('detail', 'titledlg'),
        e('preview', 'viewer'), e('speechw', 'speech'), e('locrow', 'location'),
        e('notes', 'undo'), e('notes', 'dao'), e('location', 'images', '', true), e('speech', 'images', '', true)
      ]
    },

    /* ─────────────────────────── 2. navigation ─────────────────────────── */
    {
      id: 'navigation',
      title: 'Navigation & screen flow',
      blurb: 'GetX named-free routing: three routes, two transitions, and a re-read of the list after every return.',
      viewBox: '0 0 900 420',
      nodes: [
        n('start', 20, 170, 180, 'main()', 'runApp', 'Copies the seed database, opens Floor with the migration, then runApp(GetMaterialApp(home: HomePage())).', ['lib/main.dart']),
        n('home', 260, 170, 190, 'HomePage', 'home_title', 'App bar + FAB. Rebuilds from Obx(_notes.titles); EmptyNotesView when the list is empty.', ['lib/screens/home/home_page.dart']),
        n('add', 520, 40, 190, 'AddNotePage', 'Transition.leftToRight', 'Title dialog cannot be cancelled. Pops with Get.back() after a successful insert.', ['lib/screens/add_note/add_note_page.dart']),
        n('details', 520, 300, 190, 'NoteDetailsPage', 'arguments: title', 'Receives only the title; the row is loaded from the database on first build.', ['lib/screens/note_details/note_details_page.dart']),
        n('viewer', 780, 170, 100, 'Image\nViewer', 'rightToLeft', 'Shared by add-note and details.', ['lib/widgets/image_viewer.dart'])
      ],
      edges: [
        e('start', 'home', 'home'),
        e('home', 'add', 'FAB'),
        e('home', 'details', 'tap tile'),
        e('add', 'viewer', 'tap picture'),
        e('details', 'viewer', 'tap picture')
      ]
    },

    /* ─────────────────────────── 3. bootstrap ─────────────────────────── */
    {
      id: 'bootstrap',
      title: 'Bootstrap sequence',
      blurb: 'Cold start to first frame, including the one-time seed copy and the Floor migration.',
      viewBox: '0 0 900 340',
      nodes: [
        n('ensure', 20, 130, 170, 'ensureInitialized', 'WidgetsFlutterBinding', 'Required before touching rootBundle or platform channels.', ['lib/main.dart']),
        n('copy', 220, 130, 190, 'copyDatabase()', 'first launch only', 'Copies assets/database/notes.db to the documents directory. Returns early when the file already exists, so user data is never overwritten.', ['lib/main.dart']),
        n('init', 440, 130, 190, 'initDatabase()', 'Floor builder', 'Opens the same path with addMigrations([migration1to2]) and assigns the late final global `database`.', ['lib/main.dart']),
        n('app', 660, 130, 200, 'runApp(MyApp)', 'GetMaterialApp', 'translations: AppTranslations, locale + fallbackLocale en_US, home: HomePage, debug banner off.', ['lib/main.dart'])
      ],
      edges: [e('ensure', 'copy'), e('copy', 'init'), e('init', 'app')]
    },

    /* ───────────────────── 4. optimistic deletion ───────────────────── */
    {
      id: 'optimistic-delete',
      title: 'Optimistic deletion pipeline',
      blurb: 'Swipe, long-press and shake all converge on NotesController._delete — one implementation, one Undo.',
      viewBox: '0 0 940 470',
      nodes: [
        n('gesture', 20, 20, 170, 'Gesture', 'swipe / shake', 'Dismissible.onDismissed, the delete snackbar button, or _onPhoneShake from the accelerometer.', ['lib/screens/home/home_page.dart']),
        n('sync', 220, 20, 200, 'Remove from Rx list', 'synchronous', 'titles.removeAt / titles.clear happens *before* the first await, so the frame that shows the change is already correct.', ['lib/controllers/notes_controller.dart']),
        n('change', 450, 20, 200, 'UndoableChange', 'created', 'Captures successKey, failureKey and the restore closure; each change owns its own state.', ['lib/utils/undoable_change.dart']),
        n('db', 690, 20, 210, 'Database delete', 'insertNote/deleteNote', 'Row is read first (getNoteFromTitle / getAllNotes) so Undo can write the identical row back with the same id.', ['lib/db/daos/note_dao.dart']),
        n('ok', 450, 200, 200, 'Success', 'settle not yet', 'The optimistic state is kept and the change stays undoable.', ['lib/utils/undoable_change.dart']),
        n('bar', 690, 200, 210, 'Undo snackbar', 'undoWindow = 5 s', 'Timer starts when the snackbar actually opens (GetX queues snackbars), and also settles on CLOSED.', ['lib/utils/undoable_change.dart']),
        n('fail', 220, 380, 200, 'Failure', 'change.failed', 'settle() first so the snackbar can never undo a change that never reached the database.', ['lib/utils/undoable_change.dart']),
        n('revert', 20, 380, 170, 'Rollback UI', 'revertUi()', 'Titles are re-inserted at their original indices; error snackbar is shown.', ['lib/controllers/notes_controller.dart']),
        n('undorestore', 450, 380, 200, 'Undo', 'restore()', 'await change.committed first — a fast tap must never write a row back before the delete lands.', ['lib/utils/undoable_change.dart'])
      ],
      edges: [
        e('gesture', 'sync'), e('sync', 'change'), e('change', 'db'),
        e('db', 'ok', 'success'), e('db', 'fail', 'throws'),
        e('ok', 'bar'), e('fail', 'revert'), e('bar', 'undorestore', 'tap Undo')
      ]
    },

    /* ───────────────────── 5. undo state machine ───────────────────── */
    {
      id: 'undo-state-machine',
      title: 'UndoableChange state machine',
      blurb: 'settled is the single guard: timeout, rollback and the Undo button can each fire it exactly once.',
      viewBox: '0 0 900 400',
      nodes: [
        n('new', 20, 150, 160, 'created', 'settled = false', 'Fresh change; nothing has touched the database yet.', ['lib/utils/undoable_change.dart']),
        n('commit', 220, 150, 180, 'committing', 'committed future', 'commitUndoableChange stores the future so Undo can await it.', ['lib/utils/undoable_change.dart']),
        n('failed', 450, 20, 190, 'failed', 'settled = true', 'revertUi() + showErrorSnackbar(); showUndoSnackbar() refuses to present an Undo for it.', ['lib/utils/undoable_change.dart']),
        n('open', 450, 270, 190, 'snackbar open', 'timer armed', 'The 5 s timer only starts on SnackbarStatus.OPEN.', ['lib/utils/undoable_change.dart']),
        n('settled', 700, 150, 180, 'settled', 'no-op from here', 'Any later Undo tap, timeout or CLOSED callback does nothing.', ['lib/utils/undoable_change.dart'])
      ],
      edges: [
        e('new', 'commit'), e('commit', 'failed', 'throws'), e('commit', 'open', 'success'),
        e('open', 'settled', 'Undo / timeout / swipe'), e('failed', 'settled')
      ]
    },

    /* ─────────────────────────── 6. add note ─────────────────────────── */
    {
      id: 'add-note',
      title: 'Add-note flow',
      blurb: 'The only flow that is deliberately *not* optimistic: the user stays on the page until the insert succeeds.',
      viewBox: '0 0 940 420',
      nodes: [
        n('open', 20, 150, 160, 'open AddNotePage', 'speechTag/locationTag', 'initState puts a tagged SpeechController (initialLocale ar_EG) and LocationController, initialises speech and opens the title dialog post-frame.', ['lib/screens/add_note/add_note_page.dart']),
        n('title', 210, 150, 170, 'Title dialog', 'cancellable: false', 'hasTitle gates the editor, the speech controls and the location checkbox.', ['lib/widgets/title_input_dialog.dart']),
        n('compose', 410, 150, 170, 'Compose', 'content / image', 'Type or dictate; the camera button copies the photo into the documents directory.', ['lib/screens/add_note/add_note_page.dart']),
        n('geo', 610, 30, 170, 'save_location?', 'optimistic inline row', 'Checking it calls fetchCurrentLocation() immediately, so loading / error / retry appear without a database write.', ['lib/controllers/location_controller.dart']),
        n('save', 610, 270, 170, '_saveNote()', 'insertNote', 'Coordinates are resolved *before* the insert; success pops with Get.back(), failure shows a snackbar and keeps the draft.', ['lib/screens/add_note/add_note_page.dart']),
        n('home', 810, 270, 110, 'HomePage', 'loadTitles()', 'Home re-reads the titles after the route returns.', ['lib/screens/home/home_page.dart'])
      ],
      edges: [
        e('open', 'title'), e('title', 'compose'), e('compose', 'geo'), e('compose', 'save'), e('geo', 'save'), e('save', 'home', 'success')
      ]
    },

    /* ───────────────────────── 7. note lifecycle ───────────────────── */
    {
      id: 'note-lifecycle',
      title: 'Note record lifecycle',
      blurb: 'The title is the app-wide identity; the auto-generated id is what keeps Undo from creating duplicates.',
      viewBox: '0 0 940 380',
      nodes: [
        n('insert', 20, 140, 170, 'insertNote', 'OnConflictStrategy.replace', 'Every write goes through this one method — create, edit and Undo-restore alike.', ['lib/db/daos/note_dao.dart']),
        n('row', 230, 140, 180, 'notes row', 'id / title / content', 'long, lat and imagePath are nullable; imagePath was added by migration1to2.', ['lib/db/entities/note.dart']),
        n('list', 450, 20, 180, 'home list', 'select title from notes', 'The list query returns strings only, so no image or coordinate is loaded for the list.', ['lib/db/daos/note_dao.dart']),
        n('detail', 450, 260, 180, 'details screen', 'getNoteFromTitle', 'One row is fetched by title and hydrated into text fields, image and address.', ['lib/db/daos/note_dao.dart']),
        n('edit', 680, 140, 200, 'edit + Undo', 'same id', 'Undo re-inserts the previous snapshot with the same primary key, so replace overwrites instead of duplicating.', ['lib/screens/note_details/note_details_page.dart'])
      ],
      edges: [e('insert', 'row'), e('row', 'list'), e('row', 'detail'), e('detail', 'edit'), e('edit', 'insert', 'Undo')]
    },

    /* ───────────────────────── 8. test map ───────────────────────── */
    {
      id: 'test-map',
      title: 'Test strategy map',
      blurb: '10 groups / 44 tests in one file, with in-memory fakes instead of a real SQLite handle.',
      viewBox: '0 0 920 430',
      nodes: [
        n('fake', 20, 150, 190, 'FakeNoteDao', 'implements NoteDao', 'In-memory Map<String, Note> with failOn, failNextInsert and a call log. Replace semantics are re-implemented so renames behave like SQLite.', ['test/widget_test.dart']),
        n('db', 240, 150, 170, 'FakeNoteDatabase', 'extends NoteDatabase', 'Installed as the global `database` in setUpAll — no production code changes for testing.', ['test/widget_test.dart']),
        n('geo', 440, 20, 190, 'Plugin mocks', 'method channels', 'geolocator returns a granted fix (30.0444, 31.2357), speech_to_text reports no recognizer, the accelerometer stream is acknowledged.', ['test/widget_test.dart']),
        n('geocode', 440, 170, 190, 'FakeGeocoding', 'GeocodingPlatform', 'Native pigeon calls never answer in a test, so placemarkFromCoordinates is replaced with a fixed Fake Street address.', ['test/widget_test.dart']),
        n('bmp', 440, 320, 190, 'writeBitmap', 'real 24-bit BMP', 'Produces a file of exactly known size so decoded proportions can be asserted; pumpImage lets real file I/O progress.', ['test/widget_test.dart']),
        n('groups', 680, 150, 200, '10 test groups', '44 tests', 'Localization, AppColors, Home widgets, ImagePreviewWidget, ImageViewerPage, optimistic deletion, shake, ShakeService debounce, edit + Undo, shared Undo engine.', ['test/widget_test.dart'])
      ],
      edges: [e('fake', 'db'), e('db', 'groups'), e('geo', 'groups'), e('geocode', 'groups'), e('bmp', 'groups')]
    }
  ];

  /* ── renderer ─────────────────────────────────────────────────────────── */
  function center(node) { return { x: node.x + node.w / 2, y: node.y + node.h / 2 }; }

  function path(a, b) {
    var ax = a.x + a.w / 2, ay = a.y + a.h / 2;
    var bx = b.x + b.w / 2, by = b.y + b.h / 2;
    var mx = (ax + bx) / 2;
    return 'M' + ax + ',' + ay + ' C' + mx + ',' + ay + ' ' + mx + ',' + by + ' ' + bx + ',' + by;
  }

  function labelPos(a, b) {
    return { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: (a.y + a.h / 2 + b.y + b.h / 2) / 2 - 6 };
  }

  function svg(diagram) {
    var byId = {};
    diagram.nodes.forEach(function (node) { byId[node.id] = node; });

    var defs = '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="currentColor" class="dg-arrow"/></marker></defs>';

    var edges = diagram.edges.map(function (edge, i) {
      var a = byId[edge.from], b = byId[edge.to];
      if (!a || !b) return '';
      var lp = labelPos(a, b);
      return '<path class="dg-edge' + (edge.dashed ? ' dashed' : '') + '" data-edge="' + i + '" d="' + path(a, b) + '"/>' +
        (edge.label ? '<text class="dg-edge-label" x="' + lp.x + '" y="' + lp.y + '">' + Highlight.escape(edge.label) + '</text>' : '');
    }).join('');

    var nodes = diagram.nodes.map(function (node) {
      var lines = String(node.label).split('\n');
      var first = node.y + (node.sub ? 23 : 27);
      var text = lines.map(function (line, i) {
        return '<text x="' + (node.x + node.w / 2) + '" y="' + (first + i * 14) + '">' + Highlight.escape(line) + '</text>';
      }).join('');
      var sub = node.sub ? '<text class="sub" x="' + (node.x + node.w / 2) + '" y="' + (node.y + 40) + '">' + Highlight.escape(node.sub) + '</text>' : '';
      return '<g class="dg-node" data-node="' + node.id + '" tabindex="0" role="button" aria-label="' + Highlight.escape(node.label.replace('\n', ' ')) + '">' +
        '<rect x="' + node.x + '" y="' + node.y + '" width="' + node.w + '" height="' + node.h + '" rx="10"/>' +
        text + sub + '</g>';
    }).join('');

    return '<svg class="dg-svg" viewBox="' + diagram.viewBox + '" role="img" aria-label="' + Highlight.escape(diagram.title) + '">' + defs + edges + nodes + '</svg>';
  }

  function byId(id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  global.Diagrams = { list: list, byId: byId, svg: svg };
})(window);
