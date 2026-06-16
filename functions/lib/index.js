"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMixScore = exports.receiveMatchStats = exports.syncLevels = exports.faceitHistory = exports.faceitStats = exports.steamLogin = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const v2_1 = require("firebase-functions/v2");
const params_1 = require("firebase-functions/params");
admin.initializeApp();
const db = admin.firestore();
const STEAM_API_KEY = (0, params_1.defineSecret)("STEAM_API_KEY");
const SYNAPSE_SERVER_SECRET = (0, params_1.defineSecret)("SYNAPSE_SERVER_SECRET");
const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type, x-synapse-secret",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};
// ── Helpers ─────────────────────────────────────────────────────────────────
const toNumber = (v) => {
    if (typeof v === "number" && isFinite(v))
        return v;
    if (typeof v === "string") {
        const n = Number(v.replace("%", "").replace(",", ".").trim());
        return isFinite(n) ? n : null;
    }
    return null;
};
// ── Steam Login ──────────────────────────────────────────────────────────────
// Valida o callback OpenID da Steam e cria um Custom Auth Token do Firebase.
exports.steamLogin = v2_1.https.onRequest({ secrets: [STEAM_API_KEY] }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set(cors).status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.set(cors).status(405).json({ error: "Method not allowed" });
        return;
    }
    const { openidParams } = req.body;
    if (!openidParams) {
        res.set(cors).status(400).json({ error: "openidParams ausente." });
        return;
    }
    const params = new URLSearchParams({
        ...openidParams,
        "openid.mode": "check_authentication",
    });
    const steamValidation = await fetch("https://steamcommunity.com/openid/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });
    const text = await steamValidation.text();
    if (!text.includes("is_valid:true")) {
        res.set(cors).status(401).json({ error: "Steam OpenID inválido." });
        return;
    }
    const claimedId = openidParams["openid.claimed_id"] ?? "";
    const steamId = claimedId.replace(/^.*\//, "");
    if (!steamId) {
        res.set(cors).status(400).json({ error: "SteamID não encontrado." });
        return;
    }
    const apiKey = STEAM_API_KEY.value();
    let nickname = steamId;
    let avatarUrl = "";
    if (apiKey) {
        try {
            const profileRes = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`);
            const profile = await profileRes.json();
            const player = profile.response?.players?.[0];
            if (player) {
                nickname = player.personaname;
                avatarUrl = player.avatarfull;
            }
        }
        catch { /* continua sem avatar */ }
    }
    // Upsert no Firestore
    await db.collection("players").doc(steamId).set({ nickname, steam_id: steamId, avatar_url: avatarUrl, updated_at: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    if (!db.collection("players").doc(steamId)) {
        await db.collection("players").doc(steamId).set({
            nickname, steam_id: steamId, avatar_url: avatarUrl,
            faceit_level: 0, gc_level: 0, elo_interno: 1000,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    // Custom Auth Token com claim steam_id
    const token = await admin.auth().createCustomToken(steamId, { steam_id: steamId });
    res.set(cors).json({ token, steamId, nickname, avatarUrl });
});
// ── Faceit Stats ─────────────────────────────────────────────────────────────
exports.faceitStats = v2_1.https.onRequest(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set(cors).status(204).send("");
        return;
    }
    const { nickname } = req.body;
    if (!nickname) {
        res.set(cors).status(400).json({ error: "Informe o nickname Faceit." });
        return;
    }
    const apiKey = functions.config().faceit?.api_key ?? process.env.FACEIT_API_KEY ?? "";
    if (!apiKey) {
        res.set(cors).status(500).json({ error: "FACEIT_API_KEY não configurada." });
        return;
    }
    const clean = nickname.trim().replace(/.*faceit\.com\/(?:[a-z-]+\/)?players\/([^/?#]+).*/i, "$1");
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(clean)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!playerRes.ok) {
        res.set(cors).status(502).json({ error: "Jogador Faceit não encontrado." });
        return;
    }
    const playerData = await playerRes.json();
    let gameId = "cs2";
    let statsRes = await fetch(`https://open.faceit.com/data/v4/players/${playerData.player_id}/stats/${gameId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!statsRes.ok) {
        gameId = "csgo";
        statsRes = await fetch(`https://open.faceit.com/data/v4/players/${playerData.player_id}/stats/${gameId}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    }
    if (!statsRes.ok) {
        res.set(cors).status(502).json({ error: "Stats Faceit indisponíveis." });
        return;
    }
    const statsData = await statsRes.json();
    const lifetime = statsData.lifetime ?? {};
    const gameInfo = playerData.games?.[gameId];
    const maps = (statsData.segments ?? [])
        .filter((s) => s.type === "Map")
        .map((s) => ({
        name: s.label,
        matches: toNumber(s.stats["Matches"]),
        kd: toNumber(s.stats["Average K/D Ratio"] ?? s.stats["K/D Ratio"]),
        hsPercent: toNumber(s.stats["Average Headshots %"] ?? s.stats["Headshots %"]),
        winRate: toNumber(s.stats["Win Rate %"]),
    }))
        .sort((a, b) => (b.matches ?? 0) - (a.matches ?? 0))
        .slice(0, 5);
    res.set(cors).json({
        nickname: playerData.nickname,
        game: gameId,
        stats: {
            elo: toNumber(gameInfo?.faceit_elo),
            level: toNumber(gameInfo?.skill_level),
            matches: toNumber(lifetime["Matches"]),
            wins: toNumber(lifetime["Wins"]),
            winRate: toNumber(lifetime["Win Rate %"]),
            kd: toNumber(lifetime["Average K/D Ratio"] ?? lifetime["K/D Ratio"]),
            adr: toNumber(lifetime["Average ADR"] ?? lifetime["ADR"]),
            hsPercent: toNumber(lifetime["Average Headshots %"] ?? lifetime["Headshots %"]),
        },
        maps,
    });
});
// ── Faceit History ────────────────────────────────────────────────────────────
exports.faceitHistory = v2_1.https.onRequest(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set(cors).status(204).send("");
        return;
    }
    const { playerId, game = "cs2", limit = 20 } = req.body;
    if (!playerId) {
        res.set(cors).status(400).json({ error: "playerId ausente." });
        return;
    }
    const apiKey = functions.config().faceit?.api_key ?? process.env.FACEIT_API_KEY ?? "";
    const histRes = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/history?game=${game}&limit=${limit}`, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!histRes.ok) {
        res.set(cors).status(502).json({ error: "Histórico indisponível." });
        return;
    }
    const data = await histRes.json();
    res.set(cors).json(data);
});
// ── Sync Levels (Faceit → Firestore) ─────────────────────────────────────────
exports.syncLevels = v2_1.https.onRequest(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set(cors).status(204).send("");
        return;
    }
    const { steamId, nickname } = req.body;
    if (!steamId || !nickname) {
        res.set(cors).status(400).json({ error: "steamId e nickname são obrigatórios." });
        return;
    }
    const apiKey = functions.config().faceit?.api_key ?? process.env.FACEIT_API_KEY ?? "";
    const playerRes = await fetch(`https://open.faceit.com/data/v4/players?nickname=${encodeURIComponent(nickname)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!playerRes.ok) {
        res.set(cors).status(200).json({ warning: "Jogador não encontrado no Faceit.", synced: false });
        return;
    }
    const playerData = await playerRes.json();
    const cs2 = playerData.games?.cs2 ?? playerData.games?.csgo;
    const level = cs2?.skill_level ?? 0;
    const elo = cs2?.faceit_elo ?? 0;
    await db.collection("players").doc(steamId).set({ faceit_level: level, faceit_elo: elo, faceit_nickname: nickname }, { merge: true });
    res.set(cors).json({ synced: true, level, elo });
});
// ── Receive Match Stats (SourceMod plugin → Firestore) ───────────────────────
// Recebe dados do plugin SynapseStats.smx via POST e salva no Firestore em
// tempo real. O frontend React escuta via onSnapshot().
exports.receiveMatchStats = v2_1.https.onRequest({ secrets: [SYNAPSE_SERVER_SECRET] }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set(cors).status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.set(cors).status(405).send("");
        return;
    }
    const secret = SYNAPSE_SERVER_SECRET.value();
    const incomingSecret = req.headers["x-synapse-secret"];
    if (secret && incomingSecret !== secret) {
        res.set(cors).status(401).json({ error: "Token inválido." });
        return;
    }
    const body = req.body;
    if (!body.mix_id || !Array.isArray(body.players)) {
        res.set(cors).status(400).json({ error: "Payload inválido." });
        return;
    }
    const mixRef = db.collection("mixes").doc(body.mix_id);
    const mixSnap = await mixRef.get();
    if (!mixSnap.exists) {
        res.set(cors).status(404).json({ error: "Mix não encontrado." });
        return;
    }
    const mixData = mixSnap.data() ?? {};
    const teamA = mixData.team_a ?? [];
    const teamB = mixData.team_b ?? [];
    // Calcula MVP: kills*1 + assists*0.5 + adr*0.02 - deaths*0.3
    let mvpScore = -Infinity;
    let mvpId = "";
    const batch = db.batch();
    for (const p of body.players) {
        const team = teamA.includes(p.steam_id) ? "A" : teamB.includes(p.steam_id) ? "B" : "?";
        const score = p.kills * 1 + p.assists * 0.5 + p.adr * 0.02 - p.deaths * 0.3;
        if (score > mvpScore) {
            mvpScore = score;
            mvpId = p.steam_id;
        }
        const statRef = mixRef.collection("stats").doc(p.steam_id);
        batch.set(statRef, {
            ...p,
            team,
            is_mvp: false,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: false });
    }
    // Marca MVP
    if (mvpId) {
        batch.update(mixRef.collection("stats").doc(mvpId), { is_mvp: true });
    }
    if (body.event === "match_end") {
        batch.update(mixRef, {
            status: "finished",
            total_rounds: body.total_rounds ?? 0,
            ended_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Atualiza elo_interno dos jogadores vencedores (+25)
        // O time com mais rounds ganhos é determinado pelo score_a / score_b
        const mixFinal = mixSnap.data() ?? {};
        const scoreA = mixFinal.score_a ?? 0;
        const scoreB = mixFinal.score_b ?? 0;
        const winners = scoreA > scoreB ? teamA : teamB;
        for (const steamId of winners) {
            batch.update(db.collection("players").doc(steamId), {
                elo_interno: admin.firestore.FieldValue.increment(25),
            });
        }
    }
    await batch.commit();
    res.set(cors).json({ ok: true, event: body.event, players: body.players.length });
});
// ── Update Mix Score (chamado manualmente ou via plugin) ─────────────────────
exports.updateMixScore = v2_1.https.onRequest(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set(cors).status(204).send("");
        return;
    }
    const { mix_id, score_a, score_b } = req.body;
    if (!mix_id) {
        res.set(cors).status(400).json({ error: "mix_id ausente." });
        return;
    }
    await db.collection("mixes").doc(mix_id).update({
        score_a: score_a ?? 0,
        score_b: score_b ?? 0,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.set(cors).json({ ok: true });
});
// rebuildLeaderboard: o frontend lê diretamente de /players com fallback.
// Para ativar o agendamento, use onSchedule("every 60 minutes", ...) após
// deletar manualmente a versão Gen1 no Console do Firebase.
//# sourceMappingURL=index.js.map