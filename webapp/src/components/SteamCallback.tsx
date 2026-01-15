import { useEffect, useState } from 'react';

import { hasSupabaseConfig, supabase } from '../lib/supabase';

type CallbackState = 'idle' | 'loading' | 'error';

type SteamResponse = {
  steamId?: string;
  nickname?: string | null;
  avatarUrl?: string | null;
  error?: string;
};

const storageKeys = {
  playerId: 'synapsecs_player_id',
  steamId: 'synapsecs_steam_id',
  nickname: 'synapsecs_player_nickname',
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export const SteamCallback = () => {
  const [state, setState] = useState<CallbackState>('loading');
  const [message, setMessage] = useState('Validando login Steam...');

  useEffect(() => {
    const finalize = (text: string) => {
      setMessage(text);
      setState('error');
    };

    const run = async () => {
      if (!hasSupabaseConfig || !supabase) {
        finalize('Supabase nao configurado.');
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const rawQuery = window.location.search;
      const mixId = params.get('mixId');

      const { data, error } = await supabase.functions.invoke<SteamResponse>(
        'steam-login',
        { body: { rawQuery } },
      );

      if (error) {
        finalize(error.message);
        return;
      }

      if (!data?.steamId) {
        finalize(data?.error ?? 'Nao foi possivel validar o login Steam.');
        return;
      }

      const nickname =
        data.nickname?.trim() || `Steam ${data.steamId.slice(-4)}`;
      const avatarUrl = data.avatarUrl?.trim() || null;
      const playerPayload: Record<string, string> = {
        steam_id: data.steamId,
        nickname,
      };
      if (avatarUrl) {
        playerPayload.avatar_url = avatarUrl;
      }
      const { data: player, error: playerError } = await supabase
        .from('players')
        .upsert(playerPayload, { onConflict: 'steam_id' })
        .select('id, nickname')
        .single();

      if (playerError || !player) {
        finalize(playerError?.message ?? 'Falha ao salvar jogador.');
        return;
      }

      localStorage.setItem(storageKeys.playerId, player.id);
      localStorage.setItem(storageKeys.steamId, data.steamId);
      localStorage.setItem(storageKeys.nickname, player.nickname);

      setState('idle');
      setMessage('Login confirmado. Redirecionando...');

      const destination = mixId && isUuid(mixId) ? `/?mixId=${mixId}` : '/';
      window.location.replace(destination);
    };

    void run();
  }, []);

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-600">
            Steam Login
          </p>
          <h1 className="mt-4 font-display text-2xl font-semibold text-slate-900">
            {state === 'loading'
              ? 'Sincronizando perfil'
              : 'Nao foi possivel entrar'}
          </h1>
          <p className="mt-3 text-sm text-slate-500">{message}</p>
          {state === 'error' && (
            <a
              href="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Voltar para o lobby
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
