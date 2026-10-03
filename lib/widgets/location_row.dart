import 'package:flutter/material.dart';
import 'package:note/utils/app_colors.dart';

/// "Icon + address" row used by both the add-note and the note-details screens
/// to display the resolved location of a note.
class LocationRow extends StatelessWidget {
  const LocationRow({
    super.key,
    required this.label,
    this.padding = EdgeInsets.zero,
    this.iconSize,
  });

  final String label;
  final EdgeInsetsGeometry padding;
  final double? iconSize;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(
        children: <Widget>[
          Icon(
            Icons.location_on,
            color: AppColors.locationColor,
            size: iconSize,
          ),

          const SizedBox(width: 8),

          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                color: AppColors.locationColor,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }
}