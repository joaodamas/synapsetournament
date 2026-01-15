import 'model_utils.dart';

class Tournament {
  Tournament({
    required this.id,
    required this.name,
    required this.format,
    required this.gameName,
    required this.settings,
    this.maxParticipants,
    this.ownerId,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String name;
  final String format;
  final String gameName;
  final int? maxParticipants;
  final String? ownerId;
  final Map<String, dynamic> settings;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Tournament.fromJson(Map<String, dynamic> json) {
    return Tournament(
      id: json['id'] as String,
      name: json['name'] as String,
      format: json['format'] as String,
      gameName: json['game_name'] as String,
      maxParticipants: json['max_participants'] as int?,
      ownerId: json['owner_id'] as String?,
      settings: parseJsonMap(json['settings']),
      createdAt: parseDateTime(json['created_at']),
      updatedAt: parseDateTime(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'name': name,
      'format': format,
      'game_name': gameName,
      'max_participants': maxParticipants,
      'owner_id': ownerId,
      'settings': settings,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
