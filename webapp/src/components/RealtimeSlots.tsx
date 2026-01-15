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
    <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-soft">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black italic text-slate-900">
            Lobby
          </h2>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
            Aguardando jogadores ({participants.length}/10)
          </p>
        </div>

        {!hasCurrentUser && participants.length < 10 && (
          <button
            type="button"
            onClick={joinMix}
            className="rounded-2xl bg-blue-600 px-6 py-3 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-200 transition-all hover:scale-105 hover:bg-blue-700"
          >
            Entrar no mix
          </button>
        )}
      </div>

      {status && (
        <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {status}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        {slots.map((_, index) => {
          const player = participants[index];
          return (
            <div
              key={index}
              className={`flex aspect-square flex-col items-center justify-center rounded-[2rem] border-2 p-4 transition-all duration-500 ${
                player
                  ? 'border-blue-500 bg-white shadow-xl shadow-blue-100'
                  : 'border-dashed border-slate-200 bg-slate-50'
              }`}
            >
              {player ? (
                <>
                  {player.avatar_url ? (
                    <img
                      src={player.avatar_url}
                      alt={player.nickname}
                      className="mb-2 h-16 w-16 rounded-full border-2 border-blue-500 object-cover shadow-md"
                    />
                  ) : (
                    <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-500 bg-blue-50 text-sm font-black text-blue-600">
                      {player.nickname.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <p className="w-full truncate text-center text-[11px] font-black uppercase tracking-tight text-slate-900">
                    {player.nickname}
                  </p>
                  <p className="text-[9px] font-bold text-blue-600">
                    {player.elo_interno ?? 0} PTS
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-30">
                  <UserPlus size={24} className="text-slate-400" />
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                    Vago
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 h-3 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <div
          className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-1000 ease-out"
          style={{ width: `${(participants.length / 10) * 100}%` }}
        />
      </div>

      {participants.length === 10 && (
        <div className="mt-8 flex items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-600">
          <CheckCircle2 size={20} />
          <span className="text-sm font-black uppercase italic">
            Lobby cheio! O sorteio pode comecar.
          </span>
        </div>
      )}

      {loading && (
        <p className="mt-4 text-xs uppercase tracking-[0.3em] text-slate-400">
          Atualizando slots...
        </p>
      )}
    </div>
  );
};
