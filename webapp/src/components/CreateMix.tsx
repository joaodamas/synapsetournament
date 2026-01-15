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
    const link = `${window.location.origin}/?mixId=${createdMixId}`;
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
        <div className="rounded-[3rem] border border-slate-200 bg-white p-12 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50">
            <Users className="text-blue-600" size={40} />
          </div>
          <h2 className="mb-4 text-3xl font-black italic text-slate-900">
            PRONTO PARA O MIX?
          </h2>
          <p className="mb-10 text-slate-500">
            Crie uma sala, convide seus amigos e deixe que a Synapse cuide do
            balanceamento e do veto.
          </p>
          {status && (
            <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
              {status}
            </div>
          )}
          <button
            type="button"
            onClick={handleCreate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-5 text-sm font-black uppercase tracking-[0.3em] text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-blue-300"
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
        <div className="rounded-[3rem] border-t-4 border-blue-500 bg-slate-900 p-10 text-white shadow-2xl">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-full bg-emerald-500 p-2">
              <Check size={20} className="text-white" />
            </div>
            <h2 className="text-2xl font-black italic">
              Sala criada com sucesso!
            </h2>
          </div>

          <p className="mb-4 text-sm font-bold uppercase tracking-[0.3em] text-slate-400">
            Compartilhe o link com os jogadores
          </p>

          <div className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-800 p-4">
            <code className="truncate text-sm text-blue-300">
              {window.location.origin}/?mixId={createdMixId}
            </code>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-blue-500"
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
            <div className="rounded-2xl bg-slate-800/60 p-4 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-500">
                Jogadores
              </p>
              <p className="text-xl font-black text-white">
                {slotCount} / 10
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                window.location.assign(`/?mixId=${createdMixId}`)
              }
              className="rounded-2xl bg-white font-black text-slate-900 transition hover:bg-slate-100"
            >
              Entrar no lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
