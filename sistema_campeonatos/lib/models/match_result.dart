import 'model_utils.dart';

class MatchResult {
  MatchResult({
    required this.id,
    required this.matchId,
    required this.participantId,
    required this.metricKey,
    required this.segment,
    required this.details,
    this.metricValueNumeric,
    this.metricValueText,
    this.createdAt,
  });

  final String id;
  final String matchId;
  final String participantId;
  final String metricKey;
  final int segment;
  final num? metricValueNumeric;
  final String? metricValueText;
  final Map<String, dynamic> details;
  final DateTime? createdAt;

  factory MatchResult.fromJson(Map<String, dynamic> json) {
    return MatchResult(
      id: json['id'] as String,
      matchId: json['match_id'] as String,
      participantId: json['participant_id'] as String,
      metricKey: json['metric_key'] as String,
      metricValueNumeric: json['metric_value_numeric'] as num?,
      metricValueText: json['metric_value_text'] as String?,
      segment: json['segment'] as int? ?? 1,
      details: parseJsonMap(json['details']),
      createdAt: parseDateTime(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'match_id': matchId,
      'participant_id': participantId,
      'metric_key': metricKey,
      'metric_value_numeric': metricValueNumeric,
      'metric_value_text': metricValueText,
      'segment': segment,
      'details': details,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}
