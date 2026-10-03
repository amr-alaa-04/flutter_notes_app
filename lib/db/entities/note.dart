import 'package:floor/floor.dart';

@Entity(tableName: 'notes')
class Note {
  @PrimaryKey(autoGenerate: true)
  final int? id;
  final String title;
  final String content;
  final double? long;
  final double? lat;
  final String? imagePath;
  Note({
    this.id,
    required this.title,
    required this.content,
    this.long,
    this.lat,
    this.imagePath,
  });
}
