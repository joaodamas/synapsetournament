import 'model_utils.dart';

class Match {
  Match({
    required this.id,
    required this.tournamentId,
    required this.roundNumber,
    required this.status,
    required this.settings,
    this.bracketPosition,
    this.scheduledAt,
    this.startedAt,
    this.completedAt,
    this.nextMatchId,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String tournamentId;
  final int roundNumber;
  final int? bracketPosition;
  final String status;
  final DateTime? scheduledAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? nextMatchId;
  final Map<String, dynamic> settings;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  factory Match.fromJson(Map<String, dynamic> json) {
    return Match(
      id: json['id'] as String,
      tournamentId: json['tournament_id'] as String,
      roundNumber: json['round_number'] as int? ?? 1,
      bracketPosition: json['bracket_position'] as int?,
      status: json['status'] as String? ?? 'scheduled',
      scheduledAt: parseDateTime(json['scheduled_at']),
      startedAt: parseDateTime(json['started_at']),
      completedAt: parseDateTime(json['completed_at']),
      nextMatchId: json['next_match_id'] as String?,
      settings: parseJsonMap(json['settings']),
      createdAt: parseDateTime(json['created_at']),
      updatedAt: parseDateTime(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'tournament_id': tournamentId,
      'round_number': roundNumber,
      'bracket_position': bracketPosition,
      'status': status,
      'scheduled_at': scheduledAt?.toIso8601String(),
      'started_at': startedAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'next_match_id': nextMatchId,
      'settings': settings,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }
}
