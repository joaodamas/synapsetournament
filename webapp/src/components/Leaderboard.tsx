import { useEffect, useMemo, useState } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';

import {
  FaceitLogo,
  GamersClubLogo,
} from './Branding/ProviderLogos';
import {
  getFaceitLevelBadgeClass,
  getGcLevelBadgeClass,
} from '../lib/levels';
import { supabase } from '../lib/supabase';

type LeaderboardPlayer = {
  posicao: number;
  player_id: string;
  nickname: string;
  avatar_url: string | null;
  faceit_level: number;
  gc_level: number;
  elo_interno: number;
};

type PodiumCardProps = {
  player?: LeaderboardPlayer;
  rank: number;
  colorClass: string;
  isMain?: boolean;
};

const PodiumCard = ({
  player,
  rank,
  colorClass,
  isMain = false,
}: PodiumCardProps) => {
  if (!player) {
    return (
      <div
        className={`rounded-sm border border-white/10 bg-[#0f1115] p-6 ${
          isMain ? 'pb-12' : 'pb-8'
        }`}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className={`rounded-sm border-4 ${colorClass} ${
              isMain ? 'h-28 w-28' : 'h-20 w-20'
            } bg-[#0b0f14]`}
          />
          <p className="text-sm font-semibold text-slate-500">
            Aguardando jogador
          </p>
        </div>
      </div>
    );
  }

  const initials = player.nickname.slice(0, 2).toUpperCase();
  const badge =
    rank === 1 ? (
      <Crown className="text-yellow-400" size={18} />
    ) : (
      <Medal
        className={rank === 2 ? 'text-slate-400' : 'text-amber-600'}
        size={18}
      />
    );

  return (
    <div
      className={`rounded-sm border border-white/10 ${colorClass} bg-[#0f1115] p-6 transition-transform hover:-translate-y-0.5 ${
        isMain ? 'pb-12' : 'pb-8'
      }`}
    >
      <div className="flex flex-col items-center text-center">
        <div className="relative mb-4">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.nickname}
              className={`rounded-sm border-4 ${colorClass} ${
                isMain ? 'h-32 w-32' : 'h-24 w-24'
              } object-cover`}
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-sm border-4 ${colorClass} ${
                isMain ? 'h-32 w-32' : 'h-24 w-24'
              } bg-[#0b0f14] text-xl font-bold text-slate-500`}
            >
              {initials}
            </div>
          )}
          <div className="absolute -right-4 -top-4 rounded-sm border border-white/10 bg-[#0b0f14] p-2">
            {badge}
          </div>
        </div>
        <h3
          className={`font-black text-slate-100 ${
            isMain ? 'text-2xl' : 'text-lg'
          }`}
        >
          {player.nickname}
        </h3>
        <p className="mb-4 text-sm font-bold text-[#00f2ff]">
          {player.elo_interno} pts
        </p>
        <div className="flex gap-2">
          <span className={getFaceitLevelBadgeClass(player.faceit_level, 'sm')}>
            <FaceitLogo className="h-3 w-3 text-[#ffb86b]" />
            FACEIT {player.faceit_level}
          </span>
          <span className={getGcLevelBadgeClass(player.gc_level, 'sm')}>
            <GamersClubLogo className="h-3 w-3 text-[#00f2ff]" />
            GC {player.gc_level}
          </span>
        </div>
      </div>
    </div>
  );
};

export const GlobalLeaderboard = () => {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRank = async () => {
      if (!supabase) {
        setError('Supabase nao configurado.');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('leaderboard')
        .select(
          'posicao, player_id, nickname, avatar_url, faceit_level, gc_level, elo_interno',
        )
        .order('posicao', { ascending: true })
        .limit(50);

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setPlayers((data as LeaderboardPlayer[]) ?? []);
      setLoading(false);
    };

    void fetchRank();
  }, []);

  const top3 = useMemo(() => players.slice(0, 3), [players]);
  const others = useMemo(() => players.slice(3), [players]);

  return (
    <div className="page-shell">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <header className="text-center">
          <div className="inline-flex items-center gap-3 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#7ff7ff]">
            Leaderboard
            <Trophy size={18} />
          </div>
          <h1 className="mt-5 font-display text-4xl font-black text-slate-100">
            Global Ranking CS2
          </h1>
          <p className="mt-3 text-slate-400">
            Os melhores jogadores da temporada, com o pool mais competitivo.
          </p>
        </header>

        {error ? (
          <div className="rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-6 py-4 text-sm text-[#ff8a8a]">
            {error}
          </div>
        ) : loading ? (
          <div className="rounded-sm border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
            Carregando ranking...
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-sm border border-white/10 bg-white/5 px-6 py-10 text-center text-sm text-slate-400">
            Nenhum jogador ranqueado ainda.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 items-end gap-8 md:grid-cols-3">
              <div className="order-2 md:order-1">
                <PodiumCard player={top3[1]} rank={2} colorClass="border-slate-300" />
              </div>
              <div className="order-1 md:order-2">
                <PodiumCard
                  player={top3[0]}
                  rank={1}
                  colorClass="border-yellow-400"
                  isMain
                />
              </div>
              <div className="order-3 md:order-3">
                <PodiumCard player={top3[2]} rank={3} colorClass="border-amber-600" />
              </div>
            </section>

            <section className="rounded-sm border border-white/10 bg-[#0f1115]">
              <div className="border-b border-white/10 bg-white/5 px-8 py-5">
                <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-slate-500">
                  Ranking completo
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <th className="px-8 py-4 text-xs font-bold uppercase text-slate-500">
                        Pos
                      </th>
                      <th className="px-8 py-4 text-xs font-bold uppercase text-slate-500">
                        Jogador
                      </th>
                      <th className="px-8 py-4 text-center text-xs font-bold uppercase text-slate-500">
                        Faceit/GC
                      </th>
                      <th className="px-8 py-4 text-right text-xs font-bold uppercase text-slate-500">
                        Elo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {others.map((player) => (
                      <tr
                        key={player.player_id}
                        className="group transition-colors hover:bg-white/5"
                      >
                        <td className="px-8 py-5 font-bold text-slate-500 group-hover:text-[#00f2ff]">
                          #{player.posicao}
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            {player.avatar_url ? (
                              <img
                                src={player.avatar_url}
                                alt={player.nickname}
                                className="h-10 w-10 rounded-sm object-cover grayscale transition group-hover:grayscale-0"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 bg-[#0b0f14] text-xs font-semibold text-slate-500">
                                {player.nickname.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="font-bold text-slate-200">
                              {player.nickname}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <span
                              className={getFaceitLevelBadgeClass(
                                player.faceit_level,
                                'sm',
                              )}
                            >
                              <FaceitLogo className="h-3 w-3 text-[#ffb86b]" />
                              FACEIT {player.faceit_level}
                            </span>
                            <span
                              className={getGcLevelBadgeClass(
                                player.gc_level,
                                'sm',
                              )}
                            >
                              <GamersClubLogo className="h-3 w-3 text-[#00f2ff]" />
                              GC {player.gc_level}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-right font-black text-slate-100">
                          {player.elo_interno}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
