const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ocrApiKey = Deno.env.get('OCR_SPACE_API_KEY') ?? '';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

const normalizeNumber = (value: string) => {
  const parsed = Number(value.replace('%', '').replace(',', '.').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const extractMetric = (text: string, labels: string[]) => {
  for (const label of labels) {
    const regex = new RegExp(`${label}\\s*[:=]?\\s*([0-9]+[\\.,]?[0-9]*)`, 'i');
    const match = text.match(regex);
    if (match?.[1]) {
      const value = normalizeNumber(match[1]);
      if (value !== null) {
        return value;
      }
    }
  }
  return null;
};

const parseStatsFromText = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ');
  const kd = extractMetric(normalized, [
    'KDR',
    'K\\s*/\\s*D',
    'K\\s*D\\s*RATIO',
    'KD\\s*RATIO',
    'KD',
  ]);
  const adr = extractMetric(normalized, [
    'ADR',
    'MEDIA\\s*ADR',
    'AVG\\s*ADR',
  ]);
  const winrate = extractMetric(normalized, [
    'WINRATE',
    'WIN\\s*RATE',
    'WIN\\s*%',
    'WR',
  ]);

  return { kd, adr, winrate };
};

const parseStatsFromHtml = (html: string) => {
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ');
  return parseStatsFromText(text);
};

const parseStatsFromOcr = async (imageUrl?: string, imageBase64?: string) => {
  if (!ocrApiKey) {
    return { error: 'OCR_SPACE_API_KEY nao configurada.' };
  }

  if (!imageUrl && !imageBase64) {
    return { error: 'Envie a imagem ou o link do print.' };
  }

  const form = new FormData();
  form.append('apikey', ocrApiKey);
  form.append('language', 'eng');
  form.append('detectOrientation', 'true');
  form.append('OCREngine', '2');
  form.append('scale', 'true');
  form.append('isTable', 'true');
  if (imageUrl) {
    form.append('url', imageUrl);
  }
  if (imageBase64) {
    form.append('base64Image', imageBase64);
  }

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form,
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      error: `Nao foi possivel ler o print da GamersClub. ${detail}`.trim(),
    };
  }

  const payload = await response.json();
  const ocrError = Array.isArray(payload?.ErrorMessage)
    ? payload?.ErrorMessage?.[0]
    : payload?.ErrorMessage;
  if (payload?.IsErroredOnProcessing || ocrError) {
    return {
      error: `OCR: ${ocrError || 'Falha ao processar a imagem.'}`.trim(),
    };
  }
  const parsedText =
    payload?.ParsedResults?.[0]?.ParsedText ?? '';
  if (!parsedText) {
    return { error: 'Texto nao encontrado no print.' };
  }

  return { data: parseStatsFromText(parsedText) };
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
    gcProfileUrl?: string;
    imageUrl?: string;
    imageBase64?: string;
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

  const gcProfileUrl = payload.gcProfileUrl?.trim() ?? '';
  const imageUrl = payload.imageUrl?.trim() ?? '';
  const imageBase64 = payload.imageBase64?.trim() ?? '';

  let stats = { kd: null as number | null, adr: null as number | null, winrate: null as number | null };
  let warnings: string[] = [];

  if (imageUrl || imageBase64) {
    const ocr = await parseStatsFromOcr(imageUrl || undefined, imageBase64 || undefined);
    if ('error' in ocr) {
      return new Response(JSON.stringify({ error: ocr.error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    stats = ocr.data;
  } else if (gcProfileUrl) {
    return new Response(
      JSON.stringify({
        error:
          'A GamersClub nao expoe stats no HTML. Use o print para importar.',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } else {
    return new Response(JSON.stringify({ error: 'Envie a imagem ou o link do perfil.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const updates: Record<string, unknown> = {};
  if (stats.kd !== null) {
    updates.gc_kd = stats.kd;
  }
  if (stats.adr !== null) {
    updates.gc_adr = stats.adr;
  }
  if (stats.winrate !== null) {
    updates.gc_winrate = stats.winrate;
  }

  if (Object.keys(updates).length === 0) {
    const sourceLabel = imageUrl || imageBase64 ? 'imagem' : 'perfil';
    return new Response(
      JSON.stringify({
        error: `Nao foi possivel extrair os stats do ${sourceLabel}.`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
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
    JSON.stringify({
      stats,
      warnings,
      player: updated?.[0] ?? null,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
