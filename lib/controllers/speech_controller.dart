import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import 'package:speech_to_text/speech_recognition_error.dart';
import 'package:speech_to_text/speech_recognition_result.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// Reactive wrapper around `package:speech_to_text`.
///
/// It owns the microphone permission flow and the listening session, and it
/// replaces the duplicated `setState` blocks that used to live in both the
/// add-note and the note-details screens. Every value the UI reads is an `Rx`
/// variable, so `SpeechControls` can rebuild through a single small `Obx`
/// instead of rebuilding the whole page.
///
/// One instance is registered per screen with a unique tag (see
/// `Get.put(SpeechController(), tag: ...)`) and removed in `dispose()`, which
/// prevents duplicate microphone listeners.
class SpeechController extends GetxController {
  SpeechController({String initialLocale = defaultLocale}) {
    selectedLocale.value = initialLocale;
  }

  static const String defaultLocale = 'en_US';
  static const String arabicLocale = 'ar_EG';

  final SpeechToText _speechToText = SpeechToText();

  /// Microphone permission granted and the engine is usable.
  final RxBool isEnabled = false.obs;

  /// Permission request / engine warm-up in progress.
  final RxBool isInitializing = false.obs;

  /// A recognition session is currently running.
  final RxBool isListening = false.obs;

  /// Error / progress message shown under the speech buttons.
  final RxString statusText = ''.obs;

  /// Recognition locale (`en_US` or `ar_EG`).
  final RxString selectedLocale = ''.obs;

  /// The speech **recognition** language is a feature setting, not the app
  /// language, so it decides the direction/alignment of the content field.
  bool get isArabic => selectedLocale.value == arabicLocale;

  String _baseText = '';
  TextEditingController? _contentController;

  /// Connects the recognised words to the note's content field.
  void attachContentController(TextEditingController controller) {
    _contentController = controller;
  }

  /// Requests the microphone permission and initialises the engine.
  ///
  /// Safe to call again after a failure (that is what the orange
  /// "allow microphone permission" button does).
  Future<void> initialize() async {
    isInitializing.value = true;
    statusText.value = isArabic
        ? 'جاري طلب إذن المايك والتهيئة...'
        : 'Requesting microphone permission...';

    try {
      isEnabled.value = await _speechToText.initialize(
        onError: (SpeechRecognitionError error) {
          if (isClosed) return;
          statusText.value = isArabic
              ? 'خطأ: ${error.errorMsg}'
              : 'Error: ${error.errorMsg}';
        },
        onStatus: (String status) {
          if (isClosed) return;
          _syncListeningState();
        },
      );

      if (isEnabled.value) {
        statusText.value = '';
      } else {
        statusText.value = isArabic
            ? 'تم رفض الإذن أو المايك غير مدعوم على الجهاز'
            : 'Permission denied or microphone is not supported';
      }
    } catch (error) {
      statusText.value = isArabic
          ? 'حدث خطأ أثناء طلب الإذن: $error'
          : 'An error occurred while requesting permission: $error';
    }

    if (isClosed) return;
    isInitializing.value = false;
    _syncListeningState();
  }

  /// Switches the recognition language. Listening is stopped first so the new
  /// locale is applied to the next session.
  Future<void> changeLocale(String? locale) async {
    if (locale == null || locale == selectedLocale.value) return;

    if (_speechToText.isListening) {
      await _speechToText.stop();
    }

    selectedLocale.value = locale;
    statusText.value = '';
    _syncListeningState();
  }

  /// Starts a recognition session, or stops the running one.
  ///
  /// Recognised words are appended to the text that was already in the content
  /// field, exactly like the previous `setState` implementation did.
  Future<void> toggleListening() async {
    if (!isEnabled.value) {
      await initialize();
      return;
    }

    if (_speechToText.isListening) {
      await _speechToText.stop();
      _syncListeningState();
      return;
    }

    _baseText = _contentController?.text ?? '';
    statusText.value = '';

    await _speechToText.listen(
      onResult: _onSpeechResult,
      listenOptions: SpeechListenOptions(localeId: selectedLocale.value),
    );

    _syncListeningState();
  }

  /// Stops recognition and empties the content field.
  Future<void> clearContent() async {
    if (_speechToText.isListening) {
      await _speechToText.stop();
    }

    _contentController?.clear();
    _syncListeningState();
  }

  @override
  void onClose() {
    if (_speechToText.isListening) {
      _speechToText.stop();
    }
    _contentController = null;
    super.onClose();
  }

  void _onSpeechResult(SpeechRecognitionResult result) {
    if (isClosed) return;

    final TextEditingController? controller = _contentController;
    if (controller == null) return;

    final String recognized = result.recognizedWords;

    controller.text = (_baseText.isNotEmpty && !_baseText.endsWith(' '))
        ? '$_baseText $recognized'
        : '$_baseText$recognized';

    controller.selection = TextSelection.fromPosition(
      TextPosition(offset: controller.text.length),
    );

    _syncListeningState();
  }

  /// Mirrors the plugin's `isListening` flag into the reactive state, which is
  /// what drives the button icon / label.
  void _syncListeningState() {
    if (isClosed) return;
    isListening.value = _speechToText.isListening;
  }
}