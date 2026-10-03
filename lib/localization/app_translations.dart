import 'dart:ui' show Locale;

import 'package:get/get.dart';

/// Application translations.
///
/// The app ships with two languages:
///  * `en_US` – the **default** language of the application.
///  * `ar_EG` – Arabic.
///
/// Every user-visible string added during the refactoring (swipe-to-delete,
/// shake-to-clear, undo after a deletion *and* after an edit,
/// optimistic-rollback messages, database errors…) goes through this class so
/// that no raw text is hardcoded inside widgets or controllers.
///
/// Usage inside a widget / controller:
/// ```dart
/// Text('home_title'.tr)
/// Get.snackbar('error_title'.tr, 'load_notes_failed'.trParams({'error': '$e'}));
/// ```
///
/// The English values are intentionally byte-identical to the strings that the
/// screens displayed before the refactoring, so switching on localization does
/// not change the visual identity of the app.
///
/// Note: the *speech recognition* language dropdown (English / العربية) is a
/// feature setting, not an application language, therefore its own labels stay
/// next to that widget in `SpeechControls`.
class AppTranslations extends Translations {
  @override
  Map<String, Map<String, String>> get keys => <String, Map<String, String>>{
        'en_US': _en,
        'ar_EG': _ar,
      };

  /// Default language. Do not reorder / rename these keys, GetX resolves the
  /// active locale by name (`Locale('en', 'US')` -> `en_US`).
  static const Locale defaultLocale = Locale('en', 'US');
  static const Locale fallbackLocale = Locale('en', 'US');
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en', 'US'),
    Locale('ar', 'EG'),
  ];

  static const Map<String, String> _en = <String, String>{
    // ── Generic ────────────────────────────────────────────────────────────
    'error_title': 'Error',
    'save': 'Save',
    'no': 'No',
    'cancel': 'Cancel',
    'retry': 'Retry',

    // ── Home screen ────────────────────────────────────────────────────────
    'home_title': 'Available notes ',
    'home_loading': ' loading data ....',

    // ── Note title dialog (add + edit) ─────────────────────────────────────
    'note_title_dialog_title': 'Enter Note Title',
    'note_title_dialog_hint': 'Enter title here...',
    'no_title_yet': 'No title yet',
    'title_required': 'Please enter a note title',

    // ── Delete / clear-all / undo ──────────────────────────────────────────
    'delete_note_title': 'Delete Note',
    'delete_note_message': 'Are you sure to delete?',
    'delete': 'Delete',
    'note_deleted': 'Note deleted',
    'all_notes_deleted': 'All notes deleted',
    'note_updated': 'Note updated',
    'undo': 'Undo',
    'undo_hint': 'Tap Undo to restore it.',
    'delete_note_failed': 'Failed to delete note. Please try again.',
    'clear_all_failed': 'Failed to clear all notes. Please try again.',
    'restore_note_failed': 'Failed to restore note. Please try again.',

    // ── Add note ───────────────────────────────────────────────────────────
    'save_note_failed': 'Failed to save note: @error',
    'save_location': 'Save location',

    // ── Note details ───────────────────────────────────────────────────────
    'update_location': 'Update Location',
    'no_content': 'No content to show!',
    'update_note_failed': 'Failed to update note: @error',
    'no_address_found': 'No Address Found',

    // ── Full screen image viewer ───────────────────────────────────────────
    'image_viewer_title': 'Image',

    // ── Location / geocoding ───────────────────────────────────────────────
    'location_services_disabled': 'Location services are disabled.',
    'location_permission_denied': 'Location permission denied.',
    'location_permission_denied_forever':
        'Location permission permanently denied.',
    'location_permissions_denied': 'Location permissions are denied',
    'location_permissions_denied_forever':
        'Location permissions are permanently denied, we cannot request permissions.',
    'location_unknown': 'Unknown location',
    'location_failed': 'Could not get location.',
    'getting_location': 'Getting your location...',

    // ── Database ───────────────────────────────────────────────────────────
    'load_notes_failed': 'Failed to load notes: @error',
  };

  static const Map<String, String> _ar = <String, String>{
    // ── Generic ────────────────────────────────────────────────────────────
    'error_title': 'خطأ',
    'save': 'حفظ',
    'no': 'لا',
    'cancel': 'إلغاء',
    'retry': 'إعادة المحاولة',

    // ── Home screen ────────────────────────────────────────────────────────
    'home_title': 'الملاحظات المتاحة ',
    'home_loading': ' جاري تحميل البيانات ....',

    // ── Note title dialog (add + edit) ─────────────────────────────────────
    'note_title_dialog_title': 'أدخل عنوان الملاحظة',
    'note_title_dialog_hint': 'أدخل العنوان هنا...',
    'no_title_yet': 'لا يوجد عنوان بعد',
    'title_required': 'من فضلك أدخل عنوان للملاحظة',

    // ── Delete / clear-all / undo ──────────────────────────────────────────
    'delete_note_title': 'حذف الملاحظة',
    'delete_note_message': 'هل أنت متأكد من الحذف؟',
    'delete': 'حذف',
    'note_deleted': 'تم حذف الملاحظة',
    'all_notes_deleted': 'تم حذف كل الملاحظات',
    'note_updated': 'تم تحديث الملاحظة',
    'undo': 'تراجع',
    'undo_hint': 'اضغط على «تراجع» لاستعادتها.',
    'delete_note_failed': 'فشل حذف الملاحظة. من فضلك حاول مرة أخرى.',
    'clear_all_failed': 'فشل حذف كل الملاحظات. من فضلك حاول مرة أخرى.',
    'restore_note_failed': 'فشل استعادة الملاحظة. من فضلك حاول مرة أخرى.',

    // ── Add note ───────────────────────────────────────────────────────────
    'save_note_failed': 'فشل حفظ الملاحظة: @error',
    'save_location': 'حفظ الموقع',

    // ── Note details ───────────────────────────────────────────────────────
    'update_location': 'تحديث الموقع',
    'no_content': 'لا يوجد محتوى لعرضه!',
    'update_note_failed': 'فشل تحديث الملاحظة: @error',
    'no_address_found': 'لا يوجد عنوان',

    // ── Full screen image viewer ───────────────────────────────────────────
    'image_viewer_title': 'الصورة',

    // ── Location / geocoding ───────────────────────────────────────────────
    'location_services_disabled': 'خدمات الموقع معطلة.',
    'location_permission_denied': 'تم رفض إذن الموقع.',
    'location_permission_denied_forever': 'تم رفض إذن الموقع بشكل دائم.',
    'location_permissions_denied': 'تم رفض أذونات الموقع',
    'location_permissions_denied_forever':
        'تم رفض أذونات الموقع بشكل دائم، ولا يمكن طلب الأذونات مرة أخرى.',
    'location_unknown': 'موقع غير معروف',
    'location_failed': 'تعذر الحصول على الموقع.',
    'getting_location': 'جاري تحديد موقعك...',

    // ── Database ───────────────────────────────────────────────────────────
    'load_notes_failed': 'فشل تحميل الملاحظات: @error',
  };
}