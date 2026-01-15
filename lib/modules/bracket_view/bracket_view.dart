import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';
import '../../shared/widgets/clean_match_tile.dart';

class BracketRound {
  const BracketRound({
    required this.label,
    required this.matches,
  });

  final String label;
  final List<Map<String, dynamic>> matches;
}

class BracketView extends StatelessWidget {
  const BracketView({
    super.key,
    required this.rounds,
    this.title = 'Bracket',
  });

  final List<BracketRound> rounds;
  final String title;

  @override
  Widget build(BuildContext context) {
    if (rounds.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: const Center(
          child: Text(
            'No matches yet',
            style: TextStyle(color: AppColors.textMuted),
          ),
        ),
      );
    }

    return DefaultTabController(
      length: rounds.length,
      child: Scaffold(
        appBar: AppBar(title: Text(title)),
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: _RoundTabs(rounds: rounds),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: TabBarView(
                  children: rounds
                      .map(
                        (round) => ListView.separated(
                          padding: const EdgeInsets.only(bottom: 24),
                          itemCount: round.matches.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 4),
                          itemBuilder: (context, index) {
                            return CleanMatchTile(
                              match: round.matches[index],
                            );
                          },
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoundTabs extends StatelessWidget {
  const _RoundTabs({required this.rounds});

  final List<BracketRound> rounds;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: AppColors.border),
      ),
      child: TabBar(
        isScrollable: true,
        indicator: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(999),
        ),
        labelPadding: const EdgeInsets.symmetric(horizontal: 16),
        tabs: [
          for (final round in rounds) Tab(text: round.label),
        ],
      ),
    );
  }
}
