import { CalendarCheck, Flag, PlusCircle } from 'lucide-react';

export const TournamentsPage = () => {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">
            Torneios
          </p>
          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Central de campeonatos
          </h1>
          <p className="mt-3 text-slate-500">
            Crie brackets, acompanhe resultados e publique premios.
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
        >
          <PlusCircle size={18} />
          Novo torneio
        </button>
      </header>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600">
            <CalendarCheck size={20} />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
              Agenda
            </h2>
          </div>
          <p className="mt-4 text-2xl font-black text-slate-900">
            Sem eventos hoje
          </p>
          <p className="mt-3 text-slate-500">
            Prepare o proximo campeonato e abra inscricoes.
          </p>
        </div>

        <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600">
            <Flag size={20} />
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
              Status geral
            </h2>
          </div>
          <p className="mt-4 text-2xl font-black text-slate-900">
            Nenhum torneio ativo
          </p>
          <p className="mt-3 text-slate-500">
            Assim que criar um bracket, ele aparece aqui.
          </p>
        </div>
      </section>
    </div>
  );
};
