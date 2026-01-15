import { useEffect, useState } from 'react';
import { AlertCircle, Save } from 'lucide-react';

export type StatRow = {
  nickname: string;
  kills: number;
  assists: number;
  deaths: number;
  adr: number;
  kdr: number;
};

type StatsReviewerProps = {
  extractedStats: StatRow[];
  onConfirm: (data: StatRow[]) => void;
};

const toNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const StatsReviewer = ({
  extractedStats,
  onConfirm,
}: StatsReviewerProps) => {
  const [stats, setStats] = useState<StatRow[]>(extractedStats);

  useEffect(() => {
    setStats(extractedStats);
  }, [extractedStats]);

  const handleChange = (
    index: number,
    field: keyof StatRow,
    value: string,
  ) => {
    setStats((current) => {
      const next = [...current];
      const row = { ...next[index] };
      if (field === 'nickname') {
        row.nickname = value;
      } else if (field === 'adr' || field === 'kdr') {
        row[field] = toNumber(value, 0);
      } else {
        row[field] = Math.max(0, Math.floor(toNumber(value, 0)));
      }
      next[index] = row;
      return next;
    });
  };

  return (
    <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 p-6">
        <div>
          <h2 className="text-xl font-black text-slate-900">
            Revisao de performance
          </h2>
          <p className="text-sm text-slate-500">
            Confirme os dados extraidos do print da GamersClub.
          </p>
        </div>
        <AlertCircle className="text-blue-500" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-100/50 text-[10px] uppercase tracking-[0.3em] text-slate-400">
              <th className="px-6 py-3">Jogador</th>
              <th className="px-6 py-3">K</th>
              <th className="px-6 py-3">A</th>
              <th className="px-6 py-3">D</th>
              <th className="px-6 py-3">ADR</th>
              <th className="px-6 py-3">KDR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {stats.map((row, index) => (
              <tr
                key={`${row.nickname}-${index}`}
                className="transition-colors hover:bg-blue-50/50"
              >
                <td className="px-4 py-2">
                  <input
                    className="w-full border-none bg-transparent font-bold text-slate-700 focus:ring-0"
                    value={row.nickname}
                    onChange={(event) =>
                      handleChange(index, 'nickname', event.target.value)
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    className="w-12 rounded border border-slate-200 bg-slate-50 p-1 text-center text-sm"
                    value={row.kills}
                    onChange={(event) =>
                      handleChange(index, 'kills', event.target.value)
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    className="w-12 rounded border border-slate-200 bg-slate-50 p-1 text-center text-sm"
                    value={row.assists}
                    onChange={(event) =>
                      handleChange(index, 'assists', event.target.value)
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    className="w-12 rounded border border-slate-200 bg-slate-50 p-1 text-center text-sm"
                    value={row.deaths}
                    onChange={(event) =>
                      handleChange(index, 'deaths', event.target.value)
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.1"
                    className="w-16 rounded border border-slate-200 bg-slate-50 p-1 text-center text-sm"
                    value={row.adr}
                    onChange={(event) =>
                      handleChange(index, 'adr', event.target.value)
                    }
                  />
                </td>
                <td className="px-4 py-2">
                  <input
                    type="number"
                    step="0.1"
                    className="w-16 rounded border border-slate-200 bg-slate-50 p-1 text-center text-sm"
                    value={row.kdr}
                    onChange={(event) =>
                      handleChange(index, 'kdr', event.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end border-t border-slate-100 bg-slate-50 p-6">
        <button
          type="button"
          onClick={() => onConfirm(stats)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-bold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95"
        >
          <Save size={18} /> Salvar resultados e atualizar ranking
        </button>
      </div>
    </div>
  );
};
