import { useEffect, useState } from "react";
import { Crosshair, Swords, Shield, Bomb, Trophy } from "lucide-react";

import { db, hasFirebaseConfig, collection, query, onSnapshot, orderBy } from "../lib/firebase";

type PlayerStat = {
  steam_id:     string;
  nickname:     string;
  kills:        number;
  deaths:       number;
  assists:      number;
  headshots:    number;
  hs_pct:       number;
  adr:          number;
  kdr:          number;
  entry_kills:  number;
  bomb_plants:  number;
  bomb_defuses: number;
  ace:          number;
  k2:           number;
  k3:           number;
  k4:           number;
  clutch_wins:  number;
  rounds_played:number;
  is_mvp:       boolean;
  team:         "A" | "B" | "?";
};

type LiveScoreboardProps = {
  mixId: string;
  scoreA?: number;
  scoreB?: number;
  map?: string | null;
};

export const LiveScoreboard = ({ mixId, scoreA = 0, scoreB = 0, map }: LiveScoreboardProps) => {
  const [stats, setStats] = useState<PlayerStat[]>([]);

  useEffect(() => {
    if (!hasFirebaseConfig || !db || !mixId) return;

    const statsRef = collection(db, "mixes", mixId, "stats");
    const q = query(statsRef, orderBy("kills", "desc"));

    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ steam_id: d.id, ...d.data() } as PlayerStat));
      setStats(rows);
    });

    return () => unsub();
  }, [mixId]);

  const teamA = stats.filter((p) => p.team === "A");
  const teamB = stats.filter((p) => p.team === "B");

  if (stats.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-white/5 bg-[#0f1115] p-4">
      {/* Header: placar */}
      <div className="flex items-center justify-between rounded-sm border border-white/10 bg-[#0b0e12] px-6 py-4">
        <div className="text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#00f2ff]">Time A</p>
          <p className="mt-1 text-5xl font-black tabular-nums text-slate-100">{scoreA}</p>
        </div>
        <div className="text-center">
          {map && (
            <p className="text-xs font-semibold uppercase text-slate-400">
              {map.replace("de_", "")}
            </p>
          )}
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
            AO VIVO
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-slate-400">Time B</p>
          <p className="mt-1 text-5xl font-black tabular-nums text-slate-100">{scoreB}</p>
        </div>
      </div>

      {/* Tabela por time */}
      {([teamA, teamB] as const).map((team, teamIdx) => (
        <div key={teamIdx}>
          <p className={`mb-2 text-[10px] font-mono uppercase tracking-[0.3em] ${teamIdx === 0 ? "text-[#00f2ff]" : "text-slate-400"}`}>
            Time {teamIdx === 0 ? "A" : "B"}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-[11px]">
              <thead>
                <tr className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                  <th className="py-1 pr-3 text-left font-mono">Jogador</th>
                  <th className="px-2 py-1">K</th>
                  <th className="px-2 py-1">D</th>
                  <th className="px-2 py-1">A</th>
                  <th className="px-2 py-1">HS%</th>
                  <th className="px-2 py-1">ADR</th>
                  <th className="px-2 py-1">KDR</th>
                  <th className="px-2 py-1 text-[#7ff7ff]"><Crosshair size={10} className="inline" /> ENTRY</th>
                  <th className="px-2 py-1"><Bomb size={10} className="inline" /> C4</th>
                  <th className="px-2 py-1"><Trophy size={10} className="inline" /> ACE</th>
                </tr>
              </thead>
              <tbody>
                {team.map((p) => (
                  <tr
                    key={p.steam_id}
                    className={`border-t border-white/5 transition hover:bg-white/5 ${
                      p.is_mvp ? "bg-[#00f2ff]/5" : ""
                    }`}
                  >
                    <td className="py-2 pr-3 text-left">
                      <div className="flex items-center gap-2">
                        {p.is_mvp && (
                          <span className="rounded-sm bg-[#00f2ff]/20 px-1 text-[8px] font-black uppercase text-[#00f2ff]">
                            MVP
                          </span>
                        )}
                        <span className="font-semibold text-slate-100">{p.nickname}</span>
                      </div>
                    </td>
                    <td className="px-2 py-2 font-bold text-slate-100">{p.kills}</td>
                    <td className="px-2 py-2 text-slate-400">{p.deaths}</td>
                    <td className="px-2 py-2 text-slate-400">{p.assists}</td>
                    <td className="px-2 py-2 text-yellow-400">{p.hs_pct.toFixed(0)}%</td>
                    <td className="px-2 py-2 text-slate-300">{p.adr.toFixed(0)}</td>
                    <td className={`px-2 py-2 font-semibold ${p.kdr >= 1 ? "text-green-400" : "text-red-400"}`}>
                      {p.kdr.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-[#7ff7ff]">{p.entry_kills}</td>
                    <td className="px-2 py-2 text-orange-400">{p.bomb_plants}/{p.bomb_defuses}</td>
                    <td className="px-2 py-2 font-black text-[#00f2ff]">{p.ace || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Multi-kills footer */}
      {stats.some((p) => p.k2 + p.k3 + p.k4 + p.ace > 0) && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-4 sm:grid-cols-4">
          {stats
            .filter((p) => p.k2 + p.k3 + p.k4 + p.ace > 0)
            .map((p) => (
              <div key={p.steam_id} className="rounded-sm border border-white/10 bg-[#0b0e12] px-3 py-2">
                <p className="text-[10px] font-semibold text-slate-300">{p.nickname}</p>
                <div className="mt-1 flex gap-2 text-[9px] font-mono">
                  {p.k2 > 0 && <span className="text-slate-400">2K:{p.k2}</span>}
                  {p.k3 > 0 && <span className="text-yellow-400">3K:{p.k3}</span>}
                  {p.k4 > 0 && <span className="text-orange-400">4K:{p.k4}</span>}
                  {p.ace > 0 && <span className="font-black text-[#00f2ff]">ACE:{p.ace}</span>}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};
