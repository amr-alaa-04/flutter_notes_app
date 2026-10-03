IMPORTANT: THIS IS A VERY SMALL FINAL MODIFICATION.

The project is already completed and working.

DO NOT refactor the project again.
DO NOT reorganize files.
DO NOT change the architecture.
DO NOT change the UI.
DO NOT change colors.
DO NOT change navigation.
DO NOT change localization.
DO NOT change database structure.
DO NOT change existing features.
DO NOT modify anything unrelated to the two requirements below.

I ONLY want you to make these TWO changes.

Before editing anything, inspect the current implementation and understand how the existing Optimistic UI and image display are currently implemented.

==================================================
1. OPTIMISTIC UI FOR LOCATION DURING EDIT
==================================================

There is already Optimistic UI behavior for location when ADDING a note.

I want the EDIT note flow to behave EXACTLY the same way.

Currently, when editing a note and changing its location:

- The UI should NOT wait for the database operation to finish before showing the new location.
- The new location should appear immediately in the UI, just like it does when adding a note.

Required behavior:

USER EDITS NOTE
        ↓
LOCATION CHANGES
        ↓
UI UPDATES IMMEDIATELY
        ↓
DATABASE UPDATE HAPPENS
        ↓
SUCCESS
        ↓
KEEP THE NEW LOCATION

If the database operation fails:

        ↓
ROLLBACK
        ↓
RESTORE THE PREVIOUS LOCATION
        ↓
SHOW THE EXISTING ERROR HANDLING

IMPORTANT:

Use the SAME Optimistic UI approach that is already implemented for the ADD operation.

Do NOT create a completely different architecture for EDIT.

Reuse the existing:
- GetX Rx state
- Controllers
- Location logic
- Existing helper/service methods
- Existing rollback mechanism

if they already exist.

The goal is consistency:

ADD LOCATION
→ Optimistic UI

EDIT LOCATION
→ Optimistic UI

The user should see the location update immediately during EDIT without waiting for the database.

Do not change how location is detected, geocoded, stored, or displayed except for making the EDIT operation optimistic.

==================================================
2. IMAGE VIEWING — ORIGINAL SIZE AND DIMENSIONS
==================================================

Fix ONLY the behavior when the user opens/views an image.

Currently, when I view an image, it appears too small.

I want the image viewer to display the image using its ORIGINAL dimensions/aspect ratio as much as the available screen allows.

IMPORTANT:

The image must NOT be:
- unnecessarily small
- stretched
- distorted
- cropped
- forced into a tiny fixed-size box

The image should be displayed at its natural/original aspect ratio.

If the original image is large, allow it to occupy the available screen area while preserving its original proportions.

If necessary, allow the user to zoom in/out.

A suitable implementation can use:
- InteractiveViewer
- BoxFit.contain
- AspectRatio
- natural image sizing

depending on the EXISTING implementation.

IMPORTANT:

Do NOT redesign the image UI.

Do NOT change:
- Image cards
- Note layout
- Image thumbnails
- Screen layout
- Padding
- Colors
- Buttons
- Icons
- Navigation

ONLY change what happens when the user opens/views the image.

The thumbnail/list/card appearance should remain exactly as it currently is.

The full image viewer should simply show the image properly at its original aspect ratio and a useful size.

==================================================
3. STRICT SCOPE
==================================================

ONLY modify the code necessary for:

1. Optimistic UI for LOCATION during EDIT.
2. Correct full-size/original-aspect-ratio IMAGE VIEWING.

Do NOT touch anything else.

If you find other issues while inspecting the code:
DO NOT fix them.

Leave unrelated issues exactly as they are.

==================================================
4. IMPORTANT — PRESERVE CURRENT IMPLEMENTATION
==================================================

The previous refactoring is already completed.

DO NOT:
- redo Optimistic UI
- redo GetX conversion
- redo file organization
- redo documentation
- redo shake functionality
- redo colors
- redo localization
- redo database architecture
- rename files
- move widgets
- create unnecessary abstractions

Only make the two requested fixes.

==================================================
5. VALIDATION
==================================================

After making the two changes:

1. Run flutter analyze.
2. Make sure no new errors were introduced.
3. Verify the EDIT location flow.
4. Verify the ADD location flow was NOT broken.
5. Verify image thumbnails were NOT changed.
6. Verify opening an image displays it properly.
7. Verify image aspect ratio is preserved.
8. Verify image viewing does not distort or unnecessarily crop the image.

==================================================
6. FINAL RESPONSE
==================================================

At the end, give me a VERY SHORT report containing ONLY:

1. Files modified.
2. What changed in EDIT location Optimistic UI.
3. What changed in image viewing.
4. flutter analyze result.

Do NOT give me a general project report.

Do NOT describe unrelated changes.

Again:

ONLY TWO CHANGES:

1. EDIT LOCATION → Optimistic UI exactly like ADD LOCATION.
2. IMAGE VIEW → Display the image at its original aspect ratio and useful/full size instead of appearing too small.

DO NOT CHANGE ANYTHING ELSE.