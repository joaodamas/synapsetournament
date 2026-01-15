import type { Player } from '../types';

type BalancedTeams = {
  teamA: Player[];
  teamB: Player[];
  diff?: number;
};

const getPower = (player: Player) =>
  player.gc_level * 100 + player.faceit_level * 50 + (player.elo_interno ?? 0);

export const calculateBalancedTeams = (
  players: Player[],
): BalancedTeams | null => {
  if (players.length !== 10) {
    return null;
  }

  const scoredPlayers = players.map((player) => ({
    ...player,
    power: getPower(player),
  }));

  const sorted = [...scoredPlayers].sort((a, b) => b.power - a.power);

  const teamA: Player[] = [];
  const teamB: Player[] = [];
  const order = [0, 1, 1, 0, 0, 1, 1, 0, 0, 1];

  sorted.forEach((player, index) => {
    if (order[index] === 0) {
      teamA.push(player as Player);
    } else {
      teamB.push(player as Player);
    }
  });

  const averageA =
    teamA.reduce((acc, player) => acc + getPower(player), 0) / 5;
  const averageB =
    teamB.reduce((acc, player) => acc + getPower(player), 0) / 5;

  return { teamA, teamB, diff: Math.abs(averageA - averageB) };
};

export const balanceTeams = calculateBalancedTeams;

export const calculateAverageLevel = (players: Player[]) => {
  if (players.length === 0) {
    return 0;
  }

  const total = players.reduce((acc, player) => acc + getPower(player), 0);

  return Number((total / players.length).toFixed(1));
};
