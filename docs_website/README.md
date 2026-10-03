# Note App — Interactive Documentation

Static documentation site for the Flutter **Note App** in `C:\courses\DEPI\note`.
It is generated from the project source only: every code block, table row and
diagram node is copied or paraphrased from a real file in `lib/`, `test/`,
`android/`, `pubspec.yaml` or `analysis_options.yaml`.

## How to open it

No build step, no package manager, no network access. Either:

- double-click `index.html`, or
- serve the folder so relative paths behave like they would on a host:

```powershell
C:\flutter\bin\flutter.bat --version   # not required, just noting the toolchain
python -m http.server 8000              # then open http://localhost:8000/
```

## Contents

| Path | Purpose |
| --- | --- |
| `index.html` | Page shell: top bar, sidebar, content host, footer, tool links. |
| `assets/css/styles.css` | Theme tokens (dark/light), layout, cards, tables, code, diagrams, print styles. |
| `assets/js/content.js` | The 38 documentation sections, glossary, interview pack and absent-feature inventory. |
| `assets/js/source.js` | Code-explorer dataset: real excerpts keyed to file paths and line numbers. |
| `assets/js/diagrams.js` | Eight interactive SVG diagrams with clickable nodes. |
| `assets/js/highlight.js` | Dependency-free Dart/SQL/YAML/XML/shell highlighter. |
| `assets/js/app.js` | Hash router, sidebar, search, renderers, tools, theme. |

## Sections

Five parts, 38 numbered sections:

1. **Orientation (1–7)** — what the app is, features, tech stack, dependency inventory, structure, workflow, platform configuration.
2. **Architecture (8–16)** — bootstrap, layers, `Note` entity, DAO, database + migration, GetX, navigation, dependency injection, UI composition.
3. **Features (17–30)** — home list, delete gestures, shake, add note, title dialog, details, edit save, edit Undo, image capture, preview, viewer, location, edit location, speech.
4. **Cross-cutting (31–35)** — localization/theming, optimistic UI, error handling, lifecycle & resources, testing.
5. **Learning & assessment (36–38)** — progressive learning path, interview pack, what the implementation does not contain.

## Tools

- `#/tools/code` — code explorer; `#/tools/code/<file-id>` opens one file.
- `#/tools/diagrams` — interactive diagrams; `#/tools/diagrams/<diagram-id>` opens one.
- `#/tools/interview` — filterable interview questions and answers.
- `#/tools/glossary` — searchable glossary.

## Keyboard

| Key | Action |
| --- | --- |
| `/` | focus search |
| `↑` `↓` `Enter` | move through and open search results |
| `Esc` | close search / sidebar |
| `[` `]` | previous / next section |

## Accuracy rules used while writing

- Absent behaviour is stated as `Not found in the current implementation.` and
  collected in section 38; nothing is described as planned or upcoming.
- `README.md` in the repository root was treated as non-authoritative and was
  not used as a source.
- Counts, versions and API details were taken from `pubspec.yaml`,
  `lib/localization/app_translations.dart`, `test/widget_test.dart` and the
  Android/iOS configuration files.
- The Flutter project itself was not modified by this documentation work.
