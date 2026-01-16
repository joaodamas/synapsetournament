import { useState } from 'react';
import { Check, Copy, Plus, Users } from 'lucide-react';

import { hasSupabaseConfig, supabase } from '../lib/supabase';

type CreateMixProps = {
  playerId?: string | null;
  onMixCreated?: (mixId: string) => void;
};

export const CreateMix = ({ playerId, onMixCreated }: CreateMixProps) => {
  const [loading, setLoading] = useState(false);
  const [createdMixId, setCreatedMixId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('');
  const [slotCount, setSlotCount] = useState(0);

  const handleCreate = async () => {
    if (!hasSupabaseConfig || !supabase) {
      setStatus('Configure o Supabase para criar o mix.');
      return;
    }
    if (!playerId) {
      setStatus('Faca login antes de criar um mix.');
      return;
    }

    setLoading(true);
    setStatus('');

    const { data, error } = await supabase
      .from('mixes')
      .insert([
        {
          status: 'waiting',
          creator_id: playerId,
          banned_maps: [],
          final_map: null,
        },
      ])
      .select('id')
      .single();

    if (error) {
      setStatus(error.message);
      setLoading(false);
      return;
    }

    const mixId = data?.id;
    if (!mixId) {
      setStatus('Nao foi possivel criar o mix.');
      setLoading(false);
      return;
    }

    setCreatedMixId(mixId);
    onMixCreated?.(mixId);

    if (playerId) {
      const { error: joinError } = await supabase
        .from('mix_participants')
        .upsert(
          { mix_id: mixId, player_id: playerId },
          { onConflict: 'mix_id,player_id', ignoreDuplicates: true },
        );

      if (!joinError) {
        setSlotCount(1);
      }
    }

    setLoading(false);
  };

  const copyLink = async () => {
    if (!createdMixId) {
      return;
    }
    const domain =
      (import.meta.env.VITE_SITE_URL as string | undefined) ||
      window.location.origin;
    const link = `${domain}/?mixId=${createdMixId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl">
      {!createdMixId ? (
        <div className="rounded-sm border border-white/5 bg-[#0f1115] p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-sm border border-white/10 bg-white/5">
            <Users className="text-[#00f2ff]" size={40} />
          </div>
          <h2 className="mb-4 text-3xl font-black italic text-slate-100">
            PRONTO PARA O MIX?
          </h2>
          <p className="mb-10 text-slate-400">
            Crie uma sala, convide seus amigos e deixe que a Synapse cuide do
            balanceamento e do veto.
          </p>
          {status && (
            <div className="mb-6 rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-4 py-3 text-sm text-[#ff8a8a]">
              {status}
            </div>
          )}
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] py-5 text-[11px] font-black uppercase tracking-[0.3em] text-[#050505] transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-slate-500"
          >
            {loading ? (
              'Gerando sala...'
            ) : (
              <>
                <Plus size={18} />
                Criar novo mix 5v5
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="rounded-sm border-t-4 border-[#00f2ff] bg-[#0b0f14] p-10 text-slate-100">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff]/10 p-2">
              <Check size={20} className="text-white" />
            </div>
            <h2 className="text-2xl font-black italic">
              Sala criada com sucesso!
            </h2>
          </div>

          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500">
            Compartilhe o link com os jogadores
          </p>

          <div className="mb-8 flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-[#0f1115] p-4">
            <code className="truncate text-sm text-[#7ff7ff]">
              {(import.meta.env.VITE_SITE_URL as string | undefined) ||
                window.location.origin}
              /?mixId={createdMixId}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#050505] transition hover:brightness-95"
            >
              {copied ? (
                <>
                  <Check size={14} /> Copiado
                </>
              ) : (
                <>
                  <Copy size={14} /> Copiar
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-sm border border-white/10 bg-white/5 p-4 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Jogadores
              </p>
              <p className="text-xl font-black text-slate-100">
                {slotCount} / 10
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                window.location.assign(`/?mixId=${createdMixId}`)
              }
              className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] font-black text-[#050505] transition hover:brightness-95"
            >
              Entrar no lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
