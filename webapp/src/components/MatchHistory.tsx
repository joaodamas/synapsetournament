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
        'id, created_at, status, final_map, score_a, score_b, match_stats(player_id, nickname, kills, assists, deaths, adr, kdr, is_mvp)';

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
          <div className="rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-200">
            <Calendar className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Historico de mixes
            </h1>
            <p className="text-slate-500">
              Resultados e estatisticas de partidas passadas.
            </p>
          </div>
        </header>
      )}

      {error ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-6 text-sm text-slate-500">
          Carregando partidas...
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/80 px-5 py-6 text-sm text-slate-500">
          Nenhuma partida finalizada ainda.
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <MatchRow key={match.id} match={match} />
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

const MatchRow = ({ match }: { match: MatchRowData }) => {
  const [open, setOpen] = useState(false);
  const mvp = match.match_stats?.find((entry) => entry.is_mvp);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full flex-wrap items-center justify-between gap-6 p-6 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <MapIcon size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Mapa
            </p>
            <p className="font-bold text-slate-900">
              {formatMapName(match.final_map)}
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(match.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8 rounded-2xl border border-slate-100 bg-slate-50 px-8 py-2">
          <div className="text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-400">
              Time A
            </span>
            <span className="text-2xl font-black text-slate-900">
              {match.score_a ?? 0}
            </span>
          </div>
          <div className="text-xl font-black text-slate-300">VS</div>
          <div className="text-center">
            <span className="block text-[10px] font-bold uppercase text-slate-400">
              Time B
            </span>
            <span className="text-2xl font-black text-slate-900">
              {match.score_b ?? 0}
            </span>
          </div>
        </div>

        {mvp && (
          <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-2">
            <Award className="text-blue-600" size={18} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">
                Match MVP
              </p>
              <p className="font-bold text-slate-700">{mvp.nickname}</p>
            </div>
            <div className="ml-2 text-right">
              <span className="block text-xs font-black text-blue-600">
                {mvp.kills}K
              </span>
              <span className="text-[10px] text-slate-400">
                {mvp.adr} ADR
              </span>
            </div>
          </div>
        )}

        <ChevronRight
          className={`text-slate-300 transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-5">
          {match.match_stats?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  <tr>
                    <th className="py-2">Jogador</th>
                    <th className="py-2 text-center">K</th>
                    <th className="py-2 text-center">A</th>
                    <th className="py-2 text-center">D</th>
                    <th className="py-2 text-center">ADR</th>
                    <th className="py-2 text-center">KDR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {match.match_stats.map((row) => (
                    <tr key={`${match.id}-${row.player_id}`}>
                      <td className="py-3 font-semibold text-slate-700">
                        {row.nickname}
                        {row.is_mvp && (
                          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-bold uppercase text-yellow-700">
                            MVP
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-center text-slate-600">
                        {row.kills}
                      </td>
                      <td className="py-3 text-center text-slate-600">
                        {row.assists}
                      </td>
                      <td className="py-3 text-center text-slate-600">
                        {row.deaths}
                      </td>
                      <td className="py-3 text-center text-slate-600">
                        {row.adr}
                      </td>
                      <td className="py-3 text-center text-slate-600">
                        {row.kdr}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Nenhum detalhe disponivel para esta partida.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
