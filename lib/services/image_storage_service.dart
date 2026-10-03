import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

/// Owns everything related to capturing and persisting note pictures.
///
/// The picked file is **copied** (never re-encoded or resized) into the app
/// documents directory under a UUID name, so the original bytes/aspect ratio of
/// the photo stay intact and two notes never share a path.
class ImageStorageService {
  ImageStorageService({ImagePicker? picker}) : _picker = picker ?? ImagePicker();

  final ImagePicker _picker;

  /// Opens the camera and stores the capture in the app documents directory.
  ///
  /// Returns `null` when the user cancels the camera.
  Future<File?> captureFromCamera() async {
    final XFile? photo = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );

    if (photo == null) return null;

    final directory = await getApplicationDocumentsDirectory();
    final fileName = '${const Uuid().v4()}.jpg';

    return File(photo.path).copy(p.join(directory.path, fileName));
  }

  /// Rebuilds a [File] from a stored note path.
  ///
  /// Returns `null` when the path is null/empty or the file no longer exists
  /// (for example the user cleared the app storage), so screens never try to
  /// decode a missing image.
  static File? fileFromPath(String? path) {
    if (path == null || path.isEmpty) return null;

    final file = File(path);
    return file.existsSync() ? file : null;
  }
}