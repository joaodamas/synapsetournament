import type { ReactNode } from 'react';
import { Activity, Target, TrendingUp } from 'lucide-react';

import { MatchHistory } from '../components/MatchHistory';

type AdvancedStatsProps = {
  playerId: string;
};

type StatCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  color: string;
};

const StatCard = ({ label, value, icon, color }: StatCardProps) => (
  <div className="rounded-[2.5rem] border border-slate-100 bg-white p-6 text-center shadow-sm">
    <div className={`${color} mb-3 flex items-center justify-center`}>
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
      {label}
    </p>
    <p className={`text-2xl font-black ${color}`}>{value}</p>
  </div>
);

export const AdvancedStats = ({ playerId }: AdvancedStatsProps) => {
  return (
    <div className="space-y-10">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">
          Estatisticas
        </p>
        <h1 className="mt-4 text-3xl font-black text-slate-900">
          Analise detalhada do jogador
        </h1>
        <p className="mt-3 text-slate-500">
          Veja performance, consistencia e historico completo.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          label="K/D ratio"
          value="--"
          icon={<Activity />}
          color="text-emerald-500"
        />
        <StatCard
          label="Media ADR"
          value="--"
          icon={<Target />}
          color="text-blue-500"
        />
        <StatCard
          label="Winrate"
          value="--"
          icon={<TrendingUp />}
          color="text-indigo-500"
        />
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">
          Historico de mixes
        </h2>
        <MatchHistory playerId={playerId} embedded />
      </section>
    </div>
  );
};
