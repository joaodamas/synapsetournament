import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

class CleanMatchTile extends StatelessWidget {
  const CleanMatchTile({super.key, required this.match});

  final Map<String, dynamic> match;

  @override
  Widget build(BuildContext context) {
    final participants = _readParticipants(match);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: _buildRows(context, participants),
      ),
    );
  }

  List<Map<String, dynamic>> _readParticipants(Map<String, dynamic> match) {
    final raw = match['match_participants'] ?? match['participants'];
    if (raw is! List) {
      return <Map<String, dynamic>>[];
    }

    return raw
        .whereType<Map>()
        .map((entry) => entry.map(
              (key, value) => MapEntry(key.toString(), value),
            ))
        .toList()
      ..sort(
        (a, b) => _readInt(a['slot']).compareTo(_readInt(b['slot'])),
      );
  }

  List<Widget> _buildRows(
    BuildContext context,
    List<Map<String, dynamic>> participants,
  ) {
    if (participants.isEmpty) {
      return <Widget>[
        _participantRow(
          context,
          name: 'TBD',
          score: null,
          isWinner: false,
        ),
      ];
    }

    final rows = <Widget>[];
    for (var i = 0; i < participants.length; i += 1) {
      final participant = participants[i];
      final score = _readNum(participant['score']);
      final isWinner = _isWinner(participants, participant, score);
      rows.add(
        _participantRow(
          context,
          name: _readName(participant),
          score: score,
          isWinner: isWinner,
        ),
      );

      if (i < participants.length - 1) {
        rows.add(const Divider(height: 1, color: AppColors.divider));
      }
    }

    return rows;
  }

  Widget _participantRow(
    BuildContext context, {
    required String name,
    required num? score,
    required bool isWinner,
  }) {
    final baseStyle = Theme.of(context).textTheme.bodyMedium;
    final scoreText = _formatScore(score);

    return Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Flexible(
            child: Text(
              name,
              overflow: TextOverflow.ellipsis,
              style: baseStyle?.copyWith(
                fontWeight: isWinner ? FontWeight.w600 : FontWeight.w400,
                color: isWinner ? AppColors.textPrimary : AppColors.textMuted,
              ),
            ),
          ),
          Text(
            scoreText,
            style: baseStyle?.copyWith(
              fontWeight: FontWeight.w700,
              color: isWinner ? AppColors.primary : AppColors.textSoft,
            ),
          ),
        ],
      ),
    );
  }

  bool _isWinner(
    List<Map<String, dynamic>> participants,
    Map<String, dynamic> participant,
    num? score,
  ) {
    final outcome = participant['outcome']?.toString();
    if (outcome == 'win') {
      return true;
    }
    if (outcome == 'loss' || outcome == 'forfeit') {
      return false;
    }
    if (score == null) {
      return false;
    }

    num? maxScore;
    for (final entry in participants) {
      final entryScore = _readNum(entry['score']);
      if (entryScore == null) {
        continue;
      }
      if (maxScore == null || entryScore > maxScore) {
        maxScore = entryScore;
      }
    }

    return maxScore != null && score == maxScore;
  }

  String _readName(Map<String, dynamic> participant) {
    return (participant['display_name'] ??
            participant['name'] ??
            participant['participant_name'] ??
            'TBD')
        .toString();
  }

  String _formatScore(num? score) {
    if (score == null) {
      return '-';
    }
    if (score == score.roundToDouble()) {
      return score.toInt().toString();
    }
    return score.toStringAsFixed(1);
  }

  int _readInt(Object? value) {
    if (value is int) {
      return value;
    }
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value) ?? 0;
    }
    return 0;
  }

  num? _readNum(Object? value) {
    if (value is num) {
      return value;
    }
    if (value is String) {
      return num.tryParse(value);
    }
    return null;
  }
}
