import 'package:flutter/material.dart';

import 'core/theme/app_theme.dart';
import 'modules/bracket_view/bracket_view.dart';

void main() {
  runApp(const SynapseApp());
}

class SynapseApp extends StatelessWidget {
  const SynapseApp({super.key});

  static final List<BracketRound> demoRounds = [
    BracketRound(
      label: 'Round 1',
      matches: [
        {
          'match_participants': [
            {
              'display_name': 'Team Atlas',
              'score': 12,
              'slot': 1,
              'outcome': 'win',
            },
            {
              'display_name': 'Team Nova',
              'score': 8,
              'slot': 2,
            },
          ],
        },
        {
          'match_participants': [
            {
              'display_name': 'Team Pulse',
              'score': 14,
              'slot': 1,
              'outcome': 'win',
            },
            {
              'display_name': 'Team Orion',
              'score': 10,
              'slot': 2,
            },
          ],
        },
      ],
    ),
    BracketRound(
      label: 'Round 2',
      matches: [
        {
          'match_participants': [
            {
              'display_name': 'Team Atlas',
              'score': 0,
              'slot': 1,
            },
            {
              'display_name': 'Team Pulse',
              'score': 0,
              'slot': 2,
            },
          ],
        },
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: AppTheme.light(),
      home: BracketView(
        rounds: demoRounds,
        title: 'Tournament Bracket',
      ),
    );
  }
}
