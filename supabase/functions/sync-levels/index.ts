const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const faceitApiKey = Deno.env.get('FACEIT_API_KEY') ?? '';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const extractFaceitNickname = (value: string) => {
  const trimmed = value.trim();
  const urlMatch = trimmed.match(
    /faceit\.com\/(?:[a-z]{2}\/)?players\/([^/?#]+)/i,
  );
  if (urlMatch?.[1]) {
    return decodeURIComponent(urlMatch[1]);
  }
  return trimmed;
};

const fetchFaceitLevel = async (nickname: string) => {
  if (!faceitApiKey) {
    return { level: null, warning: 'FACEIT_API_KEY nao configurada.' };
  }

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
    return { level: null, warning: 'Nao foi possivel consultar a Faceit.' };
  }

  const payload = await response.json();
  const games = payload?.games ?? {};
  const cs2Level = games?.cs2?.skill_level;
  const csgoLevel = games?.csgo?.skill_level;
  const level = Number(cs2Level ?? csgoLevel ?? 0) || null;

  if (!level) {
    return { level: null, warning: 'Nivel Faceit nao encontrado.' };
  }

  return { level, warning: null };
};

const extractGcLevel = (html: string) => {
  const patterns = [
    /"level"\s*:\s*(\d{1,2})/i,
    /"gc_level"\s*:\s*(\d{1,2})/i,
    /badge-level-value">\s*(\d{1,2})\s*</i,
    /new-badge-level-(\d{1,2})/i,
    /N[ií]vel\s*(\d{1,2})/i,
    /Level\s*(\d{1,2})/i,
    /data-level\s*=\s*"?(\d{1,2})"?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const level = Number(match[1]);
      if (Number.isFinite(level) && level > 0) {
        return level;
      }
    }
  }

  return null;
};

const fetchGcLevel = async (profileUrl: string) => {
  try {
    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SynapseCS/1.0',
      },
    });
    if (!response.ok) {
      return { level: null, warning: 'Nao foi possivel acessar a GamersClub.' };
    }
    const html = await response.text();
    const level = extractGcLevel(html);
    if (!level) {
      return {
        level: null,
        warning: 'Nivel da GamersClub nao encontrado.',
      };
    }
    return { level, warning: null };
  } catch (_error) {
    return { level: null, warning: 'Falha ao ler perfil da GamersClub.' };
  }
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

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase service role nao configurado.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }

  let payload: {
    playerId?: string;
    gcProfileUrl?: string | null;
    faceitProfileUrl?: string | null;
  } = {};

  try {
    payload = await req.json();
  } catch (_error) {
    return new Response(JSON.stringify({ error: 'Invalid JSON payload.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const playerId = payload.playerId?.trim() ?? '';
  if (!playerId || !isUuid(playerId)) {
    return new Response(JSON.stringify({ error: 'playerId invalido.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const updates: Record<string, unknown> = {};
  const warnings: string[] = [];

  if (payload.gcProfileUrl !== undefined) {
    const gcProfileUrl = payload.gcProfileUrl?.trim() ?? '';
    updates.gc_profile_url = gcProfileUrl || null;
    if (gcProfileUrl) {
      const gcResult = await fetchGcLevel(gcProfileUrl);
      if (gcResult.level) {
        updates.gc_level = gcResult.level;
      }
      if (gcResult.warning) {
        warnings.push(gcResult.warning);
      }
    }
  }

  if (payload.faceitProfileUrl !== undefined) {
    const faceitProfileUrl = payload.faceitProfileUrl?.trim() ?? '';
    updates.faceit_profile_url = faceitProfileUrl || null;
    if (faceitProfileUrl) {
      const nickname = extractFaceitNickname(faceitProfileUrl);
      const faceitResult = await fetchFaceitLevel(nickname);
      if (faceitResult.level) {
        updates.faceit_level = faceitResult.level;
      }
      if (faceitResult.warning) {
        warnings.push(faceitResult.warning);
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return new Response(JSON.stringify({ error: 'Nada para atualizar.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/players?id=eq.${playerId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(updates),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return new Response(JSON.stringify({ error: text }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const updated = await response.json();

  return new Response(
    JSON.stringify({ player: updated?.[0] ?? null, warnings }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
