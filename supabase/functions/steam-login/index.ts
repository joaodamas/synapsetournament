const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const steamOpenIdUrl = 'https://steamcommunity.com/openid/login';
const steamProfileApi =
  'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/';

const fetchSteamProfile = async (steamId: string) => {
  const apiKey = Deno.env.get('STEAM_API_KEY');
  if (!apiKey) {
    return null;
  }

  const url = new URL(steamProfileApi);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('steamids', steamId);

  const response = await fetch(url.toString());
  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const player = payload?.response?.players?.[0];
  if (!player) {
    return null;
  }

  return {
    nickname: typeof player.personaname === 'string' ? player.personaname : null,
    avatarUrl:
      typeof player.avatarfull === 'string'
        ? player.avatarfull
        : typeof player.avatar === 'string'
          ? player.avatar
          : null,
  };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  let payload: { rawQuery?: string } = {};
  try {
    payload = await req.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const rawQuery = typeof payload.rawQuery === 'string' ? payload.rawQuery : '';
  const search = rawQuery.startsWith('?') ? rawQuery.slice(1) : rawQuery;
  const params = new URLSearchParams(search);

  const claimedId = params.get('openid.claimed_id');
  if (!claimedId) {
    return new Response(
      JSON.stringify({ error: 'Missing openid.claimed_id.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  if (params.get('openid.mode') === 'cancel') {
    return new Response(
      JSON.stringify({ error: 'Steam login canceled.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const validationParams = new URLSearchParams();
  for (const [key, value] of params.entries()) {
    validationParams.append(key, value);
  }
  validationParams.set('openid.mode', 'check_authentication');

  const validationResponse = await fetch(steamOpenIdUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: validationParams.toString(),
  });

  const validationText = await validationResponse.text();
  if (!validationText.includes('is_valid:true')) {
    return new Response(
      JSON.stringify({ error: 'Steam validation failed.' }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const match = claimedId.match(
    /https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)/,
  );
  if (!match) {
    return new Response(
      JSON.stringify({ error: 'Invalid Steam claimed id.' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  const profile = await fetchSteamProfile(match[1]);

  return new Response(
    JSON.stringify({
      steamId: match[1],
      nickname: profile?.nickname ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
