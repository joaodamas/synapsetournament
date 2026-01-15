export type Player = {
  id: string;
  nickname: string;
  steam_id: string;
  faceit_level: number;
  gc_level: number;
  avatar_url?: string;
  elo_interno?: number;
};

export type MixTeam = {
  players: Player[];
  average_level: number;
};

export type MixDispute = {
  id: string;
  creator_id: string;
  players: Player[];
  team_a: Player[];
  team_b: Player[];
  status: 'waiting' | 'sorting' | 'live' | 'finished';
};
