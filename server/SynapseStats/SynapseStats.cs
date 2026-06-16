using System.Net.Http;
using System.Text;
using System.Text.Json;
using CounterStrikeSharp.API;
using CounterStrikeSharp.API.Core;
using CounterStrikeSharp.API.Core.Attributes.Registration;
using CounterStrikeSharp.API.Modules.Commands;
using CounterStrikeSharp.API.Modules.Cvars;

namespace SynapseStats;

public class PluginConfig : BasePluginConfig
{
    public string ApiUrl    { get; set; } = "https://receivematchstats-bx52x5erya-uc.a.run.app";
    public string ApiSecret { get; set; } = "uGxmELAI3WYpX9tKiFVSaHMUhg7s5QbJ";
    public string MixId     { get; set; } = "";
    public bool   Enabled   { get; set; } = true;
}

public class PlayerStats
{
    public string SteamId     { get; set; } = "";
    public string Nickname    { get; set; } = "";
    public int    Kills       { get; set; }
    public int    Deaths      { get; set; }
    public int    Assists     { get; set; }
    public int    Headshots   { get; set; }
    public int    TotalDamage { get; set; }
    public int    EntryKills  { get; set; }
    public int    BombPlants  { get; set; }
    public int    BombDefuses { get; set; }
    public int    Ace         { get; set; }
    public int    K2          { get; set; }
    public int    K3          { get; set; }
    public int    K4          { get; set; }
    public int    ClutchWins  { get; set; }
    public int    RoundsPlayed{ get; set; }

    // Tracking por round (não enviado)
    public int    RoundKills  { get; set; }
    public int    RoundDamage { get; set; }
}

public class SynapseStatsPlugin : BasePlugin, IPluginConfig<PluginConfig>
{
    public override string ModuleName    => "SynapseStats";
    public override string ModuleVersion => "1.0.0";
    public override string ModuleAuthor  => "SynapseCS";

    public PluginConfig Config { get; set; } = new();

    private readonly Dictionary<ulong, PlayerStats> _stats = new();
    private readonly HttpClient _http = new();
    private bool   _entryDone;
    private int    _totalRounds;

    public void OnConfigParsed(PluginConfig config) => Config = config;

    public override void Load(bool hotReload)
    {
        RegisterEventHandler<EventPlayerDeath>(OnPlayerDeath);
        RegisterEventHandler<EventPlayerHurt>(OnPlayerHurt);
        RegisterEventHandler<EventBombPlanted>(OnBombPlanted);
        RegisterEventHandler<EventBombDefused>(OnBombDefused);
        RegisterEventHandler<EventRoundStart>(OnRoundStart);
        RegisterEventHandler<EventRoundEnd>(OnRoundEnd);
        RegisterEventHandler<EventCsWinPanelMatch>(OnMatchEnd);

        Console.WriteLine("[SynapseCS] Plugin carregado.");
    }

    // ── Round Start ──────────────────────────────────────────────────────────
    private HookResult OnRoundStart(EventRoundStart @event, GameEventInfo info)
    {
        _entryDone = false;
        foreach (var s in _stats.Values)
        {
            s.RoundKills  = 0;
            s.RoundDamage = 0;
        }
        return HookResult.Continue;
    }

    // ── Round End ────────────────────────────────────────────────────────────
    private HookResult OnRoundEnd(EventRoundEnd @event, GameEventInfo info)
    {
        if (!Config.Enabled) return HookResult.Continue;

        _totalRounds++;
        foreach (var s in _stats.Values)
        {
            s.TotalDamage  += s.RoundDamage;
            s.RoundsPlayed++;

            if      (s.RoundKills == 2) s.K2++;
            else if (s.RoundKills == 3) s.K3++;
            else if (s.RoundKills == 4) s.K4++;
            else if (s.RoundKills >= 5) s.Ace++;
        }

        _ = SendStats("round_end");
        return HookResult.Continue;
    }

    // ── Match End ────────────────────────────────────────────────────────────
    private HookResult OnMatchEnd(EventCsWinPanelMatch @event, GameEventInfo info)
    {
        if (!Config.Enabled) return HookResult.Continue;
        _ = SendStats("match_end");
        return HookResult.Continue;
    }

    // ── Player Death ─────────────────────────────────────────────────────────
    private HookResult OnPlayerDeath(EventPlayerDeath @event, GameEventInfo info)
    {
        if (!Config.Enabled) return HookResult.Continue;

        var victim   = @event.Userid;
        var attacker = @event.Attacker;
        var assister = @event.Assister;
        var headshot = @event.Headshot;

        if (victim?.IsValid == true)
            GetStats(victim).Deaths++;

        if (attacker?.IsValid == true && attacker != victim)
        {
            var s = GetStats(attacker);
            s.Kills++;
            s.RoundKills++;
            if (headshot) s.Headshots++;
            if (!_entryDone) { s.EntryKills++; _entryDone = true; }
        }

        if (assister?.IsValid == true)
            GetStats(assister).Assists++;

        return HookResult.Continue;
    }

    // ── Player Hurt ──────────────────────────────────────────────────────────
    private HookResult OnPlayerHurt(EventPlayerHurt @event, GameEventInfo info)
    {
        if (!Config.Enabled) return HookResult.Continue;

        var attacker = @event.Attacker;
        if (attacker?.IsValid == true)
            GetStats(attacker).RoundDamage += @event.DmgHealth;

        return HookResult.Continue;
    }

    // ── Bomb ─────────────────────────────────────────────────────────────────
    private HookResult OnBombPlanted(EventBombPlanted @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player?.IsValid == true) GetStats(player).BombPlants++;
        return HookResult.Continue;
    }

    private HookResult OnBombDefused(EventBombDefused @event, GameEventInfo info)
    {
        var player = @event.Userid;
        if (player?.IsValid == true) GetStats(player).BombDefuses++;
        return HookResult.Continue;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    private PlayerStats GetStats(CCSPlayerController player)
    {
        var steamId = player.SteamID;
        if (!_stats.TryGetValue(steamId, out var s))
        {
            s = new PlayerStats
            {
                SteamId  = steamId.ToString(),
                Nickname = player.PlayerName,
            };
            _stats[steamId] = s;
        }
        s.Nickname = player.PlayerName;
        return s;
    }

    // ── Envio de dados para Firebase ─────────────────────────────────────────
    private async Task SendStats(string eventType)
    {
        if (string.IsNullOrEmpty(Config.MixId) || string.IsNullOrEmpty(Config.ApiUrl))
        {
            Console.WriteLine("[SynapseCS] MixId ou ApiUrl não configurado. Configure em synapsestats.json");
            return;
        }

        var players = _stats.Values.Select(s =>
        {
            float adr    = s.RoundsPlayed > 0 ? (float)s.TotalDamage / s.RoundsPlayed : 0;
            float kdr    = s.Deaths > 0 ? (float)s.Kills / s.Deaths : s.Kills;
            float hsPct  = s.Kills > 0 ? (float)s.Headshots / s.Kills * 100 : 0;

            return new
            {
                steam_id      = s.SteamId,
                nickname      = s.Nickname,
                kills         = s.Kills,
                deaths        = s.Deaths,
                assists       = s.Assists,
                headshots     = s.Headshots,
                hs_pct        = Math.Round(hsPct, 2),
                total_damage  = s.TotalDamage,
                adr           = Math.Round(adr, 2),
                kdr           = Math.Round(kdr, 2),
                entry_kills   = s.EntryKills,
                bomb_plants   = s.BombPlants,
                bomb_defuses  = s.BombDefuses,
                ace           = s.Ace,
                k2            = s.K2,
                k3            = s.K3,
                k4            = s.K4,
                clutch_wins   = s.ClutchWins,
                rounds_played = s.RoundsPlayed,
            };
        }).ToList();

        var payload = JsonSerializer.Serialize(new
        {
            @event       = eventType,
            mix_id       = Config.MixId,
            round        = _totalRounds,
            total_rounds = _totalRounds,
            players,
        });

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, Config.ApiUrl)
            {
                Content = new StringContent(payload, Encoding.UTF8, "application/json"),
            };
            request.Headers.Add("x-synapse-secret", Config.ApiSecret);

            var response = await _http.SendAsync(request);
            Console.WriteLine($"[SynapseCS] {eventType} enviado → HTTP {(int)response.StatusCode}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SynapseCS] Erro ao enviar stats: {ex.Message}");
        }
    }

    // ── Comando: atualizar Mix ID via console ─────────────────────────────────
    [ConsoleCommand("synapse_mixid", "Define o Mix ID da partida atual")]
    public void OnSetMixId(CCSPlayerController? player, CommandInfo command)
    {
        if (command.ArgCount < 2) { command.ReplyToCommand("Uso: synapse_mixid <UUID>"); return; }
        Config.MixId = command.ArgByIndex(1);
        command.ReplyToCommand($"[SynapseCS] Mix ID definido: {Config.MixId}");
    }

    [ConsoleCommand("synapse_status", "Mostra status do plugin SynapseCS")]
    public void OnStatus(CCSPlayerController? player, CommandInfo command)
    {
        command.ReplyToCommand($"[SynapseCS] Enabled={Config.Enabled} | MixId={Config.MixId} | Rounds={_totalRounds} | Jogadores={_stats.Count}");
    }
}
