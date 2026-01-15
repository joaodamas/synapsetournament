const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const faceitApiKey = Deno.env.get('FACEIT_API_KEY') ?? '';

const extractFaceitNickname = (value: string) => {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(
    /faceit\.com\/(?:[a-z-]+\/)?players\/([^/?#]+)/i,
  );
  if (urlMatch?.[1]) {
    return decodeURIComponent(urlMatch[1]);
  }
  return trimmed;
};

const fetchFaceitPlayer = async (nickname: string) => {
  const url = `https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(
    nickname,
  )}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${faceitApiKey}`,
    },
  });

  if (!response.ok) {
    return { error: 'Nao foi possivel consultar a Faceit.' };
  }

  const payload = await response.json();
  const playerId = payload?.player_id as string | undefined;
  if (!playerId) {
    return { error: 'Jogador Faceit nao encontrado.' };
  }

  return {
    playerId,
    nickname: payload?.nickname ?? nickname,
    avatarUrl: payload?.avatar ?? null,
  };
};

const fetchFaceitHistory = async (
  playerId: string,
  game: string,
  limit: number,
) => {
  const url = `https://open.faceit.com/data/v4/players/${playerId}/history?game=${encodeURIComponent(
    game,
  )}&offset=0&limit=${limit}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${faceitApiKey}`,
    },
  });

  if (!response.ok) {
    return { error: 'Nao foi possivel carregar o historico Faceit.' };
  }

  const payload = await response.json();
  return { data: payload };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!faceitApiKey) {
    return new Response(
      JSON.stringify({ error: 'FACEIT_API_KEY nao configurada.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  let payload: { faceitProfileUrl?: string; nickname?: string; limit?: number } =
    {};

  try {
    payload = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawNickname = payload.nickname?.trim() ?? payload.faceitProfileUrl?.trim() ?? '';
  if (!rawNickname) {
    return new Response(JSON.stringify({ error: 'Informe o nickname da Faceit.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const nickname = extractFaceitNickname(rawNickname);
  const player = await fetchFaceitPlayer(nickname);
  if ('error' in player) {
    return new Response(JSON.stringify({ error: player.error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const limit = Math.min(Math.max(Number(payload.limit ?? 5), 1), 10);

  let history = await fetchFaceitHistory(player.playerId, 'cs2', limit);
  if (history.error) {
    history = await fetchFaceitHistory(player.playerId, 'csgo', limit);
  }

  if (history.error || !history.data) {
    return new Response(JSON.stringify({ error: history.error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const matches = (history.data?.items ?? []).map((item: Record<string, unknown>) => ({
    id: (item?.match_id as string) ?? '',
    competitionName: (item?.competition_name as string) ?? 'Faceit',
    game: (item?.game_id as string) ?? null,
    region: (item?.region as string) ?? null,
    startedAt: (item?.started_at as number) ?? null,
    finishedAt: (item?.finished_at as number) ?? null,
    winner: (item?.results as { winner?: string } | undefined)?.winner ?? null,
    score: (item?.results as { score?: Record<string, string> } | undefined)?.score ?? null,
  }));

  return new Response(JSON.stringify({ matches }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
