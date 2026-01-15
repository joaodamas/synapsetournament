import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as LinkIcon, LogIn, LogOut, Trophy, Users, X } from 'lucide-react';
import clsx from 'clsx';

import { AdvancedMapVeto } from './AdvancedMapVeto';
import { Logo } from './Branding/Logo';
import { CreateMix } from './CreateMix';
import { JoinMixCard } from './JoinMixCard';
import { QuickGuide } from './QuickGuide';
import { RealtimeSlots } from './RealtimeSlots';
import { balanceTeams, calculateAverageLevel } from '../lib/balance';
import {
  getFaceitLevelBadgeClass,
  getGcLevelBadgeClass,
} from '../lib/levels';
import { MAP_POOL } from '../lib/maps';
import { buildSteamLoginUrl } from '../lib/steam';
import { hasSupabaseConfig, supabase } from '../lib/supabase';
import type { Player } from '../types';

type MixLobbyProps = {
  mixId: string;
  embedded?: boolean;
};

type BalancedState = {
  teamA: Player[];
  teamB: Player[];
};

const storageKeys = {
  playerId: 'synapsecs_player_id',
  steamId: 'synapsecs_steam_id',
  nickname: 'synapsecs_player_nickname',
};

const readStorage = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export const MixLobby = ({ mixId, embedded = false }: MixLobbyProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [balanced, setBalanced] = useState<BalancedState | null>(null);
  const [status, setStatus] = useState<string>('');
  const [copyState, setCopyState] = useState('Copiar link');
  const [showFinalize, setShowFinalize] = useState(false);
  const [winnerChoice, setWinnerChoice] = useState<'A' | 'B' | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(() =>
    readStorage(storageKeys.playerId),
  );
  const [steamId, setSteamId] = useState<string | null>(() =>
    readStorage(storageKeys.steamId),
  );
  const [playerNickname, setPlayerNickname] = useState<string | null>(() =>
    readStorage(storageKeys.nickname),
  );
  const [mixCreatorId, setMixCreatorId] = useState<string | null>(null);
  const [mixStatus, setMixStatus] = useState<string>('waiting');
  const [mixTeams, setMixTeams] = useState<{
    teamA: string[];
    teamB: string[];
  } | null>(null);
  const [bannedMaps, setBannedMaps] = useState<string[]>([]);
  const [finalMap, setFinalMap] = useState<string | null>(null);
  const [serverIp, setServerIp] = useState('');
  const [serverIpDraft, setServerIpDraft] = useState('');
  const [savingServerIp, setSavingServerIp] = useState(false);

  const filledSlots = players.length;
  const isMixIdValid = Boolean(mixId && isUuid(mixId));
  const isCreator = Boolean(
    playerId && (mixCreatorId ? mixCreatorId === playerId : true),
  );
  const canBalance =
    filledSlots === 10 && isCreator && isMixIdValid && mixStatus === 'waiting';
  const canFinalize = Boolean(
    balanced && isCreator && isMixIdValid && mixStatus === 'live',
  );
  const balanceHint = !mixId
    ? 'Informe um mixId para iniciar.'
    : !isMixIdValid
      ? 'Mix ID invalido. Use um UUID valido.'
      : mixStatus === 'live'
        ? 'Partida em andamento.'
      : mixStatus === 'sorting'
        ? 'Times definidos. Siga com o veto.'
      : mixStatus === 'finished'
        ? 'Partida finalizada. Elo ja foi atualizado.'
      : !playerId
        ? 'Faca login com Steam para liberar o sorteio.'
        : !isCreator
          ? 'Apenas o criador do mix pode sortear.'
          : filledSlots === 10
            ? 'Pronto para sortear.'
            : 'Aguardando 10 jogadores.';

  const averageA = useMemo(
    () => (balanced ? calculateAverageLevel(balanced.teamA) : 0),
    [balanced],
  );
  const averageB = useMemo(
    () => (balanced ? calculateAverageLevel(balanced.teamB) : 0),
    [balanced],
  );
  const remainingMaps = useMemo(
    () => MAP_POOL.filter((map) => !bannedMaps.includes(map.id)),
    [bannedMaps],
  );
  const turnSide = bannedMaps.length % 2 === 0 ? 'A' : 'B';
  const isTeamA = Boolean(
    playerId && mixTeams?.teamA?.includes(playerId),
  );
  const isTeamB = Boolean(
    playerId && mixTeams?.teamB?.includes(playerId),
  );
  const isVetoLocked = mixStatus === 'live' || mixStatus === 'finished';

  if (!mixId) {
    const content = (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-black italic tracking-tight text-slate-900 md:text-4xl">
            Central de mix
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Crie uma sala ou entre com um codigo existente.
          </p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <CreateMix
            playerId={playerId}
            onMixCreated={(id) => {
              window.location.assign(`/?mixId=${id}`);
            }}
          />
          <JoinMixCard
            onJoin={(id) => {
              window.location.assign(`/?mixId=${id}`);
            }}
          />
        </div>
        <QuickGuide />
      </div>
    );

    if (embedded) {
      return content;
    }

    return (
      <div className="page-shell">
        <div className="mx-auto max-w-4xl px-6 py-12">{content}</div>
      </div>
    );
  }

  const fetchMix = useCallback(async () => {
    if (!supabase || !isMixIdValid) {
      return;
    }

    const { data, error } = await supabase
      .from('mixes')
      .select('id, creator_id, status, team_a, team_b, banned_maps, final_map, server_ip')
      .eq('id', mixId);

    if (error) {
      setStatus(error.message);
      return;
    }

    const mix = data?.[0];
    setMixCreatorId(mix?.creator_id ?? null);
    setMixStatus(mix?.status ?? 'waiting');
    setMixTeams({
      teamA: (mix?.team_a as string[]) ?? [],
      teamB: (mix?.team_b as string[]) ?? [],
    });
    setBannedMaps((mix?.banned_maps as string[]) ?? []);
    setFinalMap((mix?.final_map as string | null) ?? null);
    const nextServerIp = (mix?.server_ip as string) ?? '';
    setServerIp(nextServerIp);
    setServerIpDraft(nextServerIp);
  }, [isMixIdValid, mixId]);

  useEffect(() => {
    fetchMix();

    if (!supabase || !isMixIdValid) {
      return;
    }

    const channel = supabase
      .channel(`mix-${mixId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mixes', filter: `id=eq.${mixId}` },
        () => fetchMix(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMix, isMixIdValid, mixId]);

  useEffect(() => {
    if (!supabase || !isMixIdValid || !playerId) {
      return;
    }

    const joinMix = async () => {
      const { error } = await supabase
        .from('mix_participants')
        .upsert(
          { mix_id: mixId, player_id: playerId },
          { onConflict: 'mix_id,player_id', ignoreDuplicates: true },
        );

      if (error) {
        // Ignore duplicate or foreign key errors to avoid spamming status.
        if (error.code !== '23505' && error.code !== '23503') {
          setStatus(error.message);
        }
      }
    };

    void joinMix();
  }, [isMixIdValid, mixId, playerId]);

  useEffect(() => {
    if (!canBalance) {
      setBalanced(null);
    }
  }, [canBalance]);

  useEffect(() => {
    if (!mixTeams) {
      return;
    }

    if (mixTeams.teamA.length === 0 && mixTeams.teamB.length === 0) {
      return;
    }

    if (players.length === 0) {
      return;
    }

    const teamA = mixTeams.teamA
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is Player => Boolean(player));
    const teamB = mixTeams.teamB
      .map((id) => players.find((player) => player.id === id))
      .filter((player): player is Player => Boolean(player));

    if (teamA.length > 0 || teamB.length > 0) {
      setBalanced({ teamA, teamB });
    }
  }, [mixTeams, players]);

  useEffect(() => {
    if (!supabase || !isMixIdValid) {
      return;
    }
    if (bannedMaps.length !== 6 || finalMap) {
      return;
    }
    if (!isCreator) {
      return;
    }

    const lastMap = MAP_POOL.find((map) => !bannedMaps.includes(map.id));
    if (!lastMap) {
      return;
    }

    const finalizeMap = async () => {
      const { error } = await supabase
        .from('mixes')
        .update({ final_map: lastMap.id, status: 'live' })
        .eq('id', mixId);

      if (error) {
        setStatus(error.message);
        return;
      }

      setFinalMap(lastMap.id);
      setMixStatus('live');
      setStatus(`Mapa definido: ${lastMap.name}`);
    };

    void finalizeMap();
  }, [bannedMaps, finalMap, isCreator, isMixIdValid, mixId]);

  const handleBalance = async () => {
    if (!isMixIdValid) {
      setStatus('Mix ID invalido. Informe um UUID valido.');
      return;
    }
    if (mixStatus === 'live') {
      setStatus('Partida em andamento. Aguarde finalizar.');
      return;
    }
    if (mixStatus === 'finished') {
      setStatus('Partida ja finalizada. Crie um novo mix.');
      return;
    }
    if (mixStatus !== 'waiting') {
      setStatus('Times ja definidos. Siga para o veto.');
      return;
    }
    if (filledSlots !== 10) {
      setStatus('O mix precisa de 10 jogadores para balancear.');
      return;
    }
    if (!playerId) {
      setStatus('Faca login com Steam para sortear os times.');
      return;
    }
    if (!isCreator) {
      setStatus('Apenas o criador do mix pode sortear os times.');
      return;
    }

    const result = balanceTeams(players);
    if (!result) {
      setStatus('Nao foi possivel balancear com o total atual.');
      return;
    }

    if (supabase && isMixIdValid) {
      const teamAIds = result.teamA.map((player) => player.id);
      const teamBIds = result.teamB.map((player) => player.id);
      const { error } = await supabase.from('mixes').upsert(
        {
          id: mixId,
          creator_id: playerId,
          status: 'sorting',
          banned_maps: [],
          final_map: null,
          team_a: teamAIds,
          team_b: teamBIds,
        },
        { onConflict: 'id' },
      );

      if (error) {
        setStatus(error.message);
        return;
      }

      setMixTeams({ teamA: teamAIds, teamB: teamBIds });
      setMixStatus('sorting');
      setBannedMaps([]);
      setFinalMap(null);
    }

    setBalanced(result);
    setStatus('Times sorteados com sucesso.');
  };

  const handleBanMap = async (mapId: string) => {
    if (!supabase) {
      setStatus('Supabase nao configurado.');
      return;
    }
    if (!isMixIdValid) {
      setStatus('Mix ID invalido. Informe um UUID valido.');
      return;
    }
    if (mixStatus === 'live' || mixStatus === 'finished') {
      setStatus('Veto encerrado. A partida ja iniciou.');
      return;
    }
    if (!playerId) {
      setStatus('Faca login com Steam para banir mapas.');
      return;
    }
    if (bannedMaps.length >= 6 || finalMap) {
      setStatus('Veto encerrado. Mapa final em definicao.');
      return;
    }
    if (bannedMaps.includes(mapId)) {
      return;
    }

    if (mixTeams?.teamA?.length && mixTeams?.teamB?.length) {
      if (turnSide === 'A' && !isTeamA) {
        setStatus('Vez do Time A banir o mapa.');
        return;
      }
      if (turnSide === 'B' && !isTeamB) {
        setStatus('Vez do Time B banir o mapa.');
        return;
      }
    } else if (!isCreator) {
      setStatus('Apenas o criador pode banir sem times definidos.');
      return;
    }

    const nextBans = [...bannedMaps, mapId];
    const { error } = await supabase
      .from('mixes')
      .update({ banned_maps: nextBans })
      .eq('id', mixId);

    if (error) {
      setStatus(error.message);
      return;
    }

    setBannedMaps(nextBans);
  };

  const handleSaveServerIp = async () => {
    if (!supabase) {
      setStatus('Supabase nao configurado.');
      return;
    }
    if (!isMixIdValid) {
      setStatus('Mix ID invalido. Informe um UUID valido.');
      return;
    }
    if (!isCreator) {
      setStatus('Apenas o criador pode definir o IP.');
      return;
    }

    setSavingServerIp(true);
    const { error } = await supabase
      .from('mixes')
      .update({ server_ip: serverIpDraft.trim() })
      .eq('id', mixId);

    setSavingServerIp(false);
    if (error) {
      setStatus(error.message);
      return;
    }

    setServerIp(serverIpDraft.trim());
    setStatus('IP do servidor atualizado.');
  };

  const handleFinalize = async () => {
    if (!balanced || !isMixIdValid) {
      setStatus('Balanceie os times antes de finalizar.');
      return;
    }
    if (mixStatus !== 'live') {
      setStatus('A partida precisa estar ao vivo para finalizar.');
      return;
    }
    if (!isCreator) {
      setStatus('Apenas o criador do mix pode finalizar.');
      return;
    }
    if (!winnerChoice) {
      setStatus('Selecione o vencedor antes de confirmar.');
      return;
    }
    if (!supabase) {
      setStatus('Supabase nao configurado.');
      return;
    }

    setSavingResult(true);
    setStatus('');
    const winners = winnerChoice === 'A' ? balanced.teamA : balanced.teamB;

    try {
      const results = await Promise.all(
        winners.map((player) =>
          supabase.rpc('increment_elo', { player_id: player.id, amount: 25 }),
        ),
      );

      const failed = results.find((result) => result.error);
      if (failed?.error) {
        setStatus(failed.error.message);
        return;
      }

      const { error } = await supabase
        .from('mixes')
        .update({ status: 'finished' })
        .eq('id', mixId);

      if (error) {
        setStatus(error.message);
        return;
      }

      setMixStatus('finished');
      setShowFinalize(false);
      setWinnerChoice(null);
      setStatus('Partida finalizada. Elo atualizado.');
    } finally {
      setSavingResult(false);
    }
  };

  const loginWithSteam = () => {
    if (!mixId || !isMixIdValid) {
      setStatus('Use um mixId valido antes de logar com a Steam.');
      return;
    }

    const returnUrl = `${window.location.origin}/auth/steam/callback?mixId=${encodeURIComponent(
      mixId,
    )}`;
    window.location.href = buildSteamLoginUrl(returnUrl);
  };

  const handleLogout = () => {
    localStorage.removeItem(storageKeys.playerId);
    localStorage.removeItem(storageKeys.steamId);
    localStorage.removeItem(storageKeys.nickname);
    setPlayerId(null);
    setSteamId(null);
    setPlayerNickname(null);
    setStatus('Sessao Steam encerrada.');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState('Link copiado');
      setTimeout(() => setCopyState('Copiar link'), 2000);
    } catch (error) {
      setCopyState('Falha ao copiar');
    }
  };

  return (
    <div className={embedded ? 'flex flex-col gap-6' : 'page-shell'}>
      {!embedded && (
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <Logo variant="dark" onClick={() => window.location.assign('/')} />
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
                <p className="text-[10px] font-bold uppercase text-slate-500">
                  Status
                </p>
                <p className="text-xs font-black uppercase text-emerald-400">
                  {mixStatus} ({filledSlots}/10)
                </p>
              </div>
              {finalMap && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500">
                    Mapa
                  </p>
                  <p className="text-xs font-black uppercase text-blue-300">
                    {finalMap.replace('de_', '')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>
      )}
      <div
        className={
          embedded
            ? 'flex flex-col gap-6'
            : 'mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10'
        }
      >
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-soft backdrop-blur">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-600">
                SynapseCS Mix Lab
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-slate-900">
                CS2 Mix Lobby
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Aguardando jogadores ({filledSlots}/10)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {playerId ? (
                <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  <div className="flex flex-col">
                    <span className="uppercase tracking-[0.2em] text-slate-400">
                      Steam OK
                    </span>
                    <span className="font-mono text-[11px] text-slate-700">
                      {playerNickname ?? steamId ?? 'Steam conectado'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    <LogOut size={14} />
                    Sair
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={loginWithSteam}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <LogIn size={16} />
                  Login Steam
                </button>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                <LinkIcon size={18} />
                {copyState}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              <Users size={16} />
              Mix ID:{' '}
              <span className="font-mono text-slate-700">
                {mixId || 'nao definido'}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              Status:{' '}
              <span className="font-mono text-slate-700">{mixStatus}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-orange-700">
              <Trophy size={16} />
              Balanceamento por nivel Faceit + GC
            </div>
          </div>
          {status && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
              {status}
            </div>
          )}
          {!hasSupabaseConfig && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para ativar o
              realtime.
            </div>
          )}
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="flex flex-col gap-4">
            <RealtimeSlots
              mixId={mixId}
              currentUserId={playerId}
              onParticipantsChange={setPlayers}
            />
            <button
              type="button"
              onClick={handleBalance}
              disabled={!canBalance}
              className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-soft transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Sortear times e gerar mix
            </button>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Mix Status
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {balanceHint}
              </p>
              <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                Status atual: <span className="font-mono">{mixStatus}</span>
              </div>
              <button
                type="button"
                onClick={handleBalance}
                disabled={!canBalance}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trophy size={18} />
                Sortear agora
              </button>
              <button
                type="button"
                onClick={() => setShowFinalize(true)}
                disabled={!canFinalize}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Finalizar partida
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
              <h3 className="font-display text-lg font-semibold text-slate-900">
                Times balanceados
              </h3>
              {balanced ? (
                <div className="mt-4 grid gap-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-emerald-900">
                        Time A
                      </p>
                      <span className="text-xs text-emerald-700">
                        Media {averageA}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                      {balanced.teamA.map((player) => (
                        <li key={player.id} className="flex justify-between">
                          <span>{player.nickname}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={getGcLevelBadgeClass(
                                player.gc_level,
                                'sm',
                              )}
                            >
                              GC {player.gc_level}
                            </span>
                            <span
                              className={getFaceitLevelBadgeClass(
                                player.faceit_level,
                                'sm',
                              )}
                            >
                              FCT {player.faceit_level}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-blue-900">
                        Time B
                      </p>
                      <span className="text-xs text-blue-700">
                        Media {averageB}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm text-blue-900">
                      {balanced.teamB.map((player) => (
                        <li key={player.id} className="flex justify-between">
                          <span>{player.nickname}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className={getGcLevelBadgeClass(
                                player.gc_level,
                                'sm',
                              )}
                            >
                              GC {player.gc_level}
                            </span>
                            <span
                              className={getFaceitLevelBadgeClass(
                                player.faceit_level,
                                'sm',
                              )}
                            >
                              FCT {player.faceit_level}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">
                  Times ainda nao sorteados. Aguarde os 10 jogadores.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <AdvancedMapVeto
            bannedMaps={bannedMaps}
            onBan={handleBanMap}
            isTurnA={turnSide === 'A'}
            isCapA={isTeamA}
            isCapB={isTeamB}
            vetoLocked={isVetoLocked || Boolean(finalMap)}
          />

          <aside className="flex flex-col gap-4">
            {mixStatus === 'live' && finalMap ? (
              <div className="rounded-3xl border-4 border-blue-500 bg-slate-900 p-6 text-white shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-300">
                  Partida iniciada
                </p>
                <h3 className="mt-3 text-2xl font-black italic text-white">
                  MAPA:{' '}
                  {MAP_POOL.find((map) => map.id === finalMap)?.name ?? '---'}
                </h3>
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3">
                  <code className="text-emerald-300">
                    connect {serverIp || 'defina o IP'}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      if (!serverIp) {
                        return;
                      }
                      void navigator.clipboard.writeText(
                        `connect ${serverIp}`,
                      );
                    }}
                    disabled={!serverIp}
                    className="rounded-lg border border-slate-700 bg-slate-700 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Copiar IP
                  </button>
                </div>
                {serverIp ? (
                  <a
                    href={`steam://connect/${serverIp}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:bg-blue-700"
                  >
                    Abrir jogo agora
                  </a>
                ) : (
                  <p className="mt-4 text-sm text-blue-200">
                    Defina o IP do servidor para liberar o acesso direto.
                  </p>
                )}
                {isCreator && (
                  <div className="mt-5 flex flex-col gap-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                      Server IP
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={serverIpDraft}
                        onChange={(event) =>
                          setServerIpDraft(event.target.value)
                        }
                        placeholder="123.456.789.000:27015"
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveServerIp}
                        disabled={savingServerIp}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                      >
                        {savingServerIp ? 'Salvando' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Status do veto
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {isVetoLocked || finalMap
                    ? 'Veto encerrado.'
                    : `Faltam ${remainingMaps.length} mapas para definir.`}
                </p>
                <div className="mt-4 flex flex-col gap-2 text-sm text-slate-600">
                  <span>
                    Banidos: <strong>{bannedMaps.length}</strong>
                  </span>
                  <span>
                    Restantes: <strong>{remainingMaps.length}</strong>
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Ultimos mapas
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {remainingMaps.slice(0, 3).map((map) => (
                      <span
                        key={map.id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {map.name}
                      </span>
                    ))}
                    {remainingMaps.length === 0 && (
                      <span className="text-sm text-slate-400">
                        Aguardando definicao final.
                      </span>
                    )}
                  </div>
                </div>
                {!playerId && (
                  <p className="mt-4 text-xs text-slate-400">
                    Faca login para participar do veto.
                  </p>
                )}
              </div>
            )}
          </aside>
        </section>

      </div>

      {showFinalize && balanced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  Finalizar partida
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                  Selecione o vencedor do mix
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  O elo sera incrementado em 25 pontos para cada jogador do time
                  vencedor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowFinalize(false);
                  setWinnerChoice(null);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setWinnerChoice('A')}
                className={clsx(
                  'rounded-2xl border px-4 py-4 text-left transition',
                  winnerChoice === 'A'
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <p className="text-sm font-semibold text-emerald-900">
                  Time A
                </p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {balanced.teamA.map((player) => (
                    <li key={player.id} className="flex justify-between">
                      <span>{player.nickname}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={getGcLevelBadgeClass(
                            player.gc_level,
                            'sm',
                          )}
                        >
                          GC {player.gc_level}
                        </span>
                        <span
                          className={getFaceitLevelBadgeClass(
                            player.faceit_level,
                            'sm',
                          )}
                        >
                          FCT {player.faceit_level}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </button>
              <button
                type="button"
                onClick={() => setWinnerChoice('B')}
                className={clsx(
                  'rounded-2xl border px-4 py-4 text-left transition',
                  winnerChoice === 'B'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50',
                )}
              >
                <p className="text-sm font-semibold text-blue-900">Time B</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {balanced.teamB.map((player) => (
                    <li key={player.id} className="flex justify-between">
                      <span>{player.nickname}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={getGcLevelBadgeClass(
                            player.gc_level,
                            'sm',
                          )}
                        >
                          GC {player.gc_level}
                        </span>
                        <span
                          className={getFaceitLevelBadgeClass(
                            player.faceit_level,
                            'sm',
                          )}
                        >
                          FCT {player.faceit_level}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowFinalize(false);
                  setWinnerChoice(null);
                }}
                className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleFinalize}
                disabled={savingResult || !winnerChoice}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {savingResult ? 'Processando...' : 'Confirmar vencedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
