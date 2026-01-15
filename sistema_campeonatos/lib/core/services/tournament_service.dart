import 'package:supabase_flutter/supabase_flutter.dart';

class TournamentService {
  TournamentService({SupabaseClient? client})
      : _client = client ?? Supabase.instance.client;

  final SupabaseClient _client;

  Future<String> createTournament({
    required String name,
    required String format,
    required String gameName,
  }) async {
    final payload = <String, dynamic>{
      'name': name,
      'format': format,
      'game_name': gameName,
      'owner_id': _client.auth.currentUser?.id,
    }..removeWhere((key, value) => value == null);

    final response =
        await _client.from('tournaments').insert(payload).select('id').single();

    return response['id'] as String;
  }

  Future<void> startSingleElimination(String tournamentId) async {
    final participants = await _client
        .from('tournament_participants')
        .select('participant_id, created_at')
        .eq('tournament_id', tournamentId)
        .order('created_at');

    final participantIds = (participants as List)
        .map((row) => row['participant_id'] as String)
        .toList();

    if (participantIds.length < 2) {
      throw Exception('Minimum of 2 participants required.');
    }

    for (var i = 0; i < participantIds.length; i += 2) {
      final first = participantIds[i];
      final second = i + 1 < participantIds.length
          ? participantIds[i + 1]
          : null;

      final matchPayload = <String, dynamic>{
        'tournament_id': tournamentId,
        'round_number': 1,
        'status': second == null ? 'completed' : 'scheduled',
      };

      final match = await _client
          .from('matches')
          .insert(matchPayload)
          .select('id')
          .single();

      final matchParticipants = <Map<String, dynamic>>[
        <String, dynamic>{
          'match_id': match['id'],
          'participant_id': first,
          'slot': 1,
          if (second == null) 'outcome': 'bye',
        },
      ];

      if (second != null) {
        matchParticipants.add(<String, dynamic>{
          'match_id': match['id'],
          'participant_id': second,
          'slot': 2,
        });
      }

      await _client.from('match_participants').insert(matchParticipants);
    }
  }
}
