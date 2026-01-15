const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const steamOpenIdUrl = 'https://steamcommunity.com/openid/login';

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

  return new Response(
    JSON.stringify({ steamId: match[1] }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
});
