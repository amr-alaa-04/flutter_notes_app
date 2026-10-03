import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:note/controllers/speech_controller.dart';
import 'package:note/utils/app_colors.dart';

/// Speech-to-text controls shared by the add-note and note-details screens.
///
/// The whole widget is a single `Obx` around the *small* area that actually
/// depends on the speech state, so switching the recognition language or
/// starting/stopListening does not rebuild the rest of the page.
///
/// The English/Arabic labels below belong to the **speech recognition
/// language** (a feature setting chosen in the dropdown), not to the
/// application language, which is handled by `AppTranslations`.
class SpeechControls extends StatelessWidget {
  const SpeechControls({super.key, required this.controller});

  final SpeechController controller;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Obx(() {
        final bool isArabic = controller.isArabic;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(
              isArabic ? 'لغة الكلام' : 'Speech Language',
              textAlign: isArabic ? TextAlign.right : TextAlign.left,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
              ),
            ),

            const SizedBox(height: 4),

            DropdownButtonFormField<String>(
              initialValue: controller.selectedLocale.value,
              decoration: InputDecoration(
                border: const OutlineInputBorder(),
                isDense: true,
                prefixIcon: const Icon(Icons.language, size: 20),
                hintText: isArabic ? 'اختر اللغة' : 'Select language',
              ),
              items: const <DropdownMenuItem<String>>[
                DropdownMenuItem<String>(
                  value: 'en_US',
                  child: Text('English 🇺🇸'),
                ),
                DropdownMenuItem<String>(
                  value: 'ar_EG',
                  child: Text('العربية 🇪🇬'),
                ),
              ],
              onChanged:
                  controller.isListening.value ? null : controller.changeLocale,
            ),

            const SizedBox(height: 10),

            Row(
              children: <Widget>[
                Expanded(
                  child: controller.isInitializing.value
                      ? const Center(child: CircularProgressIndicator())
                      : ElevatedButton.icon(
                          onPressed: controller.isEnabled.value
                              ? controller.toggleListening
                              : controller.initialize,
                          icon: Icon(
                            !controller.isEnabled.value
                                ? Icons.security
                                : (controller.isListening.value
                                    ? Icons.stop
                                    : Icons.mic),
                          ),
                          label: Text(
                            !controller.isEnabled.value
                                ? (isArabic
                                    ? 'السماح بإذن المايك'
                                    : 'Allow Microphone Permission')
                                : (controller.isListening.value
                                    ? (isArabic ? 'إيقاف التسجيل' : 'Stop Listening')
                                    : (isArabic ? 'بدء التسجيل' : 'Start Listening')),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: !controller.isEnabled.value
                                ? AppColors.warning
                                : (controller.isListening.value
                                    ? AppColors.danger
                                    : AppColors.primary),
                            foregroundColor: AppColors.primaryForeground,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                ),

                const SizedBox(width: 8),

                OutlinedButton.icon(
                  onPressed: controller.clearContent,
                  icon: const Icon(Icons.clear, color: AppColors.danger),
                  label: Text(
                    isArabic ? 'مسح' : 'Clear',
                    style: const TextStyle(color: AppColors.danger),
                  ),
                ),
              ],
            ),

            if (controller.statusText.value.isNotEmpty) ...<Widget>[
              const SizedBox(height: 8),

              Text(
                controller.statusText.value,
                textAlign: TextAlign.center,
                textDirection:
                    isArabic ? TextDirection.rtl : TextDirection.ltr,
                style: const TextStyle(
                  color: AppColors.danger,
                  fontSize: 13,
                ),
              ),
            ],

            const SizedBox(height: 6),

            Text(
              isArabic ? 'اللغة الحالية: العربية' : 'Current Language: English',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
              ),
            ),
          ],
        );
      }),
    );
  }
}