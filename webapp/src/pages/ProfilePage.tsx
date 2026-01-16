import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Activity, Target, TrendingUp } from 'lucide-react';

import { MatchHistory } from '../components/MatchHistory';
import {
  getFaceitLevelBadgeClass,
  getGcLevelBadgeClass,
} from '../lib/levels';
import { supabase } from '../lib/supabase';

type PlayerProfile = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  gc_level: number;
  faceit_level: number;
  gc_profile_url: string | null;
  faceit_profile_url: string | null;
  gc_kd?: number | null;
  gc_adr?: number | null;
  gc_winrate?: number | null;
  elo_interno: number;
};

type PlayerStats = {
  kd: string;
  adr: string;
  winrate: string;
};

type HistoryTab = 'synapse' | 'faceit' | 'gc';

type FaceitMatch = {
  id: string;
  competitionName: string;
  game: string | null;
  region: string | null;
  startedAt: number | null;
  finishedAt: number | null;
  winner: string | null;
  score: Record<string, string> | null;
  kills?: number | null;
  deaths?: number | null;
};

type ProfilePageProps = {
  playerId: string;
};

type SyncLevelsResponse = {
  player?: PlayerProfile | null;
  warnings?: string[];
  error?: string;
};

type FaceitHistoryResponse = {
  matches?: FaceitMatch[];
  error?: string;
};

type FaceitStatsSummary = {
  matches: number | null;
  wins: number | null;
  winRate: number | null;
  kills: number | null;
  deaths: number | null;
  kd: number | null;
  adr: number | null;
  hsPercent: number | null;
  elo: number | null;
  level: number | null;
};

type FaceitMapStat = {
  name: string;
  matches: number | null;
  winRate: number | null;
  kd: number | null;
  adr: number | null;
  hsPercent: number | null;
};

type FaceitStatsResponse = {
  stats?: FaceitStatsSummary;
  maps?: FaceitMapStat[];
  game?: string;
  nickname?: string;
  error?: string;
};

type GcStatsResponse = {
  stats?: {
    kd: number | null;
    adr: number | null;
    winrate: number | null;
  };
  warnings?: string[];
  player?: PlayerProfile | null;
  error?: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const formatFaceitDate = (timestamp: number | null) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp * 1000);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
};

const buildFaceitMatchUrl = (matchId: string) =>
  `https://www.faceit.com/pt-br/cs2/room/${matchId}`;

const formatFaceitValue = (value: number | null, digits = 2) => {
  if (value === null || Number.isNaN(value)) return '--';
  return value.toFixed(digits);
};

const formatFaceitPercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '--';
  return `${value.toFixed(1)}%`;
};

const formatFaceitCount = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '--';
  return Math.round(value).toString();
};

const formatFaceitMapName = (value: string) =>
  value.replace(/^de_/, '').replace(/^cs_/, '').toUpperCase();

const formatFaceitDiff = (kills: number | null, deaths: number | null) => {
  if (kills === null || deaths === null) return '--';
  const diff = Math.round(kills - deaths);
  if (diff > 0) return `+${diff}`;
  return diff.toString();
};

const getFaceitDiffClass = (kills: number | null, deaths: number | null) => {
  if (kills === null || deaths === null) return 'text-slate-400';
  return kills - deaths >= 0 ? 'text-emerald-300' : 'text-[#ff8a8a]';
};

const parseStatNumber = (value: string) => {
  const normalized = value.replace('%', '').replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const averageValues = (values: Array<number | null | undefined>) => {
  const valid = values.filter(
    (value): value is number => typeof value === 'number' && !Number.isNaN(value),
  );
  if (valid.length === 0) {
    return null;
  }
  const total = valid.reduce((acc, value) => acc + value, 0);
  return total / valid.length;
};

const formatAverageValue = (value: number | null, digits = 2) => {
  if (value === null || Number.isNaN(value)) return '--';
  return value.toFixed(digits);
};

const formatAveragePercent = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return '--';
  return `${value.toFixed(1)}%`;
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string' && result.length > 0) {
        resolve(result);
        return;
      }
      reject(new Error('Falha ao ler arquivo.'));
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(file);
  });

const invokeGcStats = async (body: {
  playerId: string;
  gcProfileUrl?: string;
  imageUrl?: string;
  imageBase64?: string;
}) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: 'Supabase nao configurado.' };
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/gc-stats`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: GcStatsResponse | null = null;
  if (text) {
    try {
      payload = JSON.parse(text) as GcStatsResponse;
    } catch (_error) {
      payload = null;
    }
  }

  if (!response.ok) {
    return {
      error:
        payload?.error ||
        text ||
        `Falha ao executar a funcao (status ${response.status}).`,
    };
  }

  return { data: payload };
};

export const ProfilePage = ({ playerId }: ProfilePageProps) => {
  const [user, setUser] = useState<PlayerProfile | null>(null);
  const [stats, setStats] = useState<PlayerStats>({
    kd: '--',
    adr: '--',
    winrate: '--',
  });
  const [historyTab, setHistoryTab] = useState<HistoryTab>('synapse');
  const [faceitMatches, setFaceitMatches] = useState<FaceitMatch[]>([]);
  const [faceitLoading, setFaceitLoading] = useState(false);
  const [faceitError, setFaceitError] = useState('');
  const [faceitLoaded, setFaceitLoaded] = useState(false);
  const [faceitStats, setFaceitStats] = useState<FaceitStatsSummary | null>(
    null,
  );
  const [faceitMaps, setFaceitMaps] = useState<FaceitMapStat[]>([]);
  const [faceitStatsLoading, setFaceitStatsLoading] = useState(false);
  const [faceitStatsError, setFaceitStatsError] = useState('');
  const [faceitStatsGame, setFaceitStatsGame] = useState('');
  const [faceitStatsLoaded, setFaceitStatsLoaded] = useState(false);
  const [gcProfileUrl, setGcProfileUrl] = useState('');
  const [faceitProfileUrl, setFaceitProfileUrl] = useState('');
  const [gcStatsImageUrl, setGcStatsImageUrl] = useState('');
  const [gcStatsImageFile, setGcStatsImageFile] = useState<File | null>(
    null,
  );
  const [gcStatsPreview, setGcStatsPreview] = useState('');
  const [gcStatsLoading, setGcStatsLoading] = useState(false);
  const [gcStatsStatus, setGcStatsStatus] = useState('');
  const [gcStatsError, setGcStatsError] = useState('');
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
          'id, nickname, avatar_url, gc_level, faceit_level, gc_profile_url, faceit_profile_url, gc_kd, gc_adr, gc_winrate, elo_interno',
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

  useEffect(() => {
    setFaceitLoaded(false);
  }, [faceitProfileUrl]);

  useEffect(() => {
    setFaceitStatsLoaded(false);
  }, [faceitProfileUrl]);

  useEffect(() => {
    if (!gcStatsPreview) return undefined;
    return () => URL.revokeObjectURL(gcStatsPreview);
  }, [gcStatsPreview]);

  useEffect(() => {
    const fetchFaceitHistory = async () => {
      if (historyTab !== 'faceit') return;
      if (faceitLoaded) return;
      if (!supabase) {
        setFaceitError('Supabase nao configurado.');
        setFaceitLoaded(true);
        return;
      }
      if (!faceitProfileUrl) {
        setFaceitError('Informe o link da Faceit para carregar partidas.');
        setFaceitMatches([]);
        setFaceitLoaded(true);
        return;
      }

      setFaceitLoading(true);
      setFaceitError('');

      const { data, error: invokeError } =
        await supabase.functions.invoke<FaceitHistoryResponse>(
          'faceit-history',
          { body: { faceitProfileUrl } },
        );

      if (invokeError) {
        setFaceitError(invokeError.message);
        setFaceitLoading(false);
        setFaceitLoaded(true);
        return;
      }

      if (data?.error) {
        setFaceitError(data.error);
        setFaceitLoading(false);
        setFaceitLoaded(true);
        return;
      }

      setFaceitMatches(data?.matches ?? []);
      setFaceitLoading(false);
      setFaceitLoaded(true);
    };

    void fetchFaceitHistory();
  }, [historyTab, faceitProfileUrl, faceitLoaded]);

  useEffect(() => {
    const fetchFaceitStats = async () => {
      if (faceitStatsLoaded) return;
      if (!supabase) {
        if (historyTab === 'faceit') {
          setFaceitStatsError('Supabase nao configurado.');
        }
        setFaceitStats(null);
        setFaceitMaps([]);
        setFaceitStatsLoading(false);
        setFaceitStatsLoaded(true);
        return;
      }
      if (!faceitProfileUrl) {
        if (historyTab === 'faceit') {
          setFaceitStatsError('Informe o link da Faceit para carregar estatisticas.');
        }
        setFaceitStats(null);
        setFaceitMaps([]);
        setFaceitStatsLoading(false);
        setFaceitStatsLoaded(true);
        return;
      }

      setFaceitStatsLoading(true);
      setFaceitStatsError('');

      const { data, error: invokeError } =
        await supabase.functions.invoke<FaceitStatsResponse>('faceit-stats', {
          body: { faceitProfileUrl },
        });

      if (invokeError) {
        setFaceitStatsError(invokeError.message);
        setFaceitStats(null);
        setFaceitMaps([]);
        setFaceitStatsLoading(false);
        setFaceitStatsLoaded(true);
        return;
      }

      if (data?.error) {
        setFaceitStatsError(data.error);
        setFaceitStats(null);
        setFaceitMaps([]);
        setFaceitStatsLoading(false);
        setFaceitStatsLoaded(true);
        return;
      }

      setFaceitStats(data?.stats ?? null);
      setFaceitMaps(data?.maps ?? []);
      setFaceitStatsGame(data?.game ?? '');
      setFaceitStatsLoading(false);
      setFaceitStatsLoaded(true);
    };

    void fetchFaceitStats();
  }, [faceitProfileUrl, faceitStatsLoaded, historyTab]);

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

  const synapseKd = parseStatNumber(stats.kd);
  const synapseAdr = parseStatNumber(stats.adr);
  const synapseWinrate = parseStatNumber(stats.winrate);

  const averageKd = averageValues([
    synapseKd,
    faceitStats?.kd ?? null,
    user.gc_kd ?? null,
  ]);
  const averageAdr = averageValues([
    synapseAdr,
    faceitStats?.adr ?? null,
    user.gc_adr ?? null,
  ]);
  const averageWinrate = averageValues([
    synapseWinrate,
    faceitStats?.winRate ?? null,
    user.gc_winrate ?? null,
  ]);

  const averageKdLabel = formatAverageValue(averageKd, 2);
  const averageAdrLabel = formatAverageValue(averageAdr, 1);
  const averageWinrateLabel = formatAveragePercent(averageWinrate);
  const hasGcStats =
    (user.gc_kd !== null && user.gc_kd !== undefined) ||
    (user.gc_adr !== null && user.gc_adr !== undefined) ||
    (user.gc_winrate !== null && user.gc_winrate !== undefined);

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

  const handleGcImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setGcStatsImageFile(file);
    setGcStatsError('');
    setGcStatsStatus('');
    if (!file) {
      setGcStatsPreview('');
      return;
    }
    setGcStatsImageUrl('');
    setGcStatsPreview(URL.createObjectURL(file));
  };

  const handleGcImageUrlChange = (value: string) => {
    const nextValue = value.trim();
    setGcStatsImageUrl(value);
    if (!gcStatsImageFile) {
      setGcStatsPreview(nextValue);
    }
  };

  const handleGcStatsImport = async (mode: 'image' | 'link') => {
    setGcStatsLoading(true);
    setGcStatsError('');
    setGcStatsStatus('');

    const body: {
      playerId: string;
      gcProfileUrl?: string;
      imageUrl?: string;
      imageBase64?: string;
    } = { playerId };

    if (mode === 'link') {
      const url = gcProfileUrl.trim();
      if (!url) {
        setGcStatsError('Informe o link do perfil GC.');
        setGcStatsLoading(false);
        return;
      }
      body.gcProfileUrl = url;
    } else {
      const imageUrl = gcStatsImageUrl.trim();
      if (gcStatsImageFile) {
        try {
          body.imageBase64 = await readFileAsDataUrl(gcStatsImageFile);
        } catch (_error) {
          setGcStatsError('Falha ao ler a imagem.');
          setGcStatsLoading(false);
          return;
        }
      } else if (imageUrl) {
        body.imageUrl = imageUrl;
      } else {
        setGcStatsError('Envie a imagem ou o link do print.');
        setGcStatsLoading(false);
        return;
      }
    }

    const { data, error: invokeError } = await invokeGcStats(body);
    if (invokeError) {
      setGcStatsError(invokeError);
      setGcStatsLoading(false);
      return;
    }

    if (data?.error) {
      setGcStatsError(data.error);
      setGcStatsLoading(false);
      return;
    }

    if (data?.player) {
      setUser(data.player);
      setGcProfileUrl(data.player.gc_profile_url ?? gcProfileUrl);
    } else if (data?.stats) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              gc_kd: data.stats?.kd ?? prev.gc_kd,
              gc_adr: data.stats?.adr ?? prev.gc_adr,
              gc_winrate: data.stats?.winrate ?? prev.gc_winrate,
            }
          : prev,
      );
    }

    const warningText = data?.warnings?.filter(Boolean).join(' ');
    setGcStatsStatus(warningText || 'Stats GC atualizados.');
    setGcStatsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050505] px-6 py-12 text-slate-200">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="flex flex-col items-center rounded-sm border border-white/5 bg-[#0f1115] p-8 text-center">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.nickname}
                className="mb-6 h-32 w-32 rounded-sm border-4 border-[#00f2ff] object-cover shadow-[0_0_25px_rgba(0,242,255,0.25)] grayscale"
              />
            ) : (
              <div className="mb-6 flex h-32 w-32 items-center justify-center rounded-sm border-4 border-[#00f2ff] bg-[#0b0f14] text-3xl font-black text-slate-500">
                {user.nickname.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h2 className="text-3xl font-black italic tracking-tight text-slate-100">
              {user.nickname}
            </h2>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className={getGcLevelBadgeClass(user.gc_level)}>
                GC LVL {user.gc_level}
              </span>
              <span className={getFaceitLevelBadgeClass(user.faceit_level)}>
                FACEIT LVL {user.faceit_level}
              </span>
            </div>
            <div className="mt-8 w-full border-t border-white/10 pt-6">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Elo interno
              </p>
              <p className="text-4xl font-black italic text-[#00f2ff]">
                {user.elo_interno}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:col-span-2">
            <StatDetailCard
              icon={<Activity />}
              label="K/D Ratio"
              value={averageKdLabel}
              color="text-emerald-300"
            />
            <StatDetailCard
              icon={<Target />}
              label="Media ADR"
              value={averageAdrLabel}
              color="text-[#00f2ff]"
            />
            <StatDetailCard
              icon={<TrendingUp />}
              label="Winrate"
              value={averageWinrateLabel}
              color="text-[#00f2ff]"
            />

            <div className="relative md:col-span-3 rounded-sm border border-white/10 bg-[#0b0f14] p-8 text-white">
              <h3 className="mb-4 text-sm font-black uppercase tracking-[0.3em] text-slate-500">
                Evolucao de Elo
              </h3>
              <div className="relative h-32">
                <svg
                  viewBox="0 0 100 100"
                  className="h-full w-full"
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="#00f2ff"
                    strokeWidth="2"
                    points={chartBars
                      .map((value, index) => {
                        const x = (index / (chartBars.length - 1)) * 100;
                        const y = 100 - value;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-12 rounded-sm border border-white/5 bg-[#0f1115] p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-100">
                Vincular perfis
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Conecte seus perfis para sincronizar os niveis de GC e Faceit.
              </p>
            </div>
            {profileStatus && (
              <span className="text-xs font-semibold text-[#00f2ff]">
                {profileStatus}
              </span>
            )}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                GamersClub
              </div>
              <input
                value={gcProfileUrl}
                onChange={(event) => setGcProfileUrl(event.target.value)}
                placeholder="https://www.gamersclub.com.br/..."
                className="mt-3 w-full rounded-sm border border-white/10 bg-[#0b0f14] px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition focus:border-[#00f2ff]"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Nivel atual:{' '}
                  <span className={getGcLevelBadgeClass(user.gc_level, 'sm')}>
                    GC {user.gc_level}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveProfile('gc')}
                  disabled={savingProfile === 'gc'}
                  className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
                >
                  {savingProfile === 'gc' ? 'Salvando...' : 'Vincular'}
                </button>
              </div>
            </div>

            <div className="rounded-sm border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                Faceit
              </div>
              <input
                value={faceitProfileUrl}
                onChange={(event) => setFaceitProfileUrl(event.target.value)}
                placeholder="https://www.faceit.com/..."
                className="mt-3 w-full rounded-sm border border-white/10 bg-[#0b0f14] px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition focus:border-[#00f2ff]"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Nivel atual:{' '}
                  <span
                    className={getFaceitLevelBadgeClass(
                      user.faceit_level,
                      'sm',
                    )}
                  >
                    FACEIT {user.faceit_level}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveProfile('faceit')}
                  disabled={savingProfile === 'faceit'}
                  className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
                >
                  {savingProfile === 'faceit' ? 'Salvando...' : 'Vincular'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-100">
              Ultimas partidas
            </h3>
            <div className="flex flex-wrap gap-2 rounded-sm border border-white/10 bg-white/5 p-2">
              {([
                { id: 'synapse', label: 'SynapseCS' },
                { id: 'faceit', label: 'Faceit' },
                { id: 'gc', label: 'GamersClub' },
              ] as const).map((tab) => {
                const isActive = historyTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setHistoryTab(tab.id)}
                    className={`rounded-sm px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] transition ${
                      isActive
                        ? 'bg-[#00f2ff] text-[#050505] shadow-[0_0_16px_rgba(0,242,255,0.35)]'
                        : 'text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-sm border border-white/5 bg-[#0f1115] p-6">
            {historyTab === 'synapse' && (
              <MatchHistory playerId={playerId} embedded />
            )}

            {historyTab === 'faceit' && (
              <div className="space-y-6">
                <div className="rounded-sm border border-white/10 bg-[#0b0f14] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Faceit Stats
                      </p>
                      <p className="text-xs text-slate-500">
                        Atualizacao ao vivo
                      </p>
                    </div>
                    {faceitStatsGame && (
                      <span className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-[#7ff7ff]">
                        {faceitStatsGame.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {faceitStatsLoading ? (
                    <div className="mt-4 text-sm text-slate-400">
                      Carregando estatisticas da Faceit...
                    </div>
                  ) : faceitStatsError ? (
                    <div className="mt-4 rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-4 py-3 text-sm text-[#ff8a8a]">
                      {faceitStatsError}
                    </div>
                  ) : faceitStats ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <FaceitStatCard
                        label="K"
                        value={formatFaceitCount(faceitStats.kills)}
                      />
                      <FaceitStatCard
                        label="D"
                        value={formatFaceitCount(faceitStats.deaths)}
                      />
                      <FaceitStatCard
                        label="Diff"
                        value={formatFaceitDiff(
                          faceitStats.kills,
                          faceitStats.deaths,
                        )}
                        valueClassName={getFaceitDiffClass(
                          faceitStats.kills,
                          faceitStats.deaths,
                        )}
                      />
                      <FaceitStatCard
                        label="ADR"
                        value={formatFaceitValue(faceitStats.adr, 1)}
                      />
                      <FaceitStatCard
                        label="HS%"
                        value={formatFaceitPercent(faceitStats.hsPercent)}
                      />
                      <FaceitStatCard
                        label="Winrate"
                        value={formatFaceitPercent(faceitStats.winRate)}
                      />
                      <FaceitStatCard
                        label="Matches"
                        value={formatFaceitCount(faceitStats.matches)}
                      />
                      <FaceitStatCard
                        label="Wins"
                        value={formatFaceitCount(faceitStats.wins)}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 text-sm text-slate-400">
                      Estatisticas indisponiveis.
                    </div>
                  )}
                </div>

                {faceitMaps.length > 0 && (
                  <div className="rounded-sm border border-white/10 bg-[#0b0f14] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                        Mapas mais jogados
                      </p>
                    </div>
                    <div className="mt-4 space-y-3">
                      {faceitMaps.map((map) => (
                        <div
                          key={map.name}
                          className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-[#00f2ff]/20 bg-[#0f1115] px-4 py-3"
                        >
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-100">
                              {formatFaceitMapName(map.name)}
                            </p>
                            <p className="text-[10px] font-mono text-[#7ff7ff]">
                              Matches {formatFaceitCount(map.matches)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-slate-100">
                            <span className="inline-flex items-center gap-1 rounded-sm border border-[#00f2ff]/30 bg-white/5 px-2 py-1 shadow-[0_0_10px_rgba(0,242,255,0.12)]">
                              <span className="text-slate-400">WR</span>
                              {formatFaceitPercent(map.winRate)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-sm border border-[#00f2ff]/30 bg-white/5 px-2 py-1 shadow-[0_0_10px_rgba(0,242,255,0.12)]">
                              <span className="text-slate-400">KD</span>
                              {formatFaceitValue(map.kd)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-sm border border-[#00f2ff]/30 bg-white/5 px-2 py-1 shadow-[0_0_10px_rgba(0,242,255,0.12)]">
                              <span className="text-slate-400">ADR</span>
                              {formatFaceitValue(map.adr, 1)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-sm border border-[#00f2ff]/30 bg-white/5 px-2 py-1 shadow-[0_0_10px_rgba(0,242,255,0.12)]">
                              <span className="text-slate-400">HS</span>
                              {formatFaceitPercent(map.hsPercent)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {faceitLoading ? (
                    <div className="rounded-sm border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-400">
                      Carregando partidas da Faceit...
                    </div>
                  ) : faceitError ? (
                    <div className="rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-5 py-4 text-sm text-[#ff8a8a]">
                      {faceitError}
                    </div>
                  ) : faceitMatches.length === 0 ? (
                    <div className="rounded-sm border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-400">
                      Nenhuma partida encontrada na Faceit.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {faceitMatches.map((match) => {
                        const score = match.score
                          ? `${match.score.faction1 ?? '-'} x ${match.score.faction2 ?? '-'}`
                          : '--';
                        return (
                          <div
                            key={match.id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-white/10 bg-[#0b0f14] px-5 py-4"
                          >
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                                Faceit
                              </p>
                              <p className="font-bold text-slate-100">
                                {match.competitionName || 'Partida Faceit'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatFaceitDate(match.startedAt)}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold uppercase text-slate-500">
                                Placar
                              </p>
                              <p className="text-lg font-black text-slate-100">
                                {score}
                              </p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold uppercase text-slate-500">
                                K / D
                              </p>
                              <p className="text-lg font-black text-slate-100">
                                {formatFaceitCount(match.kills)} /{' '}
                                {formatFaceitCount(match.deaths)}
                              </p>
                              <p
                                className={`text-[10px] font-black uppercase ${getFaceitDiffClass(
                                  match.kills ?? null,
                                  match.deaths ?? null,
                                )}`}
                              >
                                Diff{' '}
                                {formatFaceitDiff(
                                  match.kills ?? null,
                                  match.deaths ?? null,
                                )}
                              </p>
                            </div>
                            <a
                              href={buildFaceitMatchUrl(match.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-sm border border-[#00f2ff]/40 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#7ff7ff] transition hover:bg-[#00f2ff]/10"
                            >
                              Ver
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {historyTab === 'gc' && (
              <div className="space-y-6">
                <div className="rounded-sm border border-white/10 bg-[#0b0f14] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Importar stats GC
                      </p>
                      <p className="text-xs text-slate-500">
                        Envie o print ou leia pelo link do perfil.
                      </p>
                    </div>
                    {gcStatsStatus && (
                      <span className="text-xs font-semibold text-[#00f2ff]">
                        {gcStatsStatus}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Upload do print
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleGcImageChange}
                        className="mt-2 w-full rounded-sm border border-white/10 bg-[#0f1115] px-4 py-3 text-xs text-slate-300 file:mr-4 file:rounded-sm file:border-0 file:bg-[#00f2ff] file:px-4 file:py-2 file:text-[10px] file:font-black file:uppercase file:tracking-[0.2em] file:text-[#050505]"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        Link do print
                      </p>
                      <input
                        value={gcStatsImageUrl}
                        onChange={(event) =>
                          handleGcImageUrlChange(event.target.value)
                        }
                        placeholder="https://..."
                        className="mt-2 w-full rounded-sm border border-white/10 bg-[#0f1115] px-4 py-3 text-sm font-semibold text-slate-200 outline-none transition focus:border-[#00f2ff]"
                      />
                      <p className="mt-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">
                        Se o arquivo estiver selecionado, o link e ignorado.
                      </p>
                    </div>
                  </div>

                  {gcStatsPreview && (
                    <div className="mt-4 overflow-hidden rounded-sm border border-white/10 bg-[#050505]">
                      <img
                        src={gcStatsPreview}
                        alt="Preview stats GC"
                        className="h-40 w-full object-cover opacity-90"
                      />
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleGcStatsImport('image')}
                      disabled={gcStatsLoading}
                      className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
                    >
                      {gcStatsLoading ? 'Lendo...' : 'Ler imagem'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGcStatsImport('link')}
                      disabled={gcStatsLoading}
                      className="rounded-sm border border-[#00f2ff]/40 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#7ff7ff] transition hover:bg-[#00f2ff]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
                    >
                      {gcStatsLoading ? 'Lendo...' : 'Ler perfil'}
                    </button>
                    {gcProfileUrl && (
                      <a
                        href={gcProfileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-sm border border-[#00f2ff]/40 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-[#7ff7ff] transition hover:bg-[#00f2ff]/10"
                      >
                        Abrir perfil GC
                      </a>
                    )}
                  </div>

                  {gcStatsError && (
                    <div className="mt-4 rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-4 py-3 text-sm text-[#ff8a8a]">
                      {gcStatsError}
                    </div>
                  )}
                </div>

                <div className="rounded-sm border border-white/10 bg-[#0b0f14] p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                    Stats GamersClub
                  </p>
                  {hasGcStats ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <FaceitStatCard
                        label="KDR"
                        value={formatFaceitValue(user.gc_kd ?? null, 2)}
                      />
                      <FaceitStatCard
                        label="ADR"
                        value={formatFaceitValue(user.gc_adr ?? null, 1)}
                      />
                      <FaceitStatCard
                        label="Winrate"
                        value={formatFaceitPercent(user.gc_winrate ?? null)}
                      />
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-slate-400">
                      Nenhum stats GC importado.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
  <div className="flex flex-col items-center justify-center rounded-sm border border-[#00f2ff]/20 bg-transparent p-6 text-center">
    <div className={`${color} mb-3`}>{icon}</div>
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
      {label}
    </p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </div>
);

type FaceitStatCardProps = {
  label: string;
  value: string;
  valueClassName?: string;
};

const FaceitStatCard = ({
  label,
  value,
  valueClassName,
}: FaceitStatCardProps) => (
  <div className="rounded-sm border border-white/10 bg-[#0f1115] p-4">
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
      {label}
    </p>
    <p
      className={`mt-2 text-xl font-black ${
        valueClassName ?? 'text-[#00f2ff]'
      }`}
    >
      {value}
    </p>
  </div>
);
