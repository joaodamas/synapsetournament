import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, UserPlus } from "lucide-react";

import type { Player } from "../types";
import {
  db, hasFirebaseConfig,
  collection, doc, getDoc, setDoc,
  query, orderBy, onSnapshot, serverTimestamp,
} from "../lib/firebase";

type SlotPlayer = Player & { elo_interno?: number | null };

type RealtimeSlotsProps = {
  mixId: string;
  currentUserId?: string | null;
  onParticipantsChange?: (players: Player[]) => void;
};

export const RealtimeSlots = ({ mixId, currentUserId, onParticipantsChange }: RealtimeSlotsProps) => {
  const [participants, setParticipants] = useState<SlotPlayer[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [status,       setStatus]       = useState("");

  useEffect(() => {
    if (!hasFirebaseConfig || !db || !mixId) {
      setStatus("Firebase não configurado.");
      setLoading(false);
      return;
    }

    // Ouve mudanças em tempo real na subcoleção participants do mix
    const participantsRef = collection(db, "mixes", mixId, "participants");
    const q = query(participantsRef, orderBy("joined_at", "asc"));

    const unsub = onSnapshot(q, async (snap) => {
      if (!db) return;

      const playerIds = snap.docs.map((d) => d.id);

      // Busca perfis dos jogadores em paralelo
      const playerDocs = await Promise.all(
        playerIds.map((id) => getDoc(doc(db!, "players", id)))
      );

      const players: SlotPlayer[] = playerDocs
        .filter((d) => d.exists())
        .map((d) => ({ id: d.id, ...(d.data() as Omit<SlotPlayer, "id">) }));

      setParticipants(players);
      onParticipantsChange?.(players);
      setStatus("");
      setLoading(false);
    }, (err) => {
      setStatus(err.message);
      setLoading(false);
    });

    return () => unsub();
  }, [mixId, onParticipantsChange]);

  const joinMix = useCallback(async () => {
    if (!hasFirebaseConfig || !db) { setStatus("Firebase não configurado."); return; }
    if (!currentUserId)            { setStatus("Faça login para entrar no mix."); return; }
    if (participants.length >= 10) return;

    try {
      await setDoc(
        doc(db, "mixes", mixId, "participants", currentUserId),
        { player_id: currentUserId, joined_at: serverTimestamp() }
      );
    } catch (err: unknown) {
      setStatus(err instanceof Error ? err.message : "Erro ao entrar no mix.");
    }
  }, [currentUserId, mixId, participants.length]);

  const hasCurrentUser = useMemo(
    () => Boolean(currentUserId) && participants.some((p) => p.id === currentUserId),
    [currentUserId, participants]
  );

  const slots = useMemo(() => Array.from({ length: 10 }), []);

  return (
    <div className="hud-reveal rounded-sm border border-white/5 bg-[#0f1115] p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-slate-100">Lobby</h2>
          <p className="text-xs font-mono uppercase tracking-[0.3em] text-[#00f2ff]">
            Aguardando jogadores ({participants.length}/10)
          </p>
        </div>
        {!hasCurrentUser && participants.length < 10 && (
          <button
            type="button"
            onClick={joinMix}
            className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-6 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#050505] shadow-[0_0_20px_rgba(0,242,255,0.35)] transition hover:-translate-y-0.5"
          >
            Entrar no mix
          </button>
        )}
      </div>

      {status && (
        <div className="mt-4 rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-4 py-3 text-xs text-[#ff8a8a]">
          {status}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {slots.map((_, index) => {
          const player = participants[index];
          const slotLabel = String(index + 1).padStart(2, "0");
          return (
            <div
              key={index}
              className={`group relative flex items-center gap-4 rounded-sm border px-3 py-3 transition-all ${
                player
                  ? "border-white/10 bg-[#0f1115] hover:border-[#00f2ff]/60"
                  : "border-dashed border-white/10 bg-[#0b0e12]"
              }`}
            >
              <div className="absolute top-1 right-2 text-[8px] font-mono text-slate-600">
                SLOT_{slotLabel}
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center border ${
                  player ? "border-[#00f2ff] bg-[#0b0f14]" : "border-white/10 bg-[#0b0f14]"
                }`}
              >
                {player ? (
                  player.avatar_url ? (
                    <img
                      src={player.avatar_url}
                      alt={player.nickname}
                      className="h-full w-full object-cover grayscale transition group-hover:grayscale-0"
                    />
                  ) : (
                    <span className="text-xs font-black text-[#00f2ff]">
                      {player.nickname.slice(0, 2).toUpperCase()}
                    </span>
                  )
                ) : (
                  <UserPlus size={20} className="text-slate-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-100">
                  {player?.nickname || "WAITING_USER..."}
                </p>
                <div className="mt-1 flex gap-4 text-[9px] font-mono uppercase tracking-[0.2em]">
                  <span className="text-[#00f2ff]">LEVEL: {player?.gc_level ?? "--"}</span>
                  <span className="text-slate-500">ELO: {player?.elo_interno ?? "0000"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 h-2 overflow-hidden rounded-sm border border-white/10 bg-[#0b0f14]">
        <div
          className="h-full bg-[#00f2ff] shadow-[0_0_16px_rgba(0,242,255,0.4)] transition-all duration-1000 ease-out"
          style={{ width: `${(participants.length / 10) * 100}%` }}
        />
      </div>

      {participants.length === 10 && (
        <div className="mt-6 flex items-center justify-center gap-3 rounded-sm border border-[#00f2ff]/30 bg-[#00f2ff]/10 p-4 text-[#7ff7ff]">
          <CheckCircle2 size={20} />
          <span className="text-xs font-black uppercase tracking-[0.2em]">
            Lobby cheio! O sorteio pode começar.
          </span>
        </div>
      )}

      {loading && (
        <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-slate-500">
          Atualizando slots...
        </p>
      )}
    </div>
  );
};
