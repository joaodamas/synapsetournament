import 'model_utils.dart';

class MatchParticipant {
  MatchParticipant({
    required this.matchId,
    required this.participantId,
    required this.slot,
    this.seed,
    this.score,
    this.outcome,
    this.createdAt,
  });

  final String matchId;
  final String participantId;
  final int slot;
  final int? seed;
  final num? score;
  final String? outcome;
  final DateTime? createdAt;

  factory MatchParticipant.fromJson(Map<String, dynamic> json) {
    return MatchParticipant(
      matchId: json['match_id'] as String,
      participantId: json['participant_id'] as String,
      slot: json['slot'] as int,
      seed: json['seed'] as int?,
      score: json['score'] as num?,
      outcome: json['outcome'] as String?,
      createdAt: parseDateTime(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'match_id': matchId,
      'participant_id': participantId,
      'slot': slot,
      'seed': seed,
      'score': score,
      'outcome': outcome,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
