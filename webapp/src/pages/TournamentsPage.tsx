import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  Check,
  Copy,
  Flag,
  Link2,
  PlusCircle,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';

type ModalStep = 'format' | 'config' | 'link';

type TournamentForm = {
  name: string;
  description: string;
  bannerFile: File | null;
  bannerPreview: string;
  discordLink: string;
  streamLink: string;
  organizerName: string;
  organizerContact: string;
  organizerEmail: string;
  gameTitle: string;
  timezone: string;
  location: string;
  startDate: string;
  endDate: string;
  seriesMain: string;
  seriesGroups: string;
  seriesPlayoffs: string;
  seriesFinal: string;
  maxTeams: string;
  seedCriteria: string;
  checkInEnabled: boolean;
  checkInWindow: string;
  serverRegion: string;
  mapVetoMethod: string;
  mapPool: string;
  delayPolicy: string;
  woPolicy: string;
  pausePolicy: string;
  substitutionsPolicy: string;
  antiCheat: string;
  protestPolicy: string;
  prizePool: string;
  entryFee: string;
  refundPolicy: string;
  rulesLink: string;
  officialChannel: string;
  adminContacts: string;
  languages: string;
  visibility: string;
  inviteCode: string;
  approvalRequired: boolean;
  termsAccepted: boolean;
  notes: string;
};

type CreatedTournament = {
  id: string;
  name: string;
  formatId: string;
  registerCode: string;
};

type TeamMember = {
  slot: string;
  nickname: string;
  steam: string;
  faceit: string;
  country: string;
  gameRole: string;
};

type TeamForm = {
  teamName: string;
  teamTag: string;
  managerName: string;
  managerUserId: string;
  managerContact: string;
  managerEmail: string;
  teamDiscord: string;
  logoFile: File | null;
  logoPreview: string;
  availability: string;
  preferredRegion: string;
  rulesAccepted: boolean;
  roster: TeamMember[];
};

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
    pros: 'Mais justo; reduz eliminacao por "dia ruim".',
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
    bestFor: 'Ligas, grupos pequenos (4-8 times).',
    minTeams: 'Minimo recomendado: 4 times (ideal 4-8).',
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
    minTeams: 'Minimo recomendado: 4 times (ideal 4-6).',
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
    description: 'Fase de liga (round-robin ou swiss) e depois playoffs.',
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
    description: 'Eliminados proximos ganham uma ultima chave por vagas.',
    pros: 'Reduz injustica; aumenta hype.',
    cons: 'Mais tempo e organizacao.',
    bestFor: 'Quando as vagas sao poucas e valiosas.',
    minTeams: 'Minimo recomendado: 8 times.',
    series: 'Sugestao: BO3.',
  },
];

const rosterTemplate: TeamMember[] = [
  { slot: 'Titular 1', nickname: '', steam: '', faceit: '', country: '', gameRole: '' },
  { slot: 'Titular 2', nickname: '', steam: '', faceit: '', country: '', gameRole: '' },
  { slot: 'Titular 3', nickname: '', steam: '', faceit: '', country: '', gameRole: '' },
  { slot: 'Titular 4', nickname: '', steam: '', faceit: '', country: '', gameRole: '' },
  { slot: 'Titular 5', nickname: '', steam: '', faceit: '', country: '', gameRole: '' },
  { slot: 'Reserva 1', nickname: '', steam: '', faceit: '', country: '', gameRole: '' },
  { slot: 'Reserva 2', nickname: '', steam: '', faceit: '', country: '', gameRole: '' },
];

export const TournamentsPage = () => {
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('format');
  const [modalNotice, setModalNotice] = useState<string | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [createdTournament, setCreatedTournament] =
    useState<CreatedTournament | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [registerCode, setRegisterCode] = useState<string | null>(null);
  const [tournamentForm, setTournamentForm] = useState<TournamentForm>({
    name: '',
    description: '',
    bannerFile: null,
    bannerPreview: '',
    discordLink: '',
    streamLink: '',
    organizerName: '',
    organizerContact: '',
    organizerEmail: '',
    gameTitle: 'CS2',
    timezone: 'America/Sao_Paulo',
    location: 'Online',
    startDate: '',
    endDate: '',
    seriesMain: 'BO3',
    seriesGroups: 'Nao aplica',
    seriesPlayoffs: 'Nao aplica',
    seriesFinal: 'Nao aplica',
    maxTeams: '',
    seedCriteria: 'random',
    checkInEnabled: false,
    checkInWindow: '',
    serverRegion: '',
    mapVetoMethod: '',
    mapPool: '',
    delayPolicy: '',
    woPolicy: '',
    pausePolicy: '',
    substitutionsPolicy: '',
    antiCheat: '',
    protestPolicy: '',
    prizePool: '',
    entryFee: '',
    refundPolicy: '',
    rulesLink: '',
    officialChannel: '',
    adminContacts: '',
    languages: '',
    visibility: 'publico',
    inviteCode: '',
    approvalRequired: false,
    termsAccepted: false,
    notes: '',
  });

  useEffect(() => {
    const readRegisterCode = () => {
      const params = new URLSearchParams(window.location.search);
      setRegisterCode(params.get('register'));
    };

    readRegisterCode();
    const handlePopState = () => readRegisterCode();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!tournamentForm.bannerPreview) return undefined;
    return () => URL.revokeObjectURL(tournamentForm.bannerPreview);
  }, [tournamentForm.bannerPreview]);

  const openModal = () => {
    setShowFormatModal(true);
    setModalStep('format');
    setModalNotice(null);
  };

  const closeModal = () => {
    setShowFormatModal(false);
    setModalNotice(null);
  };

  const handleFormatSelect = (formatId: string) => {
    setSelectedFormatId(formatId);
    setModalNotice(null);
  };

  const handleFormatContinue = () => {
    if (!selectedFormatId) {
      setModalNotice('Selecione um formato para continuar.');
      return;
    }
    setModalStep('config');
    setModalNotice(null);
  };

  const handleBannerChange = (file: File | null) => {
    if (!file) {
      setTournamentForm((prev) => ({
        ...prev,
        bannerFile: null,
        bannerPreview: '',
      }));
      return;
    }
    setTournamentForm((prev) => ({
      ...prev,
      bannerFile: file,
      bannerPreview: URL.createObjectURL(file),
    }));
  };

  const createRegistrationCode = () =>
    Math.random().toString(36).slice(2, 10);

  const getSiteUrl = () => {
    const envUrl = import.meta.env.VITE_SITE_URL;
    const baseUrl =
      envUrl && envUrl.startsWith('http') ? envUrl : window.location.origin;
    return baseUrl.replace(/\/$/, '');
  };

  const getRegisterLink = (code: string) =>
    `${getSiteUrl()}/tournaments?register=${code}`;

  const updateRegisterQuery = (code: string | null) => {
    const url = new URL(window.location.href);
    if (code) {
      url.searchParams.set('register', code);
    } else {
      url.searchParams.delete('register');
    }
    window.history.pushState({}, '', url.toString());
    setRegisterCode(code);
  };

  const handleCreateLink = () => {
    if (!selectedFormatId) {
      setModalNotice('Selecione um formato para continuar.');
      return;
    }

    if (
      !tournamentForm.name.trim() ||
      !tournamentForm.description.trim() ||
      !tournamentForm.organizerName.trim() ||
      !tournamentForm.organizerContact.trim() ||
      !tournamentForm.timezone.trim() ||
      !tournamentForm.startDate ||
      !tournamentForm.endDate ||
      !tournamentForm.seriesMain.trim() ||
      !tournamentForm.maxTeams.trim() ||
      !tournamentForm.serverRegion.trim() ||
      !tournamentForm.mapVetoMethod.trim() ||
      !tournamentForm.mapPool.trim() ||
      !tournamentForm.delayPolicy.trim() ||
      !tournamentForm.woPolicy.trim() ||
      !tournamentForm.protestPolicy.trim() ||
      !tournamentForm.officialChannel.trim() ||
      !tournamentForm.visibility.trim() ||
      !tournamentForm.termsAccepted
    ) {
      setModalNotice(
        'Preencha os campos obrigatorios e aceite os termos para continuar.',
      );
      return;
    }

    const register = createRegistrationCode();
    setCreatedTournament({
      id: register,
      name: tournamentForm.name.trim(),
      formatId: selectedFormatId,
      registerCode: register,
    });
    setModalStep('link');
    setModalNotice(null);
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(getRegisterLink(code));
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const selectedFormat = formatOptions.find(
    (format) => format.id === selectedFormatId,
  );

  if (registerCode) {
    return (
      <TeamRegistration
        registerCode={registerCode}
        onBack={() => updateRegisterQuery(null)}
      />
    );
  }

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
          onClick={openModal}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
        >
          <PlusCircle size={18} />
          Novo torneio
        </button>
      </header>

      {createdTournament && (
        <section className="rounded-[2.5rem] border border-blue-100 bg-blue-50/60 p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                Link de inscricao pronto
              </p>
              <p className="mt-2 text-xl font-black text-slate-900">
                {createdTournament.name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Compartilhe o link para os donos das equipes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleCopyLink(createdTournament.registerCode)}
              className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
            >
              {copyState === 'copied' ? <Check size={16} /> : <Copy size={16} />}
              {copyState === 'copied' ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <Link2 size={16} className="text-blue-500" />
            <span className="truncate">
              {getRegisterLink(createdTournament.registerCode)}
            </span>
            <button
              type="button"
              onClick={() => updateRegisterQuery(createdTournament.registerCode)}
              className="ml-auto rounded-full bg-slate-900 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
            >
              Abrir inscricao
            </button>
          </div>
        </section>
      )}

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
                  {modalStep === 'format' && 'Escolha o formato do campeonato'}
                  {modalStep === 'config' && 'Configure o torneio'}
                  {modalStep === 'link' && 'Link de inscricao das equipes'}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {modalStep === 'format' &&
                    'Selecione o formato ideal e veja a sugestao de times e series.'}
                  {modalStep === 'config' &&
                    'Informe os dados principais e gere o link para inscricoes.'}
                  {modalStep === 'link' &&
                    'Compartilhe este link com os donos das equipes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full border border-slate-200 bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {modalNotice && (
              <div className="border-b border-slate-100 bg-amber-50 px-8 py-3 text-xs font-semibold text-amber-700">
                {modalNotice}
              </div>
            )}

            {modalStep === 'format' && (
              <div className="grid gap-6 px-8 py-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-3">
                  {formatOptions.map((format) => (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => handleFormatSelect(format.id)}
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
                        <strong className="text-slate-800">BO5:</strong> final
                        de verdade, mas mais longa.
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-[2rem] border border-blue-100 bg-blue-600 p-6 text-white shadow-xl shadow-blue-200">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-100">
                      Selecao atual
                    </p>
                    <p className="mt-3 text-lg font-black">
                      {selectedFormat?.title || 'Nenhum formato escolhido'}
                    </p>
                    <p className="mt-2 text-xs text-blue-100">
                      Proximo passo: configurar times, datas e premiacao.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleFormatContinue}
                    className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}

            {modalStep === 'config' && (
              <div className="grid gap-6 px-8 py-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="max-h-[65vh] space-y-6 overflow-y-auto pr-3">
                  <section className="space-y-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                        Identidade e divulgacao
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Nome do torneio *"
                        value={tournamentForm.name}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            name: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Jogo *"
                        value={tournamentForm.gameTitle}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            gameTitle: value,
                          }))
                        }
                      />
                    </div>
                    <FieldTextarea
                      label="Descricao / regras resumidas *"
                      value={tournamentForm.description}
                      onChange={(value) =>
                        setTournamentForm((prev) => ({
                          ...prev,
                          description: value,
                        }))
                      }
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Nome do responsavel *"
                        value={tournamentForm.organizerName}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            organizerName: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Contato do responsavel *"
                        value={tournamentForm.organizerContact}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            organizerContact: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Email do responsavel (opcional)"
                        value={tournamentForm.organizerEmail}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            organizerEmail: value,
                          }))
                        }
                      />
                    </div>
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                        Banner (opcional)
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                        <label className="cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white">
                          Upload banner
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) =>
                              handleBannerChange(event.target.files?.[0] || null)
                            }
                          />
                        </label>
                        {tournamentForm.bannerPreview && (
                          <img
                            src={tournamentForm.bannerPreview}
                            alt="Preview banner"
                            className="h-16 rounded-xl border border-slate-200 object-cover"
                          />
                        )}
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Discord oficial *"
                        value={tournamentForm.officialChannel}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            officialChannel: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Discord secundario (opcional)"
                        value={tournamentForm.discordLink}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            discordLink: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Link Twitch/YouTube (opcional)"
                        value={tournamentForm.streamLink}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            streamLink: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Link regulamento PDF (opcional)"
                        value={tournamentForm.rulesLink}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            rulesLink: value,
                          }))
                        }
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                      Datas e formato
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Fuso horario *"
                        value={tournamentForm.timezone}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            timezone: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Local (online/LAN) *"
                        value={tournamentForm.location}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            location: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Inicio (data/hora) *"
                        type="datetime-local"
                        value={tournamentForm.startDate}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            startDate: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Fim (data/hora) *"
                        type="datetime-local"
                        value={tournamentForm.endDate}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            endDate: value,
                          }))
                        }
                      />
                      <FieldSelect
                        label="Serie principal *"
                        value={tournamentForm.seriesMain}
                        options={['BO1', 'BO3', 'BO5']}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            seriesMain: value,
                          }))
                        }
                      />
                      <FieldSelect
                        label="Serie grupos (opcional)"
                        value={tournamentForm.seriesGroups}
                        options={['Nao aplica', 'BO1', 'BO3', 'BO5']}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            seriesGroups: value,
                          }))
                        }
                      />
                      <FieldSelect
                        label="Serie playoffs (opcional)"
                        value={tournamentForm.seriesPlayoffs}
                        options={['Nao aplica', 'BO1', 'BO3', 'BO5']}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            seriesPlayoffs: value,
                          }))
                        }
                      />
                      <FieldSelect
                        label="Serie final (opcional)"
                        value={tournamentForm.seriesFinal}
                        options={['Nao aplica', 'BO1', 'BO3', 'BO5']}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            seriesFinal: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Numero maximo de equipes *"
                        value={tournamentForm.maxTeams}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            maxTeams: value,
                          }))
                        }
                      />
                      <FieldSelect
                        label="Criterio de seed (opcional)"
                        value={tournamentForm.seedCriteria}
                        options={[
                          'random',
                          'ranking interno',
                          'por elo',
                          'por inscricao',
                        ]}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            seedCriteria: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Janela de check-in (opcional)"
                        value={tournamentForm.checkInWindow}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            checkInWindow: value,
                          }))
                        }
                      />
                    </div>
                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                      <input
                        type="checkbox"
                        checked={tournamentForm.checkInEnabled}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            checkInEnabled: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      Habilitar check-in antes das partidas (opcional).
                    </label>
                  </section>

                  <section className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                      Regras de partida
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Servidor/regiao *"
                        value={tournamentForm.serverRegion}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            serverRegion: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Metodo de veto de mapas *"
                        value={tournamentForm.mapVetoMethod}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            mapVetoMethod: value,
                          }))
                        }
                      />
                    </div>
                    <FieldTextarea
                      label="Map pool (lista de mapas) *"
                      value={tournamentForm.mapPool}
                      onChange={(value) =>
                        setTournamentForm((prev) => ({
                          ...prev,
                          mapPool: value,
                        }))
                      }
                    />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Politica de atraso *"
                        value={tournamentForm.delayPolicy}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            delayPolicy: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="WO / No-show *"
                        value={tournamentForm.woPolicy}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            woPolicy: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Protestos e evidencias *"
                        value={tournamentForm.protestPolicy}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            protestPolicy: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Pausas (opcional)"
                        value={tournamentForm.pausePolicy}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            pausePolicy: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Substituicoes (opcional)"
                        value={tournamentForm.substitutionsPolicy}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            substitutionsPolicy: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Anti-cheat / requisitos (opcional)"
                        value={tournamentForm.antiCheat}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            antiCheat: value,
                          }))
                        }
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                      Premiacao e custos
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Premiacao (opcional)"
                        value={tournamentForm.prizePool}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            prizePool: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Taxa de inscricao (opcional)"
                        value={tournamentForm.entryFee}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            entryFee: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Politica de reembolso (opcional)"
                        value={tournamentForm.refundPolicy}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            refundPolicy: value,
                          }))
                        }
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                      Comunicacao e suporte
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldInput
                        label="Equipe de admins (opcional)"
                        value={tournamentForm.adminContacts}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            adminContacts: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Idiomas (opcional)"
                        value={tournamentForm.languages}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            languages: value,
                          }))
                        }
                      />
                    </div>
                  </section>

                  <section className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                      Privacidade e controle
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      <FieldSelect
                        label="Torneio publico ou privado *"
                        value={tournamentForm.visibility}
                        options={['publico', 'privado']}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            visibility: value,
                          }))
                        }
                      />
                      <FieldInput
                        label="Codigo de convite (se privado)"
                        value={tournamentForm.inviteCode}
                        onChange={(value) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            inviteCode: value,
                          }))
                        }
                      />
                    </div>
                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                      <input
                        type="checkbox"
                        checked={tournamentForm.approvalRequired}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            approvalRequired: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      Aprovar manualmente as inscricoes (opcional).
                    </label>
                    <label className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                      <input
                        type="checkbox"
                        checked={tournamentForm.termsAccepted}
                        onChange={(event) =>
                          setTournamentForm((prev) => ({
                            ...prev,
                            termsAccepted: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      Aceito as regras, conduta e requisitos do torneio. *
                    </label>
                  </section>

                  <FieldTextarea
                    label="Observacoes adicionais (opcional)"
                    value={tournamentForm.notes}
                    onChange={(value) =>
                      setTournamentForm((prev) => ({
                        ...prev,
                        notes: value,
                      }))
                    }
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                      Resumo do formato
                    </p>
                    <p className="mt-3 text-lg font-black text-slate-900">
                      {selectedFormat?.title || 'Formato personalizado'}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {selectedFormat?.bestFor ||
                        'Defina um formato para ajudar no cronograma.'}
                    </p>
                    <div className="mt-4 space-y-2 text-xs text-slate-500">
                      <p>{selectedFormat?.minTeams || 'Minimo: defina equipes.'}</p>
                      <p>Maximo de equipes: {tournamentForm.maxTeams || '---'}</p>
                      <p>Serie principal: {tournamentForm.seriesMain}</p>
                      <p>Fuso horario: {tournamentForm.timezone || '---'}</p>
                      <p>Servidor: {tournamentForm.serverRegion || '---'}</p>
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-blue-100 bg-blue-600 p-6 text-white shadow-xl shadow-blue-200">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-100">
                      Proximo passo
                    </p>
                    <p className="mt-3 text-lg font-black">
                      Gerar link de inscricao
                    </p>
                    <p className="mt-2 text-xs text-blue-100">
                      O link leva os donos das equipes para preencher os dados.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setModalStep('format')}
                      className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-slate-500 transition hover:bg-slate-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateLink}
                      className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
                    >
                      Gerar link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {modalStep === 'link' && createdTournament && (
              <div className="px-8 py-8">
                <div className="rounded-[2.5rem] border border-blue-100 bg-blue-50/60 p-6">
                  <div className="flex items-center gap-3 text-blue-600">
                    <Users size={20} />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">
                      Inscricoes abertas
                    </p>
                  </div>
                  <p className="mt-4 text-2xl font-black text-slate-900">
                    {createdTournament.name}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Compartilhe o link abaixo com os donos das equipes.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600">
                    <Link2 size={16} className="text-blue-500" />
                    <span className="truncate">
                      {getRegisterLink(createdTournament.registerCode)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(createdTournament.registerCode)}
                      className="ml-auto flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white"
                    >
                      {copyState === 'copied' ? (
                        <>
                          <Check size={14} /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        updateRegisterQuery(createdTournament.registerCode)
                      }
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
                    >
                      Abrir inscricao
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-slate-500 transition hover:bg-slate-50"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FieldInput = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2 text-xs font-semibold text-slate-500">
    <span className="uppercase tracking-[0.3em]">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
    />
  </label>
);

const FieldSelect = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2 text-xs font-semibold text-slate-500">
    <span className="uppercase tracking-[0.3em]">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const FieldTextarea = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2 text-xs font-semibold text-slate-500">
    <span className="uppercase tracking-[0.3em]">{label}</span>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      className="w-full resize-none rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
    />
  </label>
);

const TeamRegistration = ({
  registerCode,
  onBack,
}: {
  registerCode: string;
  onBack: () => void;
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState<TeamForm>({
    teamName: '',
    teamTag: '',
    managerName: '',
    managerUserId: '',
    managerContact: '',
    managerEmail: '',
    teamDiscord: '',
    logoFile: null,
    logoPreview: '',
    availability: '',
    preferredRegion: '',
    rulesAccepted: false,
    roster: rosterTemplate.map((player) => ({ ...player })),
  });

  useEffect(() => {
    if (!teamForm.logoPreview) return undefined;
    return () => URL.revokeObjectURL(teamForm.logoPreview);
  }, [teamForm.logoPreview]);

  const handleLogoChange = (file: File | null) => {
    if (!file) {
      setTeamForm((prev) => ({
        ...prev,
        logoFile: null,
        logoPreview: '',
      }));
      return;
    }
    setTeamForm((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleRosterChange = (
    index: number,
    field: 'nickname' | 'steam' | 'faceit' | 'country' | 'gameRole',
    value: string,
  ) => {
    setTeamForm((prev) => {
      const roster = [...prev.roster];
      roster[index] = { ...roster[index], [field]: value };
      return { ...prev, roster };
    });
  };

  const handleSubmit = () => {
    if (
      !teamForm.teamName.trim() ||
      !teamForm.teamTag.trim() ||
      !teamForm.managerName.trim() ||
      !teamForm.managerContact.trim() ||
      !teamForm.rulesAccepted
    ) {
      setNotice(
        'Preencha nome do time, tag, responsavel, contato e aceite as regras.',
      );
      return;
    }
    setNotice('Inscricao enviada. Aguarde confirmacao do organizador.');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-500">
            Inscricao do torneio
          </p>
          <h1 className="mt-4 text-3xl font-black text-slate-900">
            Cadastro de equipe
          </h1>
          <p className="mt-3 text-slate-500">
            Codigo do campeonato: <strong>{registerCode}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-slate-500 transition hover:bg-slate-50"
        >
          Voltar a central
        </button>
      </header>

      {notice && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-6 py-3 text-sm font-semibold text-blue-700">
          {notice}
        </div>
      )}

      <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 text-blue-600">
          <Users size={20} />
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Dados da equipe
          </h2>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <FieldInput
            label="Nome do time *"
            value={teamForm.teamName}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, teamName: value }))
            }
          />
          <FieldInput
            label="Tag/abreviacao (3-5) *"
            value={teamForm.teamTag}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, teamTag: value }))
            }
          />
          <FieldInput
            label="Nome do responsavel *"
            value={teamForm.managerName}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, managerName: value }))
            }
          />
          <FieldInput
            label="ID do usuario (opcional)"
            value={teamForm.managerUserId}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, managerUserId: value }))
            }
          />
          <FieldInput
            label="Contato do responsavel (Discord) *"
            value={teamForm.managerContact}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, managerContact: value }))
            }
          />
          <FieldInput
            label="Email do responsavel (opcional)"
            value={teamForm.managerEmail}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, managerEmail: value }))
            }
          />
          <FieldInput
            label="Discord do time (opcional)"
            value={teamForm.teamDiscord}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, teamDiscord: value }))
            }
          />
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <UploadCloud className="mx-auto text-slate-400" size={28} />
          <p className="mt-3 text-sm font-semibold text-slate-600">
            Logo do time
          </p>
          <p className="mt-1 text-xs text-slate-400">
            PNG ou JPG, fundo transparente se possivel.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
            <label className="cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-white">
              Selecionar logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) =>
                  handleLogoChange(event.target.files?.[0] || null)
                }
              />
            </label>
            {teamForm.logoPreview && (
              <img
                src={teamForm.logoPreview}
                alt="Preview logo"
                className="h-12 w-12 rounded-full border border-slate-200 object-cover"
              />
            )}
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-slate-400">
            Jogadores (5 titulares + 2 reservas)
          </h3>
          <div className="mt-4 space-y-3">
            {teamForm.roster.map((player, index) => (
              <div
                key={player.slot}
                className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                    {player.slot}
                  </div>
                  <input
                    type="text"
                    placeholder="Nickname"
                    value={player.nickname}
                    onChange={(event) =>
                      handleRosterChange(index, 'nickname', event.target.value)
                    }
                    className="min-w-[140px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="SteamID64 / link Steam"
                    value={player.steam}
                    onChange={(event) =>
                      handleRosterChange(index, 'steam', event.target.value)
                    }
                    className="min-w-[180px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Faceit/ESEA (opcional)"
                    value={player.faceit}
                    onChange={(event) =>
                      handleRosterChange(index, 'faceit', event.target.value)
                    }
                    className="min-w-[160px] flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Funcao (IGL, AWPer, entry...)"
                    value={player.gameRole}
                    onChange={(event) =>
                      handleRosterChange(index, 'gameRole', event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Pais/UF (opcional)"
                    value={player.country}
                    onChange={(event) =>
                      handleRosterChange(index, 'country', event.target.value)
                    }
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <FieldTextarea
            label="Disponibilidade (opcional)"
            value={teamForm.availability}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, availability: value }))
            }
          />
          <FieldInput
            label="Regiao preferida (opcional)"
            value={teamForm.preferredRegion}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, preferredRegion: value }))
            }
          />
        </div>

        <label className="mt-6 flex items-center gap-3 text-xs font-semibold text-slate-500">
          <input
            type="checkbox"
            checked={teamForm.rulesAccepted}
            onChange={(event) =>
              setTeamForm((prev) => ({
                ...prev,
                rulesAccepted: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-slate-300 text-blue-600"
          />
          Confirmo que a equipe aceita as regras, anti-cheat e conduta do torneio. *
        </label>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Envie a inscricao para o organizador revisar e aprovar.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
          >
            Enviar inscricao
          </button>
        </div>
      </div>
    </div>
  );
};
