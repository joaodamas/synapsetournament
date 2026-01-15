import 'model_utils.dart';

class Participant {
  Participant({
    required this.id,
    required this.type,
    required this.displayName,
    required this.metadata,
    this.ownerUserId,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String type;
  final String displayName;
  final String? ownerUserId;
  final Map<String, dynamic> metadata;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Participant.fromJson(Map<String, dynamic> json) {
    return Participant(
      id: json['id'] as String,
      type: json['type'] as String,
      displayName: json['display_name'] as String,
      ownerUserId: json['owner_user_id'] as String?,
      metadata: parseJsonMap(json['metadata']),
      createdAt: parseDateTime(json['created_at']),
      updatedAt: parseDateTime(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'type': type,
      'display_name': displayName,
      'owner_user_id': ownerUserId,
      'metadata': metadata,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
