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

const toNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.replace('%', '').replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const pickStatValue = (stats: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    if (stats[key] !== undefined && stats[key] !== null) {
      return stats[key];
    }
  }
  return null;
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
    games: (payload?.games as Record<string, unknown>) ?? {},
  };
};

const fetchFaceitStats = async (playerId: string, game: string) => {
  const url = `https://open.faceit.com/data/v4/players/${playerId}/stats/${encodeURIComponent(
    game,
  )}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${faceitApiKey}`,
    },
  });

  if (!response.ok) {
    return { error: 'Nao foi possivel consultar as estatisticas Faceit.' };
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

  let payload: { faceitProfileUrl?: string; nickname?: string } = {};

  try {
    payload = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawNickname =
    payload.nickname?.trim() ?? payload.faceitProfileUrl?.trim() ?? '';
  if (!rawNickname) {
    return new Response(
      JSON.stringify({ error: 'Informe o nickname da Faceit.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const nickname = extractFaceitNickname(rawNickname);
  const player = await fetchFaceitPlayer(nickname);
  if ('error' in player) {
    return new Response(JSON.stringify({ error: player.error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let gameId = 'cs2';
  let stats = await fetchFaceitStats(player.playerId, gameId);
  if (stats.error) {
    gameId = 'csgo';
    stats = await fetchFaceitStats(player.playerId, gameId);
  }

  if (stats.error || !stats.data) {
    return new Response(JSON.stringify({ error: stats.error }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const lifetime = (stats.data?.lifetime as Record<string, unknown>) ?? {};
  const segments = (stats.data?.segments as Record<string, unknown>[]) ?? [];
  const gameInfo = player.games?.[gameId] as Record<string, unknown> | undefined;

  const mapSegments = segments.filter((segment) => segment?.type === 'Map');
  const totals = mapSegments.reduce(
    (acc, segment) => {
      const statsBlock =
        (segment?.stats as Record<string, unknown>) ?? {};
      const kills = toNumber(pickStatValue(statsBlock, ['Kills']));
      const deaths = toNumber(pickStatValue(statsBlock, ['Deaths']));
      if (kills !== null) {
        acc.kills += kills;
        acc.hasValues = true;
      }
      if (deaths !== null) {
        acc.deaths += deaths;
        acc.hasValues = true;
      }
      return acc;
    },
    { kills: 0, deaths: 0, hasValues: false },
  );

  const summary = {
    matches: toNumber(pickStatValue(lifetime, ['Matches', 'matches'])),
    wins: toNumber(pickStatValue(lifetime, ['Wins', 'wins'])),
    winRate: toNumber(pickStatValue(lifetime, ['Win Rate %', 'Winrate %', 'Win Rate'])),
    kills: totals.hasValues
      ? totals.kills
      : toNumber(
          pickStatValue(lifetime, ['Total Kills with extended stats', 'Kills']),
        ),
    deaths: totals.hasValues ? totals.deaths : null,
    kd: toNumber(
      pickStatValue(lifetime, ['Average K/D Ratio', 'K/D Ratio', 'KD Ratio']),
    ),
    adr: toNumber(
      pickStatValue(lifetime, ['Average ADR', 'ADR', 'Average Damage']),
    ),
    hsPercent: toNumber(
      pickStatValue(lifetime, ['Average Headshots %', 'Headshots %', 'HS %']),
    ),
    elo: toNumber(gameInfo?.faceit_elo),
    level: toNumber(gameInfo?.skill_level),
  };

  const maps = mapSegments
    .map((segment) => {
      const statsBlock =
        (segment?.stats as Record<string, unknown>) ?? {};
      return {
        name: (segment?.label as string) ?? 'Unknown',
        matches: toNumber(pickStatValue(statsBlock, ['Matches', 'matches'])),
        winRate: toNumber(
          pickStatValue(statsBlock, ['Win Rate %', 'Winrate %', 'Win Rate']),
        ),
        kd: toNumber(
          pickStatValue(statsBlock, ['Average K/D Ratio', 'K/D Ratio', 'KD Ratio']),
        ),
        adr: toNumber(
          pickStatValue(statsBlock, ['Average ADR', 'ADR', 'Average Damage']),
        ),
        hsPercent: toNumber(
          pickStatValue(statsBlock, ['Average Headshots %', 'Headshots %', 'HS %']),
        ),
      };
    })
    .sort((a, b) => (b.matches ?? 0) - (a.matches ?? 0))
    .slice(0, 5);

  return new Response(
    JSON.stringify({
      nickname: player.nickname,
      game: gameId,
      stats: summary,
      maps,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
