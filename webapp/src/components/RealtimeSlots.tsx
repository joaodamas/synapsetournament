import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, UserPlus } from 'lucide-react';

import type { Player } from '../types';
import { hasSupabaseConfig, supabase } from '../lib/supabase';

type SlotPlayer = Player & {
  elo_interno?: number | null;
};

type MixParticipantRow = {
  player: SlotPlayer | null;
};

type RealtimeSlotsProps = {
  mixId: string;
  currentUserId?: string | null;
  onParticipantsChange?: (players: Player[]) => void;
};

export const RealtimeSlots = ({
  mixId,
  currentUserId,
  onParticipantsChange,
}: RealtimeSlotsProps) => {
  const [participants, setParticipants] = useState<SlotPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const fetchParticipants = useCallback(async () => {
    if (!hasSupabaseConfig || !supabase) {
      setStatus('Supabase nao configurado.');
      setParticipants([]);
      setLoading(false);
      return;
    }

    if (!mixId) {
      setStatus('Informe um mixId valido.');
      setParticipants([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('mix_participants')
      .select(
        'player:players(id,nickname,steam_id,faceit_level,gc_level,avatar_url,elo_interno)',
      )
      .eq('mix_id', mixId)
      .order('created_at', { ascending: true });

    if (error) {
      setStatus(error.message);
      setParticipants([]);
      setLoading(false);
      return;
    }

    const mapped = (data ?? [])
      .map((row) => (row as MixParticipantRow).player)
      .filter((player): player is SlotPlayer => Boolean(player));

    setParticipants(mapped);
    onParticipantsChange?.(mapped);
    setStatus('');
    setLoading(false);
  }, [mixId, onParticipantsChange]);

  useEffect(() => {
    void fetchParticipants();

    if (!hasSupabaseConfig || !supabase || !mixId) {
      return;
    }

    const channel = supabase
      .channel(`mix_slots_${mixId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mix_participants',
          filter: `mix_id=eq.${mixId}`,
        },
        () => fetchParticipants(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchParticipants, mixId]);

  const joinMix = async () => {
    if (!hasSupabaseConfig || !supabase) {
      setStatus('Supabase nao configurado.');
      return;
    }
    if (!currentUserId) {
      setStatus('Faca login para entrar no mix.');
      return;
    }
    if (participants.length >= 10) {
      return;
    }

    const { error } = await supabase
      .from('mix_participants')
      .upsert(
        { mix_id: mixId, player_id: currentUserId },
        { onConflict: 'mix_id,player_id', ignoreDuplicates: true },
      );

    if (error && error.code !== '23505') {
      setStatus(error.message);
    }
  };

  const hasCurrentUser = useMemo(
    () =>
      Boolean(currentUserId) &&
      participants.some((player) => player.id === currentUserId),
    [currentUserId, participants],
  );

  const slots = useMemo(() => Array.from({ length: 10 }), []);

  return (
    <div className="hud-reveal rounded-sm border border-white/5 bg-[#0f1115] p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-slate-100">
            Lobby
          </h2>
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
          const slotLabel = String(index + 1).padStart(2, '0');
          return (
            <div
              key={index}
              className={`group relative flex items-center gap-4 rounded-sm border px-3 py-3 transition-all ${
                player
                  ? 'border-white/10 bg-[#0f1115] hover:border-[#00f2ff]/60'
                  : 'border-dashed border-white/10 bg-[#0b0e12]'
              }`}
            >
              <div className="absolute top-1 right-2 text-[8px] font-mono text-slate-600">
                SLOT_{slotLabel}
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center border ${
                  player
                    ? 'border-[#00f2ff] bg-[#0b0f14]'
                    : 'border-white/10 bg-[#0b0f14]'
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
                  {player?.nickname || 'WAITING_USER...'}
                </p>
                <div className="mt-1 flex gap-4 text-[9px] font-mono uppercase tracking-[0.2em]">
                  <span className="text-[#00f2ff]">
                    LEVEL: {player?.gc_level ?? '--'}
                  </span>
                  <span className="text-slate-500">
                    ELO: {player?.elo_interno ?? '0000'}
                  </span>
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
            Lobby cheio! O sorteio pode comecar.
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
