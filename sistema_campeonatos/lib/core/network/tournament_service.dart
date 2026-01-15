import 'package:supabase_flutter/supabase_flutter.dart';

import '../../models/match.dart';
import '../../models/tournament.dart';
import '../../models/tournament_participant.dart';

class MatchParticipantInput {
  MatchParticipantInput({
    required this.participantId,
    required this.slot,
    this.seed,
    this.score,
    this.outcome,
  });

  final String participantId;
  final int slot;
  final int? seed;
  final num? score;
  final String? outcome;

  Map<String, dynamic> toInsertJson(String matchId) {
    return <String, dynamic>{
      'match_id': matchId,
      'participant_id': participantId,
      'slot': slot,
      'seed': seed,
      'score': score,
      'outcome': outcome,
    }..removeWhere((key, value) => value == null);
  }
}

class TournamentService {
  TournamentService(this._client);

  final SupabaseClient _client;

  Future<Tournament> createTournament({
    required String name,
    required String format,
    int? maxParticipants,
    Map<String, dynamic>? settings,
  }) async {
    final payload = <String, dynamic>{
      'name': name,
      'format': format,
      'max_participants': maxParticipants,
      'settings': settings ?? <String, dynamic>{},
    }..removeWhere((key, value) => value == null);

    final data =
        await _client.from('tournaments').insert(payload).select().single();
    return Tournament.fromJson(data);
  }

  Future<TournamentParticipant> joinTournament({
    required String tournamentId,
    required String participantId,
    int? seed,
    String status = 'active',
  }) async {
    final payload = <String, dynamic>{
      'tournament_id': tournamentId,
      'participant_id': participantId,
      'seed': seed,
      'status': status,
    }..removeWhere((key, value) => value == null);

    final data = await _client
        .from('tournament_participants')
        .upsert(payload, onConflict: 'tournament_id,participant_id')
        .select()
        .single();
    return TournamentParticipant.fromJson(data);
  }

  Future<Match> createMatchWithParticipants({
    required String tournamentId,
    required int roundNumber,
    required List<MatchParticipantInput> participants,
    int? bracketPosition,
    String status = 'scheduled',
    DateTime? scheduledAt,
    Map<String, dynamic>? settings,
  }) async {
    if (participants.isEmpty) {
      throw ArgumentError.value(
        participants,
        'participants',
        'At least one participant is required.',
      );
    }

    final slots = participants.map((entry) => entry.slot).toSet();
    if (slots.length != participants.length) {
      throw ArgumentError.value(
        participants,
        'participants',
        'Each participant must use a unique slot.',
      );
    }

    final matchPayload = <String, dynamic>{
      'tournament_id': tournamentId,
      'round_number': roundNumber,
      'bracket_position': bracketPosition,
      'status': status,
      'scheduled_at': scheduledAt?.toIso8601String(),
      'settings': settings ?? <String, dynamic>{},
    }..removeWhere((key, value) => value == null);

    final matchData =
        await _client.from('matches').insert(matchPayload).select().single();
    final match = Match.fromJson(matchData);

    // Two-step write; consider wrapping in an RPC for atomicity if needed.
    final participantsPayload = participants
        .map((entry) => entry.toInsertJson(match.id))
        .toList(growable: false);
    await _client.from('match_participants').insert(participantsPayload);

    return match;
  }

  Future<List<Match>> startSingleElimination({
    required String tournamentId,
    required List<String> participantIds,
    int roundNumber = 1,
  }) async {
    if (participantIds.isEmpty) {
      throw ArgumentError.value(
        participantIds,
        'participantIds',
        'At least one participant is required.',
      );
    }

    final matches = <Match>[];
    var bracketPosition = 1;

    for (var i = 0; i < participantIds.length; i += 2) {
      final first = participantIds[i];
      final second = (i + 1 < participantIds.length)
          ? participantIds[i + 1]
          : null;

      final inputs = <MatchParticipantInput>[
        MatchParticipantInput(
          participantId: first,
          slot: 1,
          outcome: second == null ? 'bye' : null,
        ),
      ];

      var status = 'scheduled';
      if (second != null) {
        inputs.add(MatchParticipantInput(participantId: second, slot: 2));
      } else {
        status = 'completed';
      }

      final match = await createMatchWithParticipants(
        tournamentId: tournamentId,
        roundNumber: roundNumber,
        bracketPosition: bracketPosition,
        status: status,
        participants: inputs,
      );
      matches.add(match);
      bracketPosition += 1;
    }

    return matches;
  }
}
