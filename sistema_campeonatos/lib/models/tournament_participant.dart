import 'model_utils.dart';

class TournamentParticipant {
  TournamentParticipant({
    required this.tournamentId,
    required this.participantId,
    required this.status,
    this.seed,
    this.createdAt,
  });

  final String tournamentId;
  final String participantId;
  final int? seed;
  final String status;
  final DateTime? createdAt;

  factory TournamentParticipant.fromJson(Map<String, dynamic> json) {
    return TournamentParticipant(
      tournamentId: json['tournament_id'] as String,
      participantId: json['participant_id'] as String,
      seed: json['seed'] as int?,
      status: json['status'] as String? ?? 'active',
      createdAt: parseDateTime(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'tournament_id': tournamentId,
      'participant_id': participantId,
      'seed': seed,
      'status': status,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
