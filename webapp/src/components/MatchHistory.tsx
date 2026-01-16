import { useEffect, useState } from 'react';
import { Award, Calendar, ChevronRight, Map as MapIcon } from 'lucide-react';

import { supabase } from '../lib/supabase';

type MatchStatRow = {
  player_id: string;
  nickname: string;
  kills: number;
  assists: number;
  deaths: number;
  adr: number;
  kdr: number;
  is_mvp: boolean;
};

type MatchRowData = {
  id: string;
  created_at: string;
  status?: string;
  final_map: string | null;
  score_a: number | null;
  score_b: number | null;
  team_a?: string[] | null;
  team_b?: string[] | null;
  match_stats?: MatchStatRow[];
};

const formatMapName = (mapId: string | null) => {
  if (!mapId) {
    return 'TBD';
  }
  return mapId.replace(/^de_/, '').toUpperCase();
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

type MatchHistoryProps = {
  playerId?: string;
  embedded?: boolean;
};

type MixParticipantRow = {
  mix: MatchRowData | null;
};

export const MatchHistory = ({ playerId, embedded = false }: MatchHistoryProps) => {
  const [matches, setMatches] = useState<MatchRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatches = async () => {
      if (!supabase) {
        setError('Supabase nao configurado.');
        setLoading(false);
        return;
      }

      const baseSelect =
        'id, created_at, status, final_map, score_a, score_b, team_a, team_b, match_stats(player_id, nickname, kills, assists, deaths, adr, kdr, is_mvp)';

      if (playerId) {
        const { data, error: fetchError } = await supabase
          .from('mix_participants')
          .select(`mix:mixes(${baseSelect})`)
          .eq('player_id', playerId)
          .order('created_at', { foreignTable: 'mixes', ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          setLoading(false);
          return;
        }

        const mapped = (data as MixParticipantRow[] | null)
          ?.map((row) => row.mix)
          .filter(
            (row): row is MatchRowData =>
              Boolean(row) && row?.status === 'finished',
          );

        setMatches(mapped ?? []);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('mixes')
        .select(baseSelect)
        .eq('status', 'finished')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setMatches((data as MatchRowData[]) ?? []);
      setLoading(false);
    };

    void fetchMatches();
  }, []);

  const body = (
    <>
      {!embedded && (
        <header className="flex flex-wrap items-center gap-4">
          <div className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 p-3">
            <Calendar className="text-[#7ff7ff]" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-100">
              Historico de mixes
            </h1>
            <p className="text-slate-400">
              Resultados e estatisticas de partidas passadas.
            </p>
          </div>
        </header>
      )}

      {error ? (
        <div className="rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-5 py-4 text-sm text-[#ff8a8a]">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-sm border border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-400">
          Carregando partidas...
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-sm border border-white/10 bg-white/5 px-5 py-6 text-sm text-slate-400">
          Nenhuma partida finalizada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <MatchRow key={match.id} match={match} playerId={playerId} />
          ))}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{body}</div>;
  }

  return (
    <div className="page-shell">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        {body}
      </div>
    </div>
  );
};

const resolveMatchResult = (
  match: MatchRowData,
  playerId?: string,
): 'WIN' | 'LOSS' | 'DRAW' | null => {
  if (!playerId) {
    return null;
  }
  const teamA = Array.isArray(match.team_a) ? match.team_a : [];
  const teamB = Array.isArray(match.team_b) ? match.team_b : [];
  const isTeamA = teamA.includes(playerId);
  const isTeamB = teamB.includes(playerId);
  if (!isTeamA && !isTeamB) {
    return null;
  }
  const scoreA = Number(match.score_a ?? 0);
  const scoreB = Number(match.score_b ?? 0);
  if (scoreA === scoreB) {
    return 'DRAW';
  }
  const win = isTeamA ? scoreA > scoreB : scoreB > scoreA;
  return win ? 'WIN' : 'LOSS';
};

const MatchRow = ({
  match,
  playerId,
}: {
  match: MatchRowData;
  playerId?: string;
}) => {
  const [open, setOpen] = useState(false);
  const mvp = match.match_stats?.find((entry) => entry.is_mvp);
  const result = resolveMatchResult(match, playerId);

  return (
    <div className="overflow-hidden rounded-sm border border-white/5 bg-[#0f1115] transition-all">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full flex-wrap items-center justify-between gap-6 border-l-2 border-[#00f2ff]/30 p-6 text-left transition hover:bg-white/5"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-white/10 bg-[#0b0f14] text-slate-500">
            <MapIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Mapa
            </p>
            <p className="font-bold text-slate-100">
              {formatMapName(match.final_map)}
            </p>
            <p className="text-xs text-slate-500">
              {formatDate(match.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 rounded-sm border border-white/10 bg-[#0b0f14] px-6 py-2 font-mono">
          <div className="text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-500">
              Time A
            </span>
            <span className="text-2xl font-black text-slate-100">
              {match.score_a ?? 0}
            </span>
          </div>
          <div className="text-xl font-black text-slate-600">VS</div>
          <div className="text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-500">
              Time B
            </span>
            <span className="text-2xl font-black text-slate-100">
              {match.score_b ?? 0}
            </span>
          </div>
        </div>

        {result && (
          <div
            className={`rounded-sm border px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${
              result === 'WIN'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                : result === 'LOSS'
                  ? 'border-[#ff3e3e]/50 bg-[#ff3e3e]/10 text-[#ff8a8a]'
                  : 'border-white/10 bg-white/5 text-slate-400'
            }`}
          >
            [{result}]
          </div>
        )}

        {mvp && (
          <div className="flex items-center gap-3 rounded-sm border border-[#00f2ff]/20 bg-[#00f2ff]/5 px-4 py-2">
            <Award className="text-[#00f2ff]" size={18} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Match MVP
              </p>
              <p className="font-bold text-slate-100">{mvp.nickname}</p>
            </div>
            <div className="ml-2 text-right">
              <span className="block text-xs font-black text-[#00f2ff]">
                {mvp.kills}K
              </span>
              <span className="text-[10px] text-slate-500">
                {mvp.adr} ADR
              </span>
            </div>
          </div>
        )}

        <ChevronRight
          className={`text-slate-500 transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10 bg-[#0b0f14] px-6 py-5">
          {match.match_stats?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  <tr>
                    <th className="py-2">Jogador</th>
                    <th className="py-2 text-center">K</th>
                    <th className="py-2 text-center">A</th>
                    <th className="py-2 text-center">D</th>
                    <th className="py-2 text-center">ADR</th>
                    <th className="py-2 text-center">KDR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {match.match_stats.map((row) => (
                    <tr key={`${match.id}-${row.player_id}`}>
                      <td className="py-3 font-semibold text-slate-200">
                        {row.nickname}
                        {row.is_mvp && (
                          <span className="ml-2 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 px-2 py-1 text-[10px] font-bold uppercase text-[#7ff7ff]">
                            MVP
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center text-slate-300">
                        {row.kills}
                      </td>
                      <td className="py-3 text-center text-slate-300">
                        {row.assists}
                      </td>
                      <td className="py-3 text-center text-slate-300">
                        {row.deaths}
                      </td>
                      <td className="py-3 text-center text-slate-300">
                        {row.adr}
                      </td>
                      <td className="py-3 text-center text-slate-300">
                        {row.kdr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Nenhum detalhe disponivel para esta partida.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
