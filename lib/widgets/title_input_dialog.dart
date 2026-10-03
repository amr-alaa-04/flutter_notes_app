import 'package:flutter/material.dart';
import 'package:get/get.dart';

/// Asks the user for a note title and returns it, or `null` when the dialog is
/// cancelled.
///
/// Both note screens share this single dialog so the title prompt can never
/// drift apart between creating and editing a note.
///
/// `Get.defaultDialog` is deliberately **not** used: it lays `confirm`/`cancel`
/// out inside a `Wrap`, which hands them an unbounded width. The buttons of
/// this app are full width (`Expanded` / `double.infinity`), so on current
/// Flutter versions that combination throws a `RenderFlex` assertion while the
/// dialog is being laid out. A plain [AlertDialog] keeps the very same look
/// (title, hint, rounded side-by-side buttons) and lays out correctly.
Future<String?> showTitleInputDialog({
  required BuildContext context,
  required TextEditingController controller,
  required ValueChanged<bool> onChanged,
  bool cancellable = true,
}) {
  return showDialog<String>(
    context: context,
    barrierDismissible: false,
    builder: (BuildContext _) => _TitleInputDialog(
      controller: controller,
      onChanged: onChanged,
      cancellable: cancellable,
    ),
  );
}

class _TitleInputDialog extends StatefulWidget {
  const _TitleInputDialog({
    required this.controller,
    required this.onChanged,
    required this.cancellable,
  });

  final TextEditingController controller;
  final ValueChanged<bool> onChanged;
  final bool cancellable;

  @override
  State<_TitleInputDialog> createState() => _TitleInputDialogState();
}

class _TitleInputDialogState extends State<_TitleInputDialog> {
  /// Mirrors the page side `hasTitle`, so the confirm button can enable itself.
  late bool _hasTitle = widget.controller.text.trim().isNotEmpty;

  static ButtonStyle get _buttonStyle => ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 12),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      );

  void _confirm() => Navigator.of(context).pop(widget.controller.text);

  @override
  Widget build(BuildContext context) {
    final Widget saveButton = ElevatedButton(
      style: _buttonStyle,
      onPressed: _hasTitle ? _confirm : null,
      child: Text('save'.tr),
    );

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text('note_title_dialog_title'.tr, textAlign: TextAlign.center),

      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: widget.controller,
              onChanged: (String value) {
                setState(() => _hasTitle = value.trim().isNotEmpty);
                widget.onChanged(_hasTitle);
              },
              decoration: InputDecoration(
                hintText: 'note_title_dialog_hint'.tr,
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),

          const SizedBox(height: 16),

          if (widget.cancellable)
            Row(
              children: <Widget>[
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text('no'.tr),
                  ),
                ),

                const SizedBox(width: 12),

                Expanded(child: saveButton),
              ],
            )
          else
            SizedBox(width: double.infinity, child: saveButton),
        ],
      ),
    );
  }
}
