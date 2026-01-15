import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Target, TrendingUp } from 'lucide-react';

import { MatchHistory } from '../components/MatchHistory';
import { supabase } from '../lib/supabase';

type PlayerProfile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  gc_level: number;
  faceit_level: number;
  gc_profile_url: string | null;
  faceit_profile_url: string | null;
  elo_interno: number;
};

type PlayerStats = {
  kd: string;
  adr: string;
  winrate: string;
};

type ProfilePageProps = {
  playerId: string;
};

type SyncLevelsResponse = {
  player?: PlayerProfile | null;
  warnings?: string[];
  error?: string;
};

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

export const ProfilePage = ({ playerId }: ProfilePageProps) => {
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    kd: '--',
    adr: '--',
    winrate: '--',
  });
  const [gcProfileUrl, setGcProfileUrl] = useState('');
  const [faceitProfileUrl, setFaceitProfileUrl] = useState('');
  const [savingProfile, setSavingProfile] = useState<
    'gc' | 'faceit' | null
  >(null);
  const [profileStatus, setProfileStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!supabase) {
        setError('Supabase nao configurado.');
        setLoading(false);
        return;
      }

      const { data: player, error: playerError } = await supabase
        .from('players')
        .select(
          'id, nickname, avatar_url, gc_level, faceit_level, gc_profile_url, faceit_profile_url, elo_interno',
        )
        .eq('id', playerId)
        .single();

      if (playerError || !player) {
        setError(playerError?.message ?? 'Jogador nao encontrado.');
        setLoading(false);
        return;
      }

      setUser(player as PlayerProfile);
      setGcProfileUrl(player.gc_profile_url ?? '');
      setFaceitProfileUrl(player.faceit_profile_url ?? '');

      const { data: matchStats, error: statsError } = await supabase
        .from('match_stats')
        .select('kills, deaths, adr')
        .eq('player_id', playerId);

      if (statsError) {
        setError(statsError.message);
        setLoading(false);
        return;
      }

      let kd = '--';
      let adr = '--';
      if (matchStats && matchStats.length > 0) {
        const totalKills = matchStats.reduce(
          (acc, row) => acc + Number(row.kills ?? 0),
          0,
        );
        const totalDeaths = matchStats.reduce(
          (acc, row) => acc + Number(row.deaths ?? 0),
          0,
        );
        const totalAdr = matchStats.reduce(
          (acc, row) => acc + Number(row.adr ?? 0),
          0,
        );

        kd = (totalKills / Math.max(1, totalDeaths)).toFixed(2);
        adr = (totalAdr / matchStats.length).toFixed(1);
      }

      const { data: mixes, error: mixesError } = await supabase
        .from('mixes')
        .select('team_a, team_b, score_a, score_b')
        .eq('status', 'finished')
        .limit(200);

      if (mixesError) {
        setError(mixesError.message);
        setLoading(false);
        return;
      }

      const played = (mixes ?? []).filter(
        (mix) =>
          Array.isArray(mix.team_a) && mix.team_a.includes(playerId) ||
          (Array.isArray(mix.team_b) && mix.team_b.includes(playerId)),
      );

      const wins = played.filter((mix) => {
        const scoreA = Number(mix.score_a ?? 0);
        const scoreB = Number(mix.score_b ?? 0);
        if (scoreA === scoreB) {
          return false;
        }
        if (Array.isArray(mix.team_a) && mix.team_a.includes(playerId)) {
          return scoreA > scoreB;
        }
        if (Array.isArray(mix.team_b) && mix.team_b.includes(playerId)) {
          return scoreB > scoreA;
        }
        return false;
      });

      const winrate =
        played.length > 0 ? formatPercent(wins.length / played.length) : '--';

      setStats({ kd, adr, winrate });
      setLoading(false);
    };

    void fetchProfile();
  }, [playerId]);

  const chartBars = useMemo(() => [40, 70, 45, 90, 65, 80, 95], []);

  if (loading) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-500">
          Carregando perfil...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-shell">
        <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-slate-500">
          {error || 'Perfil indisponivel.'}
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (provider: 'gc' | 'faceit') => {
    if (!supabase) {
      setProfileStatus('Supabase nao configurado.');
      return;
    }

    const url =
      provider === 'gc' ? gcProfileUrl.trim() : faceitProfileUrl.trim();

    if (!url) {
      setProfileStatus(
        provider === 'gc'
          ? 'Informe o link do perfil da GamersClub.'
          : 'Informe o link do perfil da Faceit.',
      );
      return;
    }

    setSavingProfile(provider);
    setProfileStatus('');

    const body =
      provider === 'gc'
        ? { playerId, gcProfileUrl: url }
        : { playerId, faceitProfileUrl: url };

    const { data, error: invokeError } =
      await supabase.functions.invoke<SyncLevelsResponse>('sync-levels', {
        body,
      });

    if (invokeError) {
      setProfileStatus(invokeError.message);
      setSavingProfile(null);
      return;
    }

    if (data?.error) {
      setProfileStatus(data.error);
      setSavingProfile(null);
      return;
    }

    if (data?.player) {
      setUser(data.player);
      setGcProfileUrl(data.player.gc_profile_url ?? '');
      setFaceitProfileUrl(data.player.faceit_profile_url ?? '');
    }

    const warningText = data?.warnings?.filter(Boolean).join(' ');
    setProfileStatus(
      warningText || 'Perfil vinculado. Niveis atualizados.',
    );
    setSavingProfile(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col items-center rounded-[3rem] border border-slate-100 bg-white p-8 text-center shadow-xl">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nickname}
                className="mb-6 h-32 w-32 rounded-full border-4 border-blue-500 object-cover shadow-2xl"
              />
            ) : (
              <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-full border-4 border-blue-500 bg-slate-100 text-3xl font-black text-slate-500">
                {user.nickname.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h2 className="text-3xl font-black italic tracking-tight text-slate-900">
              {user.nickname}
            </h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black text-orange-600">
                GC LVL {user.gc_level}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-600">
                FCT LVL {user.faceit_level}
              </span>
            </div>
            <div className="mt-8 w-full border-t border-slate-50 pt-6">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Elo interno
              </p>
              <p className="text-4xl font-black italic text-blue-600">
                {user.elo_interno}
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 gap-6 md:grid-cols-3">
            <StatDetailCard
              icon={<Activity />}
              label="K/D Ratio"
              value={stats.kd}
              color="text-emerald-500"
            />
            <StatDetailCard
              icon={<Target />}
              label="Media ADR"
              value={stats.adr}
              color="text-blue-500"
            />
            <StatDetailCard
              icon={<TrendingUp />}
              label="Winrate"
              value={stats.winrate}
              color="text-indigo-500"
            />

            <div className="md:col-span-3 rounded-[2.5rem] bg-slate-900 p-8 text-white">
              <h3 className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-slate-500">
                Evolucao de Elo
              </h3>
              <div className="flex h-32 items-end gap-2">
                {chartBars.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-t-lg bg-blue-500"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-800">
                Vincular perfis
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Conecte seus perfis para sincronizar os niveis de GC e Faceit.
              </p>
            </div>
            {profileStatus && (
              <span className="text-xs font-semibold text-blue-600">
                {profileStatus}
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                GamersClub
              </p>
              <input
                value={gcProfileUrl}
                onChange={(event) => setGcProfileUrl(event.target.value)}
                placeholder="https://www.gamersclub.com.br/..."
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Nivel atual: <strong>{user.gc_level}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveProfile('gc')}
                  disabled={savingProfile === 'gc'}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {savingProfile === 'gc' ? 'Salvando...' : 'Vincular'}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                Faceit
              </p>
              <input
                value={faceitProfileUrl}
                onChange={(event) => setFaceitProfileUrl(event.target.value)}
                placeholder="https://www.faceit.com/..."
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Nivel atual: <strong>{user.faceit_level}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveProfile('faceit')}
                  disabled={savingProfile === 'faceit'}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                >
                  {savingProfile === 'faceit' ? 'Salvando...' : 'Vincular'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900">
            Ultimas partidas
          </h3>
          <MatchHistory playerId={playerId} embedded />
        </div>
      </div>
    </div>
  );
};

type StatDetailCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  color: string;
};

const StatDetailCard = ({ icon, label, value, color }: StatDetailCardProps) => (
  <div className="flex flex-col items-center justify-center rounded-[2.5rem] border border-slate-100 bg-white p-6 text-center shadow-sm">
    <div className={`${color} mb-3`}>{icon}</div>
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
      {label}
    </p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </div>
);
