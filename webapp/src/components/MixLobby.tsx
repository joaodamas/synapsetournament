import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as LinkIcon, LogIn, LogOut, Trophy, Users, X } from "lucide-react";
import clsx from "clsx";

import { AdvancedMapVeto }  from "./AdvancedMapVeto";
import { Logo }             from "./Branding/Logo";
import { CreateMix }        from "./CreateMix";
import { JoinMixCard }      from "./JoinMixCard";
import { QuickGuide }       from "./QuickGuide";
import { RealtimeSlots }    from "./RealtimeSlots";
import { LiveScoreboard }   from "./LiveScoreboard";
import { balanceTeams, calculateAverageLevel } from "../lib/balance";
import { getFaceitLevelBadgeClass, getGcLevelBadgeClass } from "../lib/levels";
import { MAP_POOL }         from "../lib/maps";
import { buildSteamLoginUrl } from "../lib/steam";
import {
  db, auth, hasFirebaseConfig, callFunction,
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, onSnapshot, serverTimestamp,
  signInWithCustomToken,
} from "../lib/firebase";
import { FaceitLogo, GamersClubLogo } from "./Branding/ProviderLogos";
import type { Player } from "../types";

type MixLobbyProps = { mixId: string; embedded?: boolean };
type BalancedState  = { teamA: Player[]; teamB: Player[] };

const storageKeys = {
  steamId:  "synapsecs_steam_id",
  nickname: "synapsecs_player_nickname",
};

const readStorage = (key: string) => {
  try { return localStorage.getItem(key); } catch { return null; }
};

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

export const MixLobby = ({ mixId, embedded = false }: MixLobbyProps) => {
  const [players,       setPlayers]       = useState<Player[]>([]);
  const [balanced,      setBalanced]      = useState<BalancedState | null>(null);
  const [status,        setStatus]        = useState("");
  const [copyState,     setCopyState]     = useState("Copiar link");
  const [showFinalize,  setShowFinalize]  = useState(false);
  const [winnerChoice,  setWinnerChoice]  = useState<"A" | "B" | null>(null);
  const [savingResult,  setSavingResult]  = useState(false);

  // Identidade do jogador (via Firebase Auth)
  const [steamId,       setSteamId]       = useState<string | null>(() => readStorage(storageKeys.steamId));
  const [playerNickname,setPlayerNickname]= useState<string | null>(() => readStorage(storageKeys.nickname));

  // Mix state (ouvido em tempo real)
  const [mixData,       setMixData]       = useState<Record<string, unknown> | null>(null);
  const mixStatus   = (mixData?.status   as string)   ?? "waiting";
  const mixCreatorId= (mixData?.creator_id as string) ?? null;
  const bannedMaps  = (mixData?.banned_maps as string[]) ?? [];
  const finalMap    = (mixData?.final_map   as string | null) ?? null;
  const serverIp    = (mixData?.server_ip   as string) ?? "";
  const scoreA      = (mixData?.score_a     as number) ?? 0;
  const scoreB      = (mixData?.score_b     as number) ?? 0;
  const mixTeams    = {
    teamA: (mixData?.team_a as string[]) ?? [],
    teamB: (mixData?.team_b as string[]) ?? [],
  };

  const [serverIpDraft,   setServerIpDraft]   = useState("");
  const [savingServerIp,  setSavingServerIp]  = useState(false);
  const [leavingMix,      setLeavingMix]      = useState(false);

  const filledSlots  = players.length;
  const isMixIdValid = Boolean(mixId && isUuid(mixId));
  const isCreator    = Boolean(steamId && (mixCreatorId ? mixCreatorId === steamId : true));
  const isTeamA      = Boolean(steamId && mixTeams.teamA.includes(steamId));
  const isTeamB      = Boolean(steamId && mixTeams.teamB.includes(steamId));
  const isParticipant= Boolean(steamId && players.some((p) => p.id === steamId));
  const isVetoLocked = mixStatus === "live" || mixStatus === "finished";
  const canBalance   = filledSlots === 10 && isCreator && isMixIdValid && mixStatus === "waiting";
  const canFinalize  = Boolean(balanced && isCreator && isMixIdValid && mixStatus === "live");
  const turnSide     = bannedMaps.length % 2 === 0 ? "A" : "B";
  const remainingMaps= useMemo(() => MAP_POOL.filter((m) => !bannedMaps.includes(m.id)), [bannedMaps]);
  const averageA     = useMemo(() => balanced ? calculateAverageLevel(balanced.teamA) : 0, [balanced]);
  const averageB     = useMemo(() => balanced ? calculateAverageLevel(balanced.teamB) : 0, [balanced]);

  // ── Reconstrói balanced quando teams mudam ──────────────────────────────
  useEffect(() => {
    if (!mixTeams.teamA.length && !mixTeams.teamB.length) return;
    if (!players.length) return;
    const teamA = mixTeams.teamA.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
    const teamB = mixTeams.teamB.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
    if (teamA.length || teamB.length) setBalanced({ teamA, teamB });
  }, [mixTeams.teamA.join(), mixTeams.teamB.join(), players]);

  // ── Ouve o documento do mix em tempo real ───────────────────────────────
  useEffect(() => {
    if (!hasFirebaseConfig || !db || !isMixIdValid) return;
    const mixRef = doc(db, "mixes", mixId);
    const unsub = onSnapshot(mixRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMixData(data);
        setServerIpDraft((data.server_ip as string) ?? "");
      }
    });
    return () => unsub();
  }, [mixId, isMixIdValid]);

  // ── Auto-veto: quando 6 mapas banidos, define mapa final ────────────────
  useEffect(() => {
    if (!db || !isMixIdValid || !isCreator) return;
    if (bannedMaps.length !== 6 || finalMap) return;
    const last = MAP_POOL.find((m) => !bannedMaps.includes(m.id));
    if (!last) return;
    void updateDoc(doc(db, "mixes", mixId), {
      final_map: last.id,
      status:    "live",
    });
  }, [bannedMaps.length, finalMap, isCreator, isMixIdValid, mixId]);

  // ── Entrar no mix automaticamente ───────────────────────────────────────
  useEffect(() => {
    if (!db || !isMixIdValid || !steamId) return;
    void setDoc(
      doc(db, "mixes", mixId, "participants", steamId),
      { player_id: steamId, joined_at: serverTimestamp() }
    );
  }, [steamId, mixId, isMixIdValid]);

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleBalance = async () => {
    if (filledSlots !== 10) { setStatus("O mix precisa de 10 jogadores."); return; }
    if (!steamId)           { setStatus("Faça login com Steam."); return; }
    if (!isCreator)         { setStatus("Apenas o criador pode sortear."); return; }
    if (!db)                return;

    const result = balanceTeams(players);
    if (!result) { setStatus("Não foi possível balancear."); return; }

    await updateDoc(doc(db, "mixes", mixId), {
      status:      "sorting",
      team_a:      result.teamA.map((p) => p.id),
      team_b:      result.teamB.map((p) => p.id),
      banned_maps: [],
      final_map:   null,
    });

    setBalanced(result);
    setStatus("Times sorteados.");
  };

  const handleBanMap = async (mapId: string) => {
    if (!db || !isMixIdValid || isVetoLocked || bannedMaps.length >= 6 || finalMap) return;
    if (!steamId) { setStatus("Faça login para banir mapas."); return; }
    if (mixTeams.teamA.length && mixTeams.teamB.length) {
      if (turnSide === "A" && !isTeamA) { setStatus("Vez do Time A banir."); return; }
      if (turnSide === "B" && !isTeamB) { setStatus("Vez do Time B banir."); return; }
    } else if (!isCreator) { setStatus("Apenas o criador pode banir."); return; }

    await updateDoc(doc(db, "mixes", mixId), { banned_maps: [...bannedMaps, mapId] });
  };

  const handleSaveServerIp = async () => {
    if (!db || !isCreator) return;
    setSavingServerIp(true);
    await updateDoc(doc(db, "mixes", mixId), { server_ip: serverIpDraft.trim() });
    setSavingServerIp(false);
    setStatus("IP salvo.");
  };

  const handleFinalize = async () => {
    if (!balanced || !isCreator || !winnerChoice || !db) return;
    setSavingResult(true);
    try {
      const winners = winnerChoice === "A" ? balanced.teamA : balanced.teamB;
      // Incrementa elo via Firebase Function (chama receiveMatchStats com match_end ou update direto)
      await callFunction("updateMixScore", { mix_id: mixId, score_a: scoreA, score_b: scoreB });

      // Atualiza status do mix
      await updateDoc(doc(db, "mixes", mixId), { status: "finished" });

      // Incrementa elo dos vencedores
      await Promise.all(
        winners.map((p) => updateDoc(doc(db!, "players", p.id), { elo_interno: increment(25) }))
      );

      setShowFinalize(false);
      setWinnerChoice(null);
      setStatus("Partida finalizada. Elo atualizado.");
    } finally {
      setSavingResult(false);
    }
  };

  const handleLeaveMix = async () => {
    if (!db || !steamId) return;
    setLeavingMix(true);
    await deleteDoc(doc(db, "mixes", mixId, "participants", steamId));
    setLeavingMix(false);
    window.location.assign("/mix");
  };

  const loginWithSteam = () => {
    const returnUrl = `${window.location.origin}/auth/steam/callback?mixId=${encodeURIComponent(mixId)}`;
    window.location.href = buildSteamLoginUrl(returnUrl);
  };

  const handleLogout = async () => {
    if (auth) await auth.signOut().catch(() => {});
    localStorage.removeItem(storageKeys.steamId);
    localStorage.removeItem(storageKeys.nickname);
    setSteamId(null);
    setPlayerNickname(null);
    setStatus("Sessão encerrada.");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("Link copiado");
      setTimeout(() => setCopyState("Copiar link"), 2000);
    } catch { setCopyState("Falha ao copiar"); }
  };

  // ── Página sem mixId ──────────────────────────────────────────────────────
  if (!mixId) {
    const content = (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="text-center">
          <h1 className="text-3xl font-black italic tracking-tight text-slate-100 md:text-4xl">Central de mix</h1>
          <p className="mt-2 text-sm font-medium text-slate-400">Crie uma sala ou entre com um código existente.</p>
        </header>
        <div className="grid gap-6 md:grid-cols-2">
          <CreateMix playerId={steamId} onMixCreated={(id) => window.location.assign(`/?mixId=${id}`)} />
          <JoinMixCard onJoin={(id) => window.location.assign(`/?mixId=${id}`)} />
        </div>
        <QuickGuide />
      </div>
    );
    if (embedded) return content;
    return <div className="page-shell"><div className="mx-auto max-w-4xl px-6 py-12">{content}</div></div>;
  }

  const balanceHint =
    mixStatus === "live"     ? "Partida em andamento."
    : mixStatus === "sorting" ? "Times definidos. Siga com o veto."
    : mixStatus === "finished"? "Partida finalizada."
    : !steamId               ? "Faça login com Steam para sortear."
    : !isCreator             ? "Apenas o criador pode sortear."
    : filledSlots === 10     ? "Pronto para sortear."
    : `Aguardando ${10 - filledSlots} jogadores.`;

  return (
    <div className={embedded ? "flex flex-col gap-6" : "page-shell"}>
      {!embedded && (
        <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b0f14]/95 px-6 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
            <Logo variant="dark" onClick={() => window.location.assign("/")} />
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-sm border border-white/10 bg-[#0f1115] px-4 py-2">
                <p className="text-[10px] font-mono uppercase text-slate-500">Status</p>
                <p className="text-xs font-black uppercase text-[#00f2ff]">{mixStatus} ({filledSlots}/10)</p>
              </div>
              {finalMap && (
                <div className="rounded-sm border border-white/10 bg-[#0f1115] px-4 py-2">
                  <p className="text-[10px] font-mono uppercase text-slate-500">Mapa</p>
                  <p className="text-xs font-black uppercase text-[#7ff7ff]">{finalMap.replace("de_", "")}</p>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <div className={embedded ? "flex flex-col gap-6" : "mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10"}>
        {/* Header do lobby */}
        <header className="hud-reveal flex flex-col gap-4 rounded-sm border border-white/5 bg-[#0f1115] p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.25em] text-[#00f2ff]">SynapseCS Mix Lab</p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-slate-100">CS2 Mix Lobby</h1>
              <p className="mt-1 text-sm text-slate-400">Aguardando jogadores ({filledSlots}/10)</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {steamId ? (
                <div className="inline-flex items-center gap-3 rounded-sm border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300">
                  <div className="flex flex-col">
                    <span className="uppercase tracking-[0.2em] text-slate-500">Steam OK</span>
                    <span className="font-mono text-[11px] text-slate-200">{playerNickname ?? steamId}</span>
                  </div>
                  <button type="button" onClick={handleLogout} className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/10 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:bg-white/20">
                    <LogOut size={14} /> Sair
                  </button>
                </div>
              ) : (
                <button type="button" onClick={loginWithSteam} className="inline-flex items-center gap-2 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7ff7ff] transition hover:bg-[#00f2ff]/20">
                  <LogIn size={16} /> Login Steam
                </button>
              )}
              <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10">
                <LinkIcon size={18} /> {copyState}
              </button>
              {steamId && isParticipant && (
                <button type="button" onClick={handleLeaveMix} disabled={leavingMix} className="inline-flex items-center gap-2 rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff8a8a] transition hover:bg-[#ff3e3e]/20 disabled:cursor-not-allowed disabled:opacity-60">
                  <LogOut size={16} /> {leavingMix ? "Saindo..." : "Sair do mix"}
                </button>
              )}
            </div>
          </div>
          {status && <div className="rounded-sm border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">{status}</div>}
        </header>

        {/* Lobby + sidebar */}
        <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="flex flex-col gap-4">
            <RealtimeSlots mixId={mixId} currentUserId={steamId} onParticipantsChange={setPlayers} />
            <button type="button" onClick={handleBalance} disabled={!canBalance} className="w-full rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] py-4 text-[11px] font-black uppercase tracking-[0.3em] text-[#050505] shadow-[0_0_24px_rgba(0,242,255,0.3)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500">
              Sortear times e gerar mix
            </button>
          </div>

          <aside className="flex flex-col gap-4">
            <div className="hud-reveal rounded-sm border border-white/5 bg-[#0f1115] p-6">
              <h3 className="font-display text-lg font-semibold text-slate-100">Mix Status</h3>
              <p className="mt-2 text-sm text-slate-400">{balanceHint}</p>
              <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Status: <span className="font-mono text-slate-200">{mixStatus}</span>
              </div>
              <button type="button" onClick={handleBalance} disabled={!canBalance} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60">
                <Trophy size={18} /> Sortear agora
              </button>
              <button type="button" onClick={() => setShowFinalize(true)} disabled={!canFinalize} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500">
                Finalizar partida
              </button>
            </div>

            {/* Times balanceados */}
            <div className="hud-reveal rounded-sm border border-white/5 bg-[#0f1115] p-6">
              <h3 className="font-display text-lg font-semibold text-slate-100">Times balanceados</h3>
              {balanced ? (
                <div className="mt-4 grid gap-4">
                  {([balanced.teamA, balanced.teamB] as const).map((team, ti) => (
                    <div key={ti} className={`rounded-sm border p-4 ${ti === 0 ? "border-[#00f2ff]/30 bg-[#00f2ff]/5" : "border-white/10 bg-white/5"}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-100">Time {ti === 0 ? "A" : "B"}</p>
                        <span className="text-xs text-slate-400">Média {ti === 0 ? averageA : averageB}</span>
                      </div>
                      <ul className="mt-3 space-y-2 text-sm text-slate-200">
                        {team.map((p) => (
                          <li key={p.id} className="flex justify-between">
                            <span>{p.nickname}</span>
                            <div className="flex items-center gap-2">
                              <span className={getGcLevelBadgeClass(p.gc_level, "sm")}><GamersClubLogo className="h-3 w-3 text-[#00f2ff]" /> GC {p.gc_level}</span>
                              <span className={getFaceitLevelBadgeClass(p.faceit_level, "sm")}><FaceitLogo className="h-3 w-3 text-[#ffb86b]" /> FACEIT {p.faceit_level}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Times ainda não sorteados.</p>
              )}
            </div>
          </aside>
        </section>

        {/* Veto + server info */}
        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
          <AdvancedMapVeto
            bannedMaps={bannedMaps}
            onBan={handleBanMap}
            isTurnA={turnSide === "A"}
            isCapA={isTeamA}
            isCapB={isTeamB}
            vetoLocked={isVetoLocked || Boolean(finalMap)}
          />
          <aside className="flex flex-col gap-4">
            {mixStatus === "live" && finalMap ? (
              <div className="rounded-sm border-4 border-[#00f2ff] bg-[#0b0f14] p-6 text-slate-100">
                <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#7ff7ff]">Partida iniciada</p>
                <h3 className="mt-3 text-2xl font-black italic text-white">MAPA: {MAP_POOL.find((m) => m.id === finalMap)?.name ?? "---"}</h3>
                <div className="mt-5 flex items-center justify-between rounded-sm border border-white/10 bg-[#0f1115] px-4 py-3">
                  <code className="text-[#00f2ff]">connect {serverIp || "defina o IP"}</code>
                  <button type="button" onClick={() => serverIp && void navigator.clipboard.writeText(`connect ${serverIp}`)} disabled={!serverIp} className="rounded-sm border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60">Copiar IP</button>
                </div>
                {serverIp ? (
                  <a href={`steam://connect/${serverIp}`} className="mt-4 inline-flex w-full items-center justify-center rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] py-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95">
                    Abrir jogo agora
                  </a>
                ) : null}
                {isCreator && (
                  <div className="mt-5 flex flex-col gap-2">
                    <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-400">Server IP</label>
                    <div className="flex gap-2">
                      <input value={serverIpDraft} onChange={(e) => setServerIpDraft(e.target.value)} placeholder="123.456.789.000:27015" className="flex-1 rounded-sm border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500" />
                      <button type="button" onClick={handleSaveServerIp} disabled={savingServerIp} className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500">
                        {savingServerIp ? "Salvando" : "Salvar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-sm border border-white/5 bg-[#0f1115] p-6">
                <h3 className="font-display text-lg font-semibold text-slate-100">Status do veto</h3>
                <p className="mt-2 text-sm text-slate-400">{isVetoLocked || finalMap ? "Veto encerrado." : `Faltam ${remainingMaps.length} mapas.`}</p>
              </div>
            )}
          </aside>
        </section>

        {/* Scoreboard ao vivo */}
        {(mixStatus === "live" || mixStatus === "finished") && (
          <section>
            <p className="mb-3 text-[10px] font-mono uppercase tracking-[0.3em] text-[#00f2ff]">Placar ao vivo</p>
            <LiveScoreboard mixId={mixId} scoreA={scoreA} scoreB={scoreB} map={finalMap} />
          </section>
        )}
      </div>

      {/* Modal finalizar */}
      {showFinalize && balanced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-3xl rounded-sm border border-white/10 bg-[#0f1115] p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">Finalizar partida</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-slate-100">Selecione o vencedor</h2>
                <p className="mt-2 text-sm text-slate-400">O elo será incrementado em 25 pontos para o time vencedor.</p>
              </div>
              <button type="button" onClick={() => { setShowFinalize(false); setWinnerChoice(null); }} className="rounded-sm border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {([balanced.teamA, balanced.teamB] as const).map((team, ti) => (
                <button key={ti} type="button" onClick={() => setWinnerChoice(ti === 0 ? "A" : "B")} className={clsx("rounded-sm border px-4 py-4 text-left transition", winnerChoice === (ti === 0 ? "A" : "B") ? "border-[#00f2ff] bg-[#00f2ff]/10" : "border-white/10 bg-[#0b0f14] hover:bg-white/5")}>
                  <p className="text-sm font-semibold text-slate-100">Time {ti === 0 ? "A" : "B"}</p>
                  <ul className="mt-3 space-y-1 text-sm text-slate-300">
                    {team.map((p) => <li key={p.id}>{p.nickname}</li>)}
                  </ul>
                </button>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
              <button type="button" onClick={() => { setShowFinalize(false); setWinnerChoice(null); }} className="rounded-sm border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:bg-white/10">Cancelar</button>
              <button type="button" onClick={handleFinalize} disabled={savingResult || !winnerChoice} className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-5 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500">
                {savingResult ? "Processando..." : "Confirmar vencedor"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
