import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';

/// Reactive wrapper around the geolocator + geocoding plugins.
///
/// It replaces the ~90 lines of `setState`/snackbar location logic that used to
/// be duplicated in the "add note" and "note details" screens while keeping the
/// exact same user-visible behaviour of each screen:
///
///  * [fetchCurrentLocation] with `reportWithSnackBar: false` reproduces the
///    inline loading / error / retry row of the add-note screen;
///  * `reportWithSnackBar: true` reproduces the snackbar style of the
///    note-details screen.
class LocationController extends GetxController {
  /// Whether a fix is currently being acquired.
  final RxBool isLoading = false.obs;

  /// Human readable address of the last successful fix.
  final RxString locationName = ''.obs;

  /// Localised error message of the last failed attempt.
  final RxString locationError = ''.obs;

  /// Last known position. Read only while saving a note, never in `build`,
  /// which keeps it out of any `Obx` dependency.
  Position? position;

  /// Acquires the current position and (optionally) reverse-geocodes it.
  ///
  /// Returns `true` only when [position] could be refreshed.
  Future<bool> fetchCurrentLocation({bool reportWithSnackBar = false}) async {
    if (reportWithSnackBar) return _fetchWithSnackBars();
    return _fetchInline();
  }

  /// Add-note behaviour: silent, renders through [isLoading] / [locationName] /
  /// [locationError].
  Future<bool> _fetchInline() async {
    isLoading.value = true;
    locationName.value = '';
    locationError.value = '';

    try {
      final bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        locationError.value = 'location_services_disabled'.tr;
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          locationError.value = 'location_permission_denied'.tr;
          return false;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        locationError.value = 'location_permission_denied_forever'.tr;
        return false;
      }

      position = await Geolocator.getCurrentPosition();

      locationName.value = await describeCoordinates(
            position!.latitude,
            position!.longitude,
          ) ??
          'location_unknown'.tr;

      return true;
    } catch (_) {
      locationError.value = 'location_failed'.tr;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /// Note-details behaviour: every failure is reported through a snackbar.
  Future<bool> _fetchWithSnackBars() async {
    try {
      final bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _showError('location_services_disabled');
        return false;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _showError('location_permissions_denied');
          return false;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _showError('location_permissions_denied_forever');
        return false;
      }

      position = await Geolocator.getCurrentPosition();
      return true;
    } catch (_) {
      _showError('location_failed');
      return false;
    }
  }

  /// Reverse-geocodes the given coordinates.
  ///
  /// Returns `null` when no placemark could be resolved so each caller can fall
  /// back to its own message / raw coordinates.
  static Future<String?> describeCoordinates(double lat, double lng) async {
    try {
      final List<Placemark> placemarks =
          await placemarkFromCoordinates(lat, lng);

      if (placemarks.isEmpty) return null;

      final Placemark place = placemarks.first;

      return <String>[
        place.name ?? '',
        place.street ?? '',
        place.locality ?? '',
        place.country ?? '',
      ].where((String part) => part.isNotEmpty).toSet().join(', ');
    } catch (_) {
      return null;
    }
  }

  /// Clears every piece of location state (used when the user unticks the
  /// "save location" checkbox).
  void reset() {
    locationName.value = '';
    locationError.value = '';
    isLoading.value = false;
    position = null;
  }

  static void _showError(String messageKey) {
    Get.snackbar('error_title'.tr, messageKey.tr);
  }
}
