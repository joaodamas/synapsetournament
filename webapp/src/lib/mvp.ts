export type PlayerMatchStats = {
  playerId: string;
  nickname: string;
  avatarUrl?: string | null;
  kills: number;
  assists: number;
  deaths: number;
  adr: number;
};

export const calculateMvpScore = (stats: PlayerMatchStats) => {
  return (
    stats.kills * 1.0 +
    stats.assists * 0.5 +
    stats.adr * 2.0 -
    stats.deaths * 0.3
  );
};

export const pickMvp = (players: PlayerMatchStats[]) => {
  if (players.length === 0) {
    return null;
  }

  return players.reduce((best, current) => {
    if (!best) {
      return current;
    }
    const bestScore = calculateMvpScore(best);
    const currentScore = calculateMvpScore(current);
    return currentScore > bestScore ? current : best;
  }, null as PlayerMatchStats | null);
};
