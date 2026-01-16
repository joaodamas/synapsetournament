import { Calendar, Shield, Swords, Trophy, Users } from 'lucide-react';

const quickStats = [
  { label: 'Mixes ativos', value: '3', icon: <Swords size={20} /> },
  { label: 'Jogadores online', value: '128', icon: <Users size={20} /> },
  { label: 'Partidas hoje', value: '24', icon: <Calendar size={20} /> },
  { label: 'Top elo', value: '2150', icon: <Trophy size={20} /> },
];

export const DashboardOverview = () => {
  return (
    <div className="space-y-10">
      <section className="rounded-sm border border-white/5 bg-[#0f1115] p-8">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#00f2ff]">
              Command center
            </p>
            <h1 className="mt-4 text-3xl font-black text-slate-100">
              Visao geral do Synapse
            </h1>
            <p className="mt-3 text-slate-400">
              Controle mixes, ranking e torneios sem perder o ritmo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.assign('/mix')}
              className="rounded-sm border border-[#00f2ff]/40 bg-[#00f2ff] px-5 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#050505] transition hover:-translate-y-0.5"
            >
              Abrir lobby
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/leaderboard')}
              className="rounded-sm border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 transition hover:border-[#00f2ff]/40 hover:text-[#00f2ff]"
            >
              Ver ranking
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-sm border border-white/10 bg-[#0f1115] p-6"
          >
            <div className="rounded-sm border border-white/10 bg-white/5 p-3 text-[#00f2ff]">
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-slate-100">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-sm border border-white/5 bg-[#0f1115] p-8 lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-500">
            Proximo destaque
          </h2>
          <p className="mt-4 text-2xl font-black text-slate-100">
            Ranking em alta na Ancient
          </p>
          <p className="mt-3 text-slate-400">
            Ajuste o veto e inicie um mix rapido para aproveitar o pool
            competitivo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
              Ancient
            </span>
            <span className="rounded-sm border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
              Balanceado
            </span>
          </div>
        </div>

        <div className="rounded-sm border border-[#00f2ff]/30 bg-[#0b0f14] p-8 text-slate-100">
          <div className="flex items-center gap-3 text-[#7ff7ff]">
            <Shield size={20} />
            <p className="text-xs font-black uppercase tracking-[0.3em]">
              Protecao
            </p>
          </div>
          <h3 className="mt-4 text-2xl font-black">
            Matchmaking seguro
          </h3>
          <p className="mt-3 text-slate-400">
            Logs de partida e verificacoes garantem a integridade do lobby.
          </p>
        </div>
      </section>
    </div>
  );
};
