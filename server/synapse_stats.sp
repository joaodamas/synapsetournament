/**
 * SynapseCS Stats Collector
 * SourceMod plugin para CS2 — coleta K/D/A/HS/ADR/Entry/Bomb/Ace/Clutch
 * e envia para a API SynapseCS em tempo real.
 *
 * Dependências: ripext (https://github.com/ErikMinekus/sm-ripext)
 * Instalação:   compile e coloque em addons/sourcemod/plugins/
 * Config:       cfg/synapse.cfg
 */

#pragma semicolon 1
#pragma newdecls required

#include <sourcemod>
#include <sdktools>
#include <cstrike>
#include <ripext>

#define PLUGIN_VERSION "1.0.0"
#define MAX_PLAYERS    65

public Plugin myinfo = {
    name        = "SynapseCS Stats",
    author      = "SynapseCS",
    description = "Envia stats de partida para SynapseCS em tempo real",
    version     = PLUGIN_VERSION,
    url         = "https://synapsecs.com"
};

// ── CVars ────────────────────────────────────────────────────────────────────
ConVar g_cvApiUrl;
ConVar g_cvApiSecret;
ConVar g_cvMixId;
ConVar g_cvEnabled;

// ── Stats acumulados por jogador (reset no início da partida) ─────────────
int g_kills      [MAX_PLAYERS];
int g_deaths     [MAX_PLAYERS];
int g_assists    [MAX_PLAYERS];
int g_headshots  [MAX_PLAYERS];
int g_totalDmg   [MAX_PLAYERS];
int g_entryKills [MAX_PLAYERS];
int g_bombPlants [MAX_PLAYERS];
int g_bombDefuses[MAX_PLAYERS];
int g_ace        [MAX_PLAYERS];
int g_k2         [MAX_PLAYERS];
int g_k3         [MAX_PLAYERS];
int g_k4         [MAX_PLAYERS];
int g_clutchWins [MAX_PLAYERS];
int g_roundsPlayed[MAX_PLAYERS];
char g_team      [MAX_PLAYERS][4]; // "A" ou "B"

// ── Tracking por round (reset a cada round_start) ────────────────────────
int  g_roundDmg  [MAX_PLAYERS];
int  g_roundKills[MAX_PLAYERS];
bool g_entryDone;   // primeiro abate do round já aconteceu?
int  g_totalRounds;
bool g_matchLive;

// ── SteamIDs para identificar jogadores ──────────────────────────────────
char g_steamId[MAX_PLAYERS][32];

public void OnPluginStart()
{
    g_cvApiUrl    = CreateConVar("synapse_api_url",    "", "URL base da API SynapseCS (ex: https://xxx.supabase.co/functions/v1)", FCVAR_PROTECTED);
    g_cvApiSecret = CreateConVar("synapse_api_secret", "", "Token secreto configurado no Supabase", FCVAR_PROTECTED);
    g_cvMixId     = CreateConVar("synapse_mix_id",     "", "UUID do mix no SynapseCS");
    g_cvEnabled   = CreateConVar("synapse_enabled",    "1", "1 = ativo, 0 = desativado");

    AutoExecConfig(true, "synapse");

    HookEvent("round_start",        Event_RoundStart);
    HookEvent("round_end",          Event_RoundEnd);
    HookEvent("player_death",       Event_PlayerDeath);
    HookEvent("player_hurt",        Event_PlayerHurt);
    HookEvent("bomb_planted",       Event_BombPlanted);
    HookEvent("bomb_defused",       Event_BombDefused);
    HookEvent("cs_win_panel_match", Event_MatchEnd);

    PrintToServer("[SynapseCS] Plugin carregado v%s", PLUGIN_VERSION);
}

// ── Eventos de round ─────────────────────────────────────────────────────

public void Event_RoundStart(Event event, const char[] name, bool dontBroadcast)
{
    g_entryDone = false;

    for (int i = 1; i < MAX_PLAYERS; i++)
    {
        g_roundDmg  [i] = 0;
        g_roundKills[i] = 0;
    }
}

public void Event_RoundEnd(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_matchLive) return;

    g_totalRounds++;

    // Acumula dano do round nos stats totais
    for (int i = 1; i < MAX_PLAYERS; i++)
    {
        if (!IsValidClient(i)) continue;
        g_totalDmg[i] += g_roundDmg[i];
        g_roundsPlayed[i]++;

        // Multi-kills
        if (g_roundKills[i] == 2) g_k2[i]++;
        else if (g_roundKills[i] == 3) g_k3[i]++;
        else if (g_roundKills[i] == 4) g_k4[i]++;
        else if (g_roundKills[i] >= 5) { g_ace[i]++; }
    }

    SendRoundStats();
}

public void Event_MatchEnd(Event event, const char[] name, bool dontBroadcast)
{
    SendMatchStats();
    g_matchLive = false;
}

// ── Eventos de jogador ───────────────────────────────────────────────────

public void Event_PlayerDeath(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_matchLive) return;

    int attacker  = GetClientOfUserId(event.GetInt("attacker"));
    int victim    = GetClientOfUserId(event.GetInt("userid"));
    int assister  = GetClientOfUserId(event.GetInt("assister"));
    bool headshot = event.GetBool("headshot");

    if (IsValidClient(victim))
        g_deaths[victim]++;

    if (IsValidClient(attacker) && attacker != victim)
    {
        g_kills    [attacker]++;
        g_roundKills[attacker]++;
        if (headshot) g_headshots[attacker]++;

        if (!g_entryDone)
        {
            g_entryKills[attacker]++;
            g_entryDone = true;
        }
    }

    if (IsValidClient(assister))
        g_assists[assister]++;
}

public void Event_PlayerHurt(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_matchLive) return;

    int attacker = GetClientOfUserId(event.GetInt("attacker"));
    int dmg      = event.GetInt("dmg_health");

    if (IsValidClient(attacker))
        g_roundDmg[attacker] += dmg;
}

public void Event_BombPlanted(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_matchLive) return;
    int client = GetClientOfUserId(event.GetInt("userid"));
    if (IsValidClient(client)) g_bombPlants[client]++;
}

public void Event_BombDefused(Event event, const char[] name, bool dontBroadcast)
{
    if (!g_matchLive) return;
    int client = GetClientOfUserId(event.GetInt("userid"));
    if (IsValidClient(client)) g_bombDefuses[client]++;
}

// ── Ao conectar: salva SteamID e define time ─────────────────────────────

public void OnClientPutInServer(int client)
{
    if (!IsValidClient(client)) return;
    GetClientAuthId(client, AuthId_Steam2, g_steamId[client], sizeof(g_steamId[]));

    // Por enquanto atribui times alternadamente (o mix já vem com team_a/team_b do Supabase)
    // A edge function faz o mapeamento correto pelo SteamID
    g_team[client] = "?";

    if (!g_matchLive)
    {
        ResetPlayerStats(client);
        g_matchLive = true; // ativa ao primeiro jogador conectado
    }
}

public void OnClientDisconnect(int client)
{
    // mantém stats para o relatório final
}

// ── Helpers ──────────────────────────────────────────────────────────────

void ResetPlayerStats(int client)
{
    g_kills      [client] = 0;
    g_deaths     [client] = 0;
    g_assists    [client] = 0;
    g_headshots  [client] = 0;
    g_totalDmg   [client] = 0;
    g_roundDmg   [client] = 0;
    g_roundKills [client] = 0;
    g_entryKills [client] = 0;
    g_bombPlants [client] = 0;
    g_bombDefuses[client] = 0;
    g_ace        [client] = 0;
    g_k2         [client] = 0;
    g_k3         [client] = 0;
    g_k4         [client] = 0;
    g_clutchWins [client] = 0;
    g_roundsPlayed[client]= 0;
}

bool IsValidClient(int client)
{
    return (client > 0 && client < MAX_PLAYERS && IsClientInGame(client) && !IsFakeClient(client));
}

// ── Envio de dados ───────────────────────────────────────────────────────

void SendRoundStats()
{
    char apiUrl[256], apiSecret[128], mixId[64];
    g_cvApiUrl.GetString(apiUrl, sizeof(apiUrl));
    g_cvApiSecret.GetString(apiSecret, sizeof(apiSecret));
    g_cvMixId.GetString(mixId, sizeof(mixId));

    if (!g_cvEnabled.BoolValue || strlen(apiUrl) == 0 || strlen(mixId) == 0) return;

    // Constrói JSON com stats de todos os jogadores
    char playerStats[4096];
    playerStats[0] = '\0';
    bool first = true;

    for (int i = 1; i < MAX_PLAYERS; i++)
    {
        if (!IsValidClient(i) || strlen(g_steamId[i]) == 0) continue;

        char nick[64];
        GetClientName(i, nick, sizeof(nick));

        char entry[512];
        float adr = g_roundsPlayed[i] > 0 ? float(g_totalDmg[i]) / float(g_roundsPlayed[i]) : 0.0;
        float kdr = g_deaths[i] > 0 ? float(g_kills[i]) / float(g_deaths[i]) : float(g_kills[i]);
        float hsPct = g_kills[i] > 0 ? float(g_headshots[i]) / float(g_kills[i]) * 100.0 : 0.0;

        FormatEx(entry, sizeof(entry),
            "%s{\"steam_id\":\"%s\",\"nickname\":\"%s\",\"kills\":%d,\"deaths\":%d,\"assists\":%d,"
            "\"headshots\":%d,\"hs_pct\":%.2f,\"total_damage\":%d,\"adr\":%.2f,\"kdr\":%.2f,"
            "\"entry_kills\":%d,\"bomb_plants\":%d,\"bomb_defuses\":%d,"
            "\"ace\":%d,\"k2\":%d,\"k3\":%d,\"k4\":%d,\"clutch_wins\":%d,\"rounds_played\":%d}",
            first ? "" : ",",
            g_steamId[i], nick,
            g_kills[i], g_deaths[i], g_assists[i],
            g_headshots[i], hsPct, g_totalDmg[i], adr, kdr,
            g_entryKills[i], g_bombPlants[i], g_bombDefuses[i],
            g_ace[i], g_k2[i], g_k3[i], g_k4[i], g_clutchWins[i], g_roundsPlayed[i]
        );

        StrCat(playerStats, sizeof(playerStats), entry);
        first = false;
    }

    char body[8192];
    FormatEx(body, sizeof(body),
        "{\"event\":\"round_end\",\"mix_id\":\"%s\",\"round\":%d,\"players\":[%s]}",
        mixId, g_totalRounds, playerStats
    );

    char endpoint[384];
    FormatEx(endpoint, sizeof(endpoint), "%s/receive-match-stats", apiUrl);

    HTTPClient http = new HTTPClient(endpoint);
    http.SetHeader("Content-Type", "application/json");
    http.SetHeader("x-synapse-secret", apiSecret);
    http.Post("", body, OnHttpResponse);
}

void SendMatchStats()
{
    char apiUrl[256], apiSecret[128], mixId[64];
    g_cvApiUrl.GetString(apiUrl, sizeof(apiUrl));
    g_cvApiSecret.GetString(apiSecret, sizeof(apiSecret));
    g_cvMixId.GetString(mixId, sizeof(mixId));

    if (!g_cvEnabled.BoolValue || strlen(apiUrl) == 0 || strlen(mixId) == 0) return;

    char playerStats[4096];
    playerStats[0] = '\0';
    bool first = true;

    for (int i = 1; i < MAX_PLAYERS; i++)
    {
        if (strlen(g_steamId[i]) == 0) continue;

        char nick[64];
        GetClientName(i, nick, sizeof(nick));

        float adr   = g_roundsPlayed[i] > 0 ? float(g_totalDmg[i]) / float(g_roundsPlayed[i]) : 0.0;
        float kdr   = g_deaths[i] > 0 ? float(g_kills[i]) / float(g_deaths[i]) : float(g_kills[i]);
        float hsPct = g_kills[i] > 0 ? float(g_headshots[i]) / float(g_kills[i]) * 100.0 : 0.0;

        char entry[512];
        FormatEx(entry, sizeof(entry),
            "%s{\"steam_id\":\"%s\",\"nickname\":\"%s\",\"kills\":%d,\"deaths\":%d,\"assists\":%d,"
            "\"headshots\":%d,\"hs_pct\":%.2f,\"total_damage\":%d,\"adr\":%.2f,\"kdr\":%.2f,"
            "\"entry_kills\":%d,\"bomb_plants\":%d,\"bomb_defuses\":%d,"
            "\"ace\":%d,\"k2\":%d,\"k3\":%d,\"k4\":%d,\"clutch_wins\":%d,\"rounds_played\":%d}",
            first ? "" : ",",
            g_steamId[i], nick,
            g_kills[i], g_deaths[i], g_assists[i],
            g_headshots[i], hsPct, g_totalDmg[i], adr, kdr,
            g_entryKills[i], g_bombPlants[i], g_bombDefuses[i],
            g_ace[i], g_k2[i], g_k3[i], g_k4[i], g_clutchWins[i], g_roundsPlayed[i]
        );

        StrCat(playerStats, sizeof(playerStats), entry);
        first = false;
    }

    char body[8192];
    FormatEx(body, sizeof(body),
        "{\"event\":\"match_end\",\"mix_id\":\"%s\",\"total_rounds\":%d,\"players\":[%s]}",
        mixId, g_totalRounds, playerStats
    );

    char endpoint[384];
    FormatEx(endpoint, sizeof(endpoint), "%s/receive-match-stats", apiUrl);

    HTTPClient http = new HTTPClient(endpoint);
    http.SetHeader("Content-Type", "application/json");
    http.SetHeader("x-synapse-secret", apiSecret);
    http.Post("", body, OnHttpResponse);

    PrintToServer("[SynapseCS] Stats da partida enviados ao SynapseCS.");
}

public void OnHttpResponse(HTTPResponse response, any value, const char[] error)
{
    if (response.Status != HTTPStatus_OK)
    {
        PrintToServer("[SynapseCS] Erro ao enviar stats: HTTP %d — %s", response.Status, error);
    }
}
