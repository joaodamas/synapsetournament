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
      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">
              Command center
            </p>
            <h1 className="mt-4 text-3xl font-black text-slate-900">
              Visao geral do Synapse
            </h1>
            <p className="mt-3 text-slate-500">
              Controle mixes, ranking e torneios sem perder o ritmo.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.assign('/mix')}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              Abrir lobby
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/leaderboard')}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.3em] text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
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
            className="flex items-center gap-4 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
          >
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
              {stat.icon}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                {stat.label}
              </p>
              <p className="text-2xl font-black text-slate-900">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Proximo destaque
          </h2>
          <p className="mt-4 text-2xl font-black text-slate-900">
            Ranking em alta na Ancient
          </p>
          <p className="mt-3 text-slate-500">
            Ajuste o veto e inicie um mix rapido para aproveitar o pool
            competitivo.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Ancient
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Balanceado
            </span>
          </div>
        </div>

        <div className="rounded-[2.5rem] border border-blue-100 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl">
          <div className="flex items-center gap-3 text-blue-100">
            <Shield size={20} />
            <p className="text-xs font-black uppercase tracking-[0.3em]">
              Protecao
            </p>
          </div>
          <h3 className="mt-4 text-2xl font-black">
            Matchmaking seguro
          </h3>
          <p className="mt-3 text-blue-100">
            Logs de partida e verificacoes garantem a integridade do lobby.
          </p>
        </div>
      </section>
    </div>
  );
};
