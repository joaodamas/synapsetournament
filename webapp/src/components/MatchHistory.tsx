import { useEffect, useState } from "react";
import { Award, Calendar, Map as MapIcon } from "lucide-react";

import {
  db, hasFirebaseConfig,
  collection, query, where, orderBy, limit,
  getDocs, doc, getDoc,
} from "../lib/firebase";
import type { Timestamp } from "firebase/firestore";

type MatchStatRow = {
  player_id: string;
  nickname:  string;
  kills:     number;
  assists:   number;
  deaths:    number;
  adr:       number;
  kdr:       number;
  is_mvp:    boolean;
};

type MatchRowData = {
  id:         string;
  created_at: string;
  status?:    string;
  final_map:  string | null;
  score_a:    number | null;
  score_b:    number | null;
  stats?:     MatchStatRow[];
};

const formatMapName = (mapId: string | null) =>
  mapId ? mapId.replace(/^de_/, "").toUpperCase() : "TBD";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

type MatchHistoryProps = { playerId?: string; embedded?: boolean };

export const MatchHistory = ({ playerId, embedded = false }: MatchHistoryProps) => {
  const [matches, setMatches] = useState<MatchRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    const fetchMatches = async () => {
      if (!hasFirebaseConfig || !db) { setError("Firebase não configurado."); setLoading(false); return; }

      try {
        let mixIds: string[] = [];

        if (playerId) {
          // Busca mixes em que o jogador participou
          const participantSnaps = await getDocs(
            query(
              collection(db, "mixes"),
              where("team_a", "array-contains", playerId),
              orderBy("created_at", "desc"),
              limit(20)
            )
          );
          const participantSnapsB = await getDocs(
            query(
              collection(db, "mixes"),
              where("team_b", "array-contains", playerId),
              orderBy("created_at", "desc"),
              limit(20)
            )
          );
          mixIds = [
            ...participantSnaps.docs.map((d) => d.id),
            ...participantSnapsB.docs.map((d) => d.id),
          ].slice(0, 20);
        } else {
          // Últimos mixes finalizados
          const snap = await getDocs(
            query(collection(db, "mixes"), where("status", "==", "finished"), orderBy("created_at", "desc"), limit(20))
          );
          mixIds = snap.docs.map((d) => d.id);
        }

        const rows: MatchRowData[] = [];
        for (const mixId of mixIds) {
          const mixSnap = await getDoc(doc(db, "mixes", mixId));
          if (!mixSnap.exists()) continue;

          const data    = mixSnap.data();
          const ts      = data.created_at as Timestamp | null;
          const dateStr = ts ? new Date(ts.seconds * 1000).toISOString() : "";

          // Carrega stats da subcoleção
          const statsSnap = await getDocs(collection(db, "mixes", mixId, "stats"));
          const stats: MatchStatRow[] = statsSnap.docs.map((d) => ({
            player_id: d.id,
            ...d.data() as Omit<MatchStatRow, "player_id">,
          }));

          rows.push({
            id:         mixId,
            created_at: dateStr,
            status:     data.status  as string,
            final_map:  (data.final_map  as string | null) ?? null,
            score_a:    (data.score_a    as number | null) ?? null,
            score_b:    (data.score_b    as number | null) ?? null,
            stats,
          });
        }

        setMatches(rows);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erro ao carregar partidas.");
      } finally {
        setLoading(false);
      }
    };

    void fetchMatches();
  }, [playerId]);

  const content = (
    <div className={`flex flex-col gap-6 ${!embedded ? "mx-auto max-w-4xl px-6 py-12" : ""}`}>
      {!embedded && (
        <header>
          <h1 className="text-3xl font-black italic text-slate-100">Histórico de partidas</h1>
          <p className="mt-2 text-sm text-slate-400">Últimas partidas registradas no SynapseCS.</p>
        </header>
      )}

      {error && (
        <div className="rounded-sm border border-[#ff3e3e]/40 bg-[#ff3e3e]/10 px-6 py-4 text-sm text-[#ff8a8a]">{error}</div>
      )}

      {loading ? (
        <div className="rounded-sm border border-white/10 bg-[#0f1115] px-6 py-10 text-center text-sm text-slate-400">Carregando partidas...</div>
      ) : matches.length === 0 ? (
        <div className="rounded-sm border border-white/10 bg-[#0f1115] px-6 py-10 text-center text-sm text-slate-400">Nenhuma partida registrada ainda.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map((match) => {
            const mvp = match.stats?.find((s) => s.is_mvp);
            return (
              <div key={match.id} className="rounded-sm border border-white/10 bg-[#0f1115] p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-white/10 bg-[#0b0f14]">
                      <MapIcon size={20} className="text-[#00f2ff]" />
                    </div>
                    <div>
                      <p className="font-black text-slate-100">{formatMapName(match.final_map)}</p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={10} />
                        {match.created_at ? formatDate(match.created_at) : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {match.score_a !== null && match.score_b !== null && (
                      <div className="rounded-sm border border-white/10 bg-[#0b0f14] px-6 py-2 text-center">
                        <p className="text-2xl font-black tabular-nums text-slate-100">
                          {match.score_a} — {match.score_b}
                        </p>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-slate-500">Placar</p>
                      </div>
                    )}
                    {mvp && (
                      <div className="flex items-center gap-2 rounded-sm border border-[#00f2ff]/30 bg-[#00f2ff]/10 px-3 py-2">
                        <Award size={14} className="text-[#00f2ff]" />
                        <div>
                          <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-slate-500">MVP</p>
                          <p className="text-sm font-bold text-slate-100">{mvp.nickname}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {match.stats && match.stats.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
                          <th className="py-1 pr-3 text-left">Jogador</th>
                          <th className="px-2 py-1">K</th>
                          <th className="px-2 py-1">D</th>
                          <th className="px-2 py-1">A</th>
                          <th className="px-2 py-1">ADR</th>
                          <th className="px-2 py-1">KDR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {match.stats.map((s) => (
                          <tr key={s.player_id} className={`border-t border-white/5 ${s.is_mvp ? "bg-[#00f2ff]/5" : ""}`}>
                            <td className="py-1 pr-3 text-left">
                              <span className="font-semibold text-slate-200">{s.nickname}</span>
                              {s.is_mvp && <span className="ml-2 rounded-sm bg-[#00f2ff]/20 px-1 text-[8px] font-black uppercase text-[#00f2ff]">MVP</span>}
                            </td>
                            <td className="px-2 py-1 font-bold text-slate-100">{s.kills}</td>
                            <td className="px-2 py-1 text-slate-400">{s.deaths}</td>
                            <td className="px-2 py-1 text-slate-400">{s.assists}</td>
                            <td className="px-2 py-1 text-slate-300">{Number(s.adr).toFixed(0)}</td>
                            <td className={`px-2 py-1 font-semibold ${s.kdr >= 1 ? "text-green-400" : "text-red-400"}`}>{Number(s.kdr).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (embedded) return content;
  return <div className="page-shell">{content}</div>;
};
