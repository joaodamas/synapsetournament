import { useState } from 'react';
import { CalendarCheck, Flag, PlusCircle, X } from 'lucide-react';

export const TournamentsPage = () => {
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);

  const formatOptions = [
    {
      id: 'single_elimination',
      title: 'Eliminatoria simples',
      subtitle: 'Single Elimination (mata-mata)',
      description: 'Perdeu uma serie, esta fora.',
      pros: 'Rapido, simples, facil de organizar.',
      cons: 'Uma zebra elimina time forte; menos jogos garantidos.',
      bestFor: 'Campeonatos curtos, LAN pequena, qualificatorias rapidas.',
      minTeams: 'Minimo recomendado: 8 times.',
      series: 'Sugestao: BO3.',
    },
    {
      id: 'double_elimination',
      title: 'Eliminatoria dupla',
      subtitle: 'Double Elimination',
      description:
        'Chave upper (invictos) e lower (repescagem). Caiu uma vez, ainda pode voltar.',
      pros: 'Mais justo; reduz eliminacao por “dia ruim”.',
      cons: 'Mais jogos e mais tempo; precisa explicar bem.',
      bestFor: 'Torneios medios/grandes, campeonatos com premiacao.',
      minTeams: 'Minimo recomendado: 8 times.',
      series: 'Sugestao: BO3.',
    },
    {
      id: 'round_robin_single',
      title: 'Round-robin simples',
      subtitle: 'Todos contra todos (1 turno)',
      description: 'Todos jogam contra todos uma vez; ranking por pontos.',
      pros: 'Bem justo; amostra grande de jogos.',
      cons: 'Pode ficar longo.',
      bestFor: 'Ligas, grupos pequenos (4–8 times).',
      minTeams: 'Minimo recomendado: 4 times (ideal 4–8).',
      series: 'Sugestao: BO1 ou BO3.',
    },
    {
      id: 'round_robin_double',
      title: 'Round-robin duplo',
      subtitle: 'Todos contra todos (ida e volta)',
      description: 'Todos se enfrentam duas vezes.',
      pros: 'Ainda mais justo.',
      cons: 'Demora bastante.',
      bestFor: 'Liga fixa/season quando o calendario permite.',
      minTeams: 'Minimo recomendado: 4 times (ideal 4–6).',
      series: 'Sugestao: BO1.',
    },
    {
      id: 'swiss',
      title: 'Sistema Suico',
      subtitle: 'Swiss',
      description:
        'Times jogam rodadas contra adversarios com campanha parecida.',
      pros: 'Eficiente com muitos times; competitivo.',
      cons: 'Desempates e seeding precisam ser bem definidos.',
      bestFor: 'Qualificatorias e fases iniciais com muitos times.',
      minTeams: 'Minimo recomendado: 8 times (ideal 16+).',
      series: 'Sugestao: BO1 nas primeiras rodadas.',
    },
    {
      id: 'gsl',
      title: 'Grupo GSL',
      subtitle: 'Double-elim dentro do grupo',
      description:
        'Grupo de 4 com winners/losers/decider, garantindo pelo menos 2 jogos.',
      pros: 'Rapido e relativamente justo.',
      cons: 'Menos amostra que round-robin.',
      bestFor: 'Grupos de 4, agenda apertada.',
      minTeams: 'Minimo recomendado: 4 times.',
      series: 'Sugestao: BO1 ou BO3.',
    },
    {
      id: 'league_playoffs',
      title: 'Liga + playoffs',
      subtitle: 'Pontos corridos + mata-mata',
      description:
        'Fase de liga (round-robin ou swiss) e depois playoffs.',
      pros: 'Combina justica (liga) com emocao (playoffs).',
      cons: 'Mais complexo e mais longo.',
      bestFor: 'Campeonatos completos estilo temporada.',
      minTeams: 'Minimo recomendado: 8 times.',
      series: 'Sugestao: BO3 nos playoffs.',
    },
    {
      id: 'lcq',
      title: 'Repescagem / LCQ',
      subtitle: 'Last Chance Qualifier',
      description:
        'Eliminados proximos ganham uma ultima chave por vagas.',
      pros: 'Reduz injustica; aumenta hype.',
      cons: 'Mais tempo e organizacao.',
      bestFor: 'Quando as vagas sao poucas e valiosas.',
      minTeams: 'Minimo recomendado: 8 times.',
      series: 'Sugestao: BO3.',
    },
  ];

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
          onClick={() => setShowFormatModal(true)}
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

      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                  Novo torneio
                </p>
                <h2 className="mt-3 text-2xl font-black text-slate-900">
                  Escolha o formato do campeonato
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Selecione o formato ideal e veja a sugestao de times e series.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowFormatModal(false)}
                className="rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-6 px-8 py-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4 overflow-y-auto pr-2">
                {formatOptions.map((format) => (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => setSelectedFormatId(format.id)}
                    className={`w-full rounded-[2rem] border p-5 text-left transition ${
                      selectedFormatId === format.id
                        ? 'border-blue-500 bg-blue-50/40 shadow-soft'
                        : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/20'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">
                          {format.title}
                        </h3>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
                          {format.subtitle}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                        {format.minTeams}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">
                      {format.description}
                    </p>
                    <div className="mt-4 grid gap-3 text-xs text-slate-500 md:grid-cols-3">
                      <div>
                        <p className="font-black uppercase tracking-[0.3em] text-slate-400">
                          Pros
                        </p>
                        <p className="mt-2">{format.pros}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-[0.3em] text-slate-400">
                          Contras
                        </p>
                        <p className="mt-2">{format.cons}</p>
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-[0.3em] text-slate-400">
                          Ideal para
                        </p>
                        <p className="mt-2">{format.bestFor}</p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs font-semibold text-blue-600">
                      {format.series}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-[2rem] border border-slate-100 bg-slate-50 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                    Series (BO1/BO3/BO5)
                  </p>
                  <ul className="mt-4 space-y-3 text-sm text-slate-600">
                    <li>
                      <strong className="text-slate-800">BO1:</strong> rapido,
                      mais chance de zebra (bom para fase inicial ou suico).
                    </li>
                    <li>
                      <strong className="text-slate-800">BO3:</strong> padrao
                      mais justo para eliminacao e decisoes.
                    </li>
                    <li>
                      <strong className="text-slate-800">BO5:</strong> final de
                      verdade, mas mais longa.
                    </li>
                  </ul>
                </div>

                <div className="rounded-[2rem] border border-blue-100 bg-blue-600 p-6 text-white shadow-xl shadow-blue-200">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-100">
                    Selecao atual
                  </p>
                  <p className="mt-3 text-lg font-black">
                    {selectedFormatId
                      ? formatOptions.find((item) => item.id === selectedFormatId)
                          ?.title
                      : 'Nenhum formato escolhido'}
                  </p>
                  <p className="mt-2 text-xs text-blue-100">
                    Proximo passo: configurar times, datas e premiacao.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFormatModal(false)}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
