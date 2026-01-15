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
import { supabase } from '../lib/supabase';

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

type TournamentRow = {
  id: string;
  name: string;
  start_at: string | null;
  end_at: string | null;
  status: string | null;
  max_teams: number | null;
  format_type: string | null;
  invite_code: string | null;
  ruleset_id: string | null;
  map_pool_id: string | null;
  format_id: string | null;
  registrations?: { count: number }[];
};

type TournamentsPageProps = {
  playerId?: string;
};

type ConfigSection =
  | 'identidade'
  | 'datas'
  | 'regras'
  | 'premios'
  | 'comunicacao'
  | 'privacidade';

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

const configTabs: { id: ConfigSection; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'datas', label: 'Datas' },
  { id: 'regras', label: 'Regras' },
  { id: 'premios', label: 'Premiacao' },
  { id: 'comunicacao', label: 'Comunicacao' },
  { id: 'privacidade', label: 'Privacidade' },
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

const buildTournamentForm = (
  overrides: Partial<TournamentForm> = {},
): TournamentForm => ({
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
  ...overrides,
});

const toInputDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

const toSupabaseDate = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatDate = (value: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('pt-BR');
};

export const TournamentsPage = ({ playerId }: TournamentsPageProps) => {
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('format');
  const [modalNotice, setModalNotice] = useState<string | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [configSection, setConfigSection] =
    useState<ConfigSection>('identidade');
  const [createdTournament, setCreatedTournament] =
    useState<CreatedTournament | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [registerCode, setRegisterCode] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [savingTournament, setSavingTournament] = useState(false);
  const [editingIds, setEditingIds] = useState<{
    tournamentId: string;
    rulesetId: string | null;
    mapPoolId: string | null;
    formatId: string | null;
  } | null>(null);
  const [tournamentError, setTournamentError] = useState('');
  const [tournamentForm, setTournamentForm] = useState<TournamentForm>(() =>
    buildTournamentForm(),
  );

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

  const loadTournaments = async () => {
    if (!supabase || !playerId) {
      setLoadingTournaments(false);
      return;
    }

    setLoadingTournaments(true);
    setTournamentError('');
    const { data, error } = await supabase
      .from('tournaments')
      .select(
        'id, name, start_at, end_at, status, max_teams, format_type, invite_code, ruleset_id, map_pool_id, format_id, registrations(count)',
      )
      .eq('created_by_player_id', playerId)
      .order('created_at', { ascending: false });

    if (error) {
      setTournamentError(error.message);
    } else {
      setTournaments((data ?? []) as TournamentRow[]);
    }
    setLoadingTournaments(false);
  };

  useEffect(() => {
    void loadTournaments();
  }, [playerId]);

  const openModal = () => {
    setShowFormatModal(true);
    setModalStep('format');
    setModalNotice(null);
    setSelectedFormatId(formatOptions[0]?.id ?? null);
    setConfigSection('identidade');
    setEditingIds(null);
    setCreatedTournament(null);
    setCopyState('idle');
    setTournamentForm(buildTournamentForm());
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
    setConfigSection('identidade');
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

  const parseNumber = (value: string) => {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const buildMapsJson = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const saveTournament = async () => {
    if (!supabase) {
      setModalNotice('Supabase nao configurado.');
      return null;
    }
    if (!playerId) {
      setModalNotice('ID do jogador nao encontrado.');
      return null;
    }
    if (!selectedFormatId) {
      setModalNotice('Selecione um formato para continuar.');
      return null;
    }

    setSavingTournament(true);
    setTournamentError('');
    const inviteCode =
      tournamentForm.inviteCode.trim() || createRegistrationCode();
    const mapList = buildMapsJson(tournamentForm.mapPool);

    const rulesetPayload = {
      wo_score_rule: tournamentForm.woPolicy.trim() || null,
      pause_policy_json: tournamentForm.pausePolicy
        ? { text: tournamentForm.pausePolicy.trim() }
        : {},
      substitution_policy_json: tournamentForm.substitutionsPolicy
        ? { text: tournamentForm.substitutionsPolicy.trim() }
        : {},
      anti_cheat_policy_json: tournamentForm.antiCheat
        ? { text: tournamentForm.antiCheat.trim() }
        : {},
      protest_policy_json: tournamentForm.protestPolicy
        ? { text: tournamentForm.protestPolicy.trim() }
        : {},
      result_reporting_mode: 'team_report',
    };

    const mapPoolPayload = {
      name: tournamentForm.mapPool.trim() || 'Map pool',
      maps_json: mapList,
    };

    const formatPayload = {
      format_type: selectedFormatId,
      phases_json: [
        {
          key: 'main',
          series_main: tournamentForm.seriesMain,
          series_groups: tournamentForm.seriesGroups,
          series_playoffs: tournamentForm.seriesPlayoffs,
          series_final: tournamentForm.seriesFinal,
        },
      ],
    };

    let rulesetId = editingIds?.rulesetId ?? null;
    if (rulesetId) {
      const { error } = await supabase
        .from('rulesets')
        .update(rulesetPayload)
        .eq('id', rulesetId);
      if (error) {
        setModalNotice(error.message);
        setSavingTournament(false);
        return null;
      }
    } else {
      const { data, error } = await supabase
        .from('rulesets')
        .insert(rulesetPayload)
        .select('id')
        .single();
      if (error || !data) {
        setModalNotice(error?.message ?? 'Erro ao salvar regras.');
        setSavingTournament(false);
        return null;
      }
      rulesetId = data.id;
    }

    let mapPoolId = editingIds?.mapPoolId ?? null;
    if (mapPoolId) {
      const { error } = await supabase
        .from('map_pools')
        .update(mapPoolPayload)
        .eq('id', mapPoolId);
      if (error) {
        setModalNotice(error.message);
        setSavingTournament(false);
        return null;
      }
    } else {
      const { data, error } = await supabase
        .from('map_pools')
        .insert(mapPoolPayload)
        .select('id')
        .single();
      if (error || !data) {
        setModalNotice(error?.message ?? 'Erro ao salvar map pool.');
        setSavingTournament(false);
        return null;
      }
      mapPoolId = data.id;
    }

    let formatId = editingIds?.formatId ?? null;
    if (formatId) {
      const { error } = await supabase
        .from('tournament_formats')
        .update(formatPayload)
        .eq('id', formatId);
      if (error) {
        setModalNotice(error.message);
        setSavingTournament(false);
        return null;
      }
    } else {
      const { data, error } = await supabase
        .from('tournament_formats')
        .insert(formatPayload)
        .select('id')
        .single();
      if (error || !data) {
        setModalNotice(error?.message ?? 'Erro ao salvar formato.');
        setSavingTournament(false);
        return null;
      }
      formatId = data.id;
    }

    const tournamentPayload = {
      name: tournamentForm.name.trim(),
      game_name: tournamentForm.gameTitle.trim(),
      format: selectedFormatId,
      description_short: tournamentForm.description.trim(),
      description_full: tournamentForm.description.trim(),
      timezone: tournamentForm.timezone.trim(),
      banner_url: null,
      visibility: tournamentForm.visibility,
      invite_code: inviteCode,
      status: 'draft',
      start_at: toSupabaseDate(tournamentForm.startDate),
      end_at: toSupabaseDate(tournamentForm.endDate),
      max_teams: parseNumber(tournamentForm.maxTeams),
      max_participants: parseNumber(tournamentForm.maxTeams),
      seeding_mode: tournamentForm.seedCriteria.trim(),
      checkin_enabled: tournamentForm.checkInEnabled,
      checkin_open_minutes_before: parseNumber(tournamentForm.checkInWindow),
      checkin_close_minutes_before: null,
      ruleset_id: rulesetId,
      map_pool_id: mapPoolId,
      format_id: formatId,
      format_type: selectedFormatId,
      created_by_player_id: playerId,
      organizer_name: tournamentForm.organizerName.trim(),
      organizer_contact: tournamentForm.organizerContact.trim(),
      organizer_email: tournamentForm.organizerEmail.trim(),
      discord_link: tournamentForm.discordLink.trim(),
      stream_link: tournamentForm.streamLink.trim(),
      rules_link: tournamentForm.rulesLink.trim(),
      official_channel: tournamentForm.officialChannel.trim(),
      admin_contacts: tournamentForm.adminContacts.trim(),
      languages: tournamentForm.languages.trim(),
      location: tournamentForm.location.trim(),
      server_region: tournamentForm.serverRegion.trim(),
      map_veto_method: tournamentForm.mapVetoMethod.trim(),
      delay_policy: tournamentForm.delayPolicy.trim(),
      wo_policy: tournamentForm.woPolicy.trim(),
      pause_policy: tournamentForm.pausePolicy.trim(),
      substitutions_policy: tournamentForm.substitutionsPolicy.trim(),
      anti_cheat: tournamentForm.antiCheat.trim(),
      protest_policy: tournamentForm.protestPolicy.trim(),
      prize_pool: tournamentForm.prizePool.trim(),
      entry_fee: tournamentForm.entryFee.trim(),
      refund_policy: tournamentForm.refundPolicy.trim(),
      approval_required: tournamentForm.approvalRequired,
      notes: tournamentForm.notes.trim(),
    };

    if (editingIds?.tournamentId) {
      const { error } = await supabase
        .from('tournaments')
        .update(tournamentPayload)
        .eq('id', editingIds.tournamentId);
      if (error) {
        setModalNotice(error.message);
        setSavingTournament(false);
        return null;
      }
      setSavingTournament(false);
      return {
        id: editingIds.tournamentId,
        name: tournamentPayload.name,
        formatId: selectedFormatId,
        registerCode: inviteCode,
      };
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert(tournamentPayload)
      .select('id')
      .single();

    if (error || !data) {
      setModalNotice(error?.message ?? 'Erro ao criar torneio.');
      setSavingTournament(false);
      return null;
    }

    setSavingTournament(false);
    return {
      id: data.id,
      name: tournamentPayload.name,
      formatId: selectedFormatId,
      registerCode: inviteCode,
    };
  };

  const handleCreateLink = async () => {
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

    const saved = await saveTournament();
    if (!saved) {
      return;
    }
    if (editingIds) {
      setCreatedTournament(null);
      setModalNotice('Torneio atualizado.');
      setModalStep('config');
    } else {
      setCreatedTournament(saved);
      setModalNotice(null);
      setModalStep('link');
      setTournamentForm((prev) => ({
        ...prev,
        inviteCode: saved.registerCode,
      }));
    }
    await loadTournaments();
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(getRegisterLink(code));
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const handleEditTournament = async (tournamentId: string) => {
    if (!supabase) {
      setTournamentError('Supabase nao configurado.');
      return;
    }

    setCreatedTournament(null);
    setCopyState('idle');

    const { data, error } = await supabase
      .from('tournaments')
      .select(
        `id,
        name,
        game_name,
        format,
        description_short,
        description_full,
        timezone,
        banner_url,
        visibility,
        invite_code,
        status,
        start_at,
        end_at,
        max_teams,
        seeding_mode,
        checkin_enabled,
        checkin_open_minutes_before,
        server_region,
        map_veto_method,
        delay_policy,
        wo_policy,
        pause_policy,
        substitutions_policy,
        anti_cheat,
        protest_policy,
        prize_pool,
        entry_fee,
        refund_policy,
        rules_link,
        official_channel,
        admin_contacts,
        languages,
        location,
        organizer_name,
        organizer_contact,
        organizer_email,
        discord_link,
        stream_link,
        approval_required,
        notes,
        format_type,
        ruleset_id,
        map_pool_id,
        format_id,
        rulesets (
          wo_score_rule,
          pause_policy_json,
          substitution_policy_json,
          anti_cheat_policy_json,
          protest_policy_json
        ),
        map_pools (
          name,
          maps_json
        ),
        tournament_formats (
          format_type,
          phases_json
        )`,
      )
      .eq('id', tournamentId)
      .single();

    if (error || !data) {
      setTournamentError(error?.message ?? 'Erro ao carregar torneio.');
      return;
    }

    const mapList = Array.isArray(data.map_pools?.maps_json)
      ? data.map_pools.maps_json.join(', ')
      : data.map_pools?.name ?? '';
    const phases = Array.isArray(data.tournament_formats?.phases_json)
      ? data.tournament_formats?.phases_json?.[0]
      : null;

    setSelectedFormatId(
      data.format_type ??
        data.format ??
        data.tournament_formats?.format_type ??
        formatOptions[0]?.id ??
        null,
    );
    setEditingIds({
      tournamentId: data.id,
      rulesetId: data.ruleset_id,
      mapPoolId: data.map_pool_id,
      formatId: data.format_id,
    });
    setTournamentForm(
      buildTournamentForm({
        name: data.name ?? '',
        gameTitle: data.game_name ?? 'CS2',
        description: data.description_full ?? data.description_short ?? '',
        bannerPreview: data.banner_url ?? '',
        discordLink: data.discord_link ?? '',
        streamLink: data.stream_link ?? '',
        organizerName: data.organizer_name ?? '',
        organizerContact: data.organizer_contact ?? '',
        organizerEmail: data.organizer_email ?? '',
        gameTitle: 'CS2',
        timezone: data.timezone ?? 'America/Sao_Paulo',
        location: data.location ?? 'Online',
        startDate: toInputDate(data.start_at),
        endDate: toInputDate(data.end_at),
        seriesMain: phases?.series_main ?? 'BO3',
        seriesGroups: phases?.series_groups ?? 'Nao aplica',
        seriesPlayoffs: phases?.series_playoffs ?? 'Nao aplica',
        seriesFinal: phases?.series_final ?? 'Nao aplica',
        maxTeams: data.max_teams?.toString() ?? '',
        seedCriteria: data.seeding_mode ?? 'random',
        checkInEnabled: Boolean(data.checkin_enabled),
        checkInWindow: data.checkin_open_minutes_before?.toString() ?? '',
        serverRegion: data.server_region ?? '',
        mapVetoMethod: data.map_veto_method ?? '',
        mapPool: mapList,
        delayPolicy: data.delay_policy ?? '',
        woPolicy: data.wo_policy ?? '',
        pausePolicy:
          data.pause_policy ??
          data.rulesets?.pause_policy_json?.text ??
          '',
        substitutionsPolicy:
          data.substitutions_policy ??
          data.rulesets?.substitution_policy_json?.text ??
          '',
        antiCheat:
          data.anti_cheat ?? data.rulesets?.anti_cheat_policy_json?.text ?? '',
        protestPolicy:
          data.protest_policy ??
          data.rulesets?.protest_policy_json?.text ??
          '',
        prizePool: data.prize_pool ?? '',
        entryFee: data.entry_fee ?? '',
        refundPolicy: data.refund_policy ?? '',
        rulesLink: data.rules_link ?? '',
        officialChannel: data.official_channel ?? '',
        adminContacts: data.admin_contacts ?? '',
        languages: data.languages ?? '',
        visibility: data.visibility ?? 'publico',
        inviteCode: data.invite_code ?? '',
        approvalRequired: Boolean(data.approval_required),
        termsAccepted: true,
        notes: data.notes ?? '',
      }),
    );
    setShowFormatModal(true);
    setModalStep('config');
    setConfigSection('identidade');
    setModalNotice(null);
  };

  const selectedFormat = formatOptions.find(
    (format) => format.id === selectedFormatId,
  );

  const resolveStatusMeta = (row: TournamentRow) => {
    if (row.status === 'cancelled') {
      return { label: 'Cancelado', tone: 'bg-rose-50 text-rose-500' };
    }
    if (row.status === 'completed') {
      return { label: 'Finalizado', tone: 'bg-slate-200 text-slate-600' };
    }
    if (row.status === 'checkin_open') {
      return { label: 'Check-in', tone: 'bg-amber-50 text-amber-600' };
    }
    if (row.status === 'live') {
      return { label: 'Em andamento', tone: 'bg-emerald-50 text-emerald-600' };
    }

    if (row.start_at) {
      const start = new Date(row.start_at);
      const end = row.end_at ? new Date(row.end_at) : null;
      const now = new Date();
      if (end && now >= end) {
        return { label: 'Finalizado', tone: 'bg-slate-200 text-slate-600' };
      }
      if (!Number.isNaN(start.getTime()) && now >= start) {
        return { label: 'Em andamento', tone: 'bg-emerald-50 text-emerald-600' };
      }
      return { label: 'Nao iniciado', tone: 'bg-slate-100 text-slate-500' };
    }

    return { label: 'Nao iniciado', tone: 'bg-slate-100 text-slate-500' };
  };

  if (registerCode) {
    return (
      <TeamRegistration
        registerCode={registerCode}
        playerId={playerId}
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

      <section className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
              Torneios criados
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              Seus campeonatos
            </h2>
          </div>
          {tournamentError && (
            <span className="rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-500">
              {tournamentError}
            </span>
          )}
        </div>

        {loadingTournaments ? (
          <div className="mt-6 text-sm text-slate-400">Carregando torneios...</div>
        ) : tournaments.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-500">
            Nenhum torneio criado ainda. Clique em "Novo torneio" para comecar.
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                <tr>
                  <th className="py-3 pr-6">Torneio</th>
                  <th className="py-3 pr-6">Inicio</th>
                  <th className="py-3 pr-6">Fim</th>
                  <th className="py-3 pr-6">Status</th>
                  <th className="py-3 pr-6 text-center">Times</th>
                  <th className="py-3 pr-6 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tournaments.map((tournament) => {
                  const meta = resolveStatusMeta(tournament);
                  const teamCount = tournament.registrations?.[0]?.count ?? 0;
                  return (
                    <tr key={tournament.id} className="text-slate-600">
                      <td className="py-4 pr-6 font-semibold text-slate-800">
                        {tournament.name}
                      </td>
                      <td className="py-4 pr-6">{formatDate(tournament.start_at)}</td>
                      <td className="py-4 pr-6">{formatDate(tournament.end_at)}</td>
                      <td className="py-4 pr-6">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.3em] ${meta.tone}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-center font-semibold text-slate-700">
                        {teamCount}
                        {tournament.max_teams ? ` / ${tournament.max_teams}` : ''}
                      </td>
                      <td className="py-4 pr-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditTournament(tournament.id)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 transition hover:bg-slate-50"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showFormatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-6">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[3rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-10 py-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">
                  Novo torneio
                </p>
                <h2 className="mt-3 text-3xl font-black text-slate-900">
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
              <div className="grid gap-8 px-10 py-8 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="max-h-[70vh] overflow-y-auto pr-4">
                  <div className="mb-6 flex flex-wrap gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-2">
                    {configTabs.map((tab) => {
                      const isActive = configSection === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setConfigSection(tab.id)}
                          className={`rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] transition ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                              : 'text-slate-500 hover:bg-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {configSection === 'identidade' && (
                    <section className="space-y-4">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-600">
                          Identidade e divulgacao
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldInput
                          label="Nome do torneio"
                          required
                          value={tournamentForm.name}
                          onChange={(value) =>
                            setTournamentForm((prev) => ({
                              ...prev,
                              name: value,
                            }))
                          }
                        />
                        <FieldInput
                          label="Jogo"
                          required
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
                        label="Descricao / regras resumidas"
                        required
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
                          label="Nome do responsavel"
                          required
                          value={tournamentForm.organizerName}
                          onChange={(value) =>
                            setTournamentForm((prev) => ({
                              ...prev,
                              organizerName: value,
                            }))
                          }
                        />
                        <FieldInput
                          label="Contato do responsavel"
                          required
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
                                handleBannerChange(
                                  event.target.files?.[0] || null,
                                )
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
                          label="Discord oficial"
                          required
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
                  )}

                  {configSection === 'datas' && (
                    <section className="space-y-4">
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-600">
                        Datas e formato
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldInput
                          label="Fuso horario"
                          required
                          value={tournamentForm.timezone}
                          onChange={(value) =>
                            setTournamentForm((prev) => ({
                              ...prev,
                              timezone: value,
                            }))
                          }
                        />
                        <FieldInput
                          label="Local (online/LAN)"
                          required
                          value={tournamentForm.location}
                          onChange={(value) =>
                            setTournamentForm((prev) => ({
                              ...prev,
                              location: value,
                            }))
                          }
                        />
                        <FieldInput
                          label="Inicio (data/hora)"
                          required
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
                          label="Fim (data/hora)"
                          required
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
                          label="Serie principal"
                          required
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
                          label="Numero maximo de equipes"
                          required
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
                  )}

                  {configSection === 'regras' && (
                    <section className="space-y-4">
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-600">
                        Regras de partida
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldInput
                          label="Servidor/regiao"
                          required
                          value={tournamentForm.serverRegion}
                          onChange={(value) =>
                            setTournamentForm((prev) => ({
                              ...prev,
                              serverRegion: value,
                            }))
                          }
                        />
                        <FieldInput
                          label="Metodo de veto de mapas"
                          required
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
                        label="Map pool (lista de mapas)"
                        required
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
                          label="Politica de atraso"
                          required
                          value={tournamentForm.delayPolicy}
                          onChange={(value) =>
                            setTournamentForm((prev) => ({
                              ...prev,
                              delayPolicy: value,
                            }))
                          }
                        />
                        <FieldInput
                          label="WO / No-show"
                          required
                          value={tournamentForm.woPolicy}
                          onChange={(value) =>
                            setTournamentForm((prev) => ({
                              ...prev,
                              woPolicy: value,
                            }))
                          }
                        />
                        <FieldInput
                          label="Protestos e evidencias"
                          required
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
                  )}

                  {configSection === 'premios' && (
                    <section className="space-y-4">
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-600">
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
                  )}

                  {configSection === 'comunicacao' && (
                    <section className="space-y-4">
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-600">
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
                    </section>
                  )}

                  {configSection === 'privacidade' && (
                    <section className="space-y-4">
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-slate-600">
                        Privacidade e controle
                      </p>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FieldSelect
                          label="Torneio publico ou privado"
                          required
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
                        Aceito as regras, conduta e requisitos do torneio.
                        <span className="ml-1 text-rose-500">*</span>
                      </label>
                    </section>
                  )}
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
                      disabled={savingTournament}
                      className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingTournament
                        ? 'Salvando...'
                        : editingIds
                          ? 'Salvar'
                          : 'Gerar link'}
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

const FieldLabel = ({
  label,
  required = false,
}: {
  label: string;
  required?: boolean;
}) => (
  <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-600">
    {label}
    {required && <span className="ml-1 text-rose-500">*</span>}
  </span>
);

const FieldInput = ({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  type?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2 text-sm font-semibold text-slate-600">
    <FieldLabel label={label} required={required} />
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
    />
  </label>
);

const FieldSelect = ({
  label,
  value,
  options,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  options: string[];
  required?: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2 text-sm font-semibold text-slate-600">
    <FieldLabel label={label} required={required} />
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
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
  required = false,
}: {
  label: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
}) => (
  <label className="space-y-2 text-sm font-semibold text-slate-600">
    <FieldLabel label={label} required={required} />
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      rows={4}
      className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
    />
  </label>
);

const TeamRegistration = ({
  registerCode,
  playerId,
  onBack,
}: {
  registerCode: string;
  playerId?: string;
  onBack: () => void;
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [tournamentName, setTournamentName] = useState<string | null>(null);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [savingTeam, setSavingTeam] = useState(false);
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
    if (!playerId) return;
    setTeamForm((prev) =>
      prev.managerUserId
        ? prev
        : {
            ...prev,
            managerUserId: playerId,
          },
    );
  }, [playerId]);

  useEffect(() => {
    const fetchTournament = async () => {
      if (!supabase) {
        setNotice('Supabase nao configurado.');
        setLoadingTournament(false);
        return;
      }

      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name')
        .eq('invite_code', registerCode)
        .single();

      if (error || !data) {
        setNotice(
          error?.message ?? 'Nao foi possivel localizar o torneio.',
        );
        setLoadingTournament(false);
        return;
      }

      setTournamentId(data.id);
      setTournamentName(data.name);
      setLoadingTournament(false);
    };

    void fetchTournament();
  }, [registerCode]);

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

  const handleSubmit = async () => {
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

    if (!tournamentId) {
      setNotice('Torneio nao encontrado.');
      return;
    }

    const requiredPlayers = teamForm.roster.slice(0, 5);
    const missingPlayers = requiredPlayers.some(
      (player) => !player.nickname.trim() || !player.steam.trim(),
    );
    if (missingPlayers) {
      setNotice('Preencha nickname e Steam dos 5 titulares.');
      return;
    }

    if (!supabase) {
      setNotice('Supabase nao configurado.');
      return;
    }

    setSavingTeam(true);
    const captainId =
      teamForm.managerUserId.trim() || playerId || null;

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamForm.teamName.trim(),
        tag: teamForm.teamTag.trim(),
        logo_url: null,
        manager_name: teamForm.managerName.trim(),
        manager_contact: teamForm.managerContact.trim(),
        manager_email: teamForm.managerEmail.trim(),
        captain_player_id: captainId || null,
        discord_team: teamForm.teamDiscord.trim(),
        availability: teamForm.availability.trim(),
        preferred_region: teamForm.preferredRegion.trim(),
      })
      .select('id')
      .single();

    if (teamError || !teamData) {
      setNotice(teamError?.message ?? 'Erro ao salvar equipe.');
      setSavingTeam(false);
      return;
    }

    const membersPayload = teamForm.roster
      .filter((player) => player.nickname.trim() || player.steam.trim())
      .map((player) => ({
        team_id: teamData.id,
        player_id: null,
        nickname: player.nickname.trim() || 'Jogador',
        steam_id64: player.steam.trim() || null,
        faceit_id: player.faceit.trim() || null,
        role: player.gameRole.trim() || null,
        is_sub: player.slot.toLowerCase().includes('reserva'),
        is_active: Boolean(player.nickname.trim()),
      }));

    if (membersPayload.length > 0) {
      const { error: membersError } = await supabase
        .from('team_members')
        .insert(membersPayload);
      if (membersError) {
        setNotice(membersError.message);
        setSavingTeam(false);
        return;
      }
    }

    const { error: registrationError } = await supabase
      .from('registrations')
      .insert({
        tournament_id: tournamentId,
        team_id: teamData.id,
        status: 'pending',
        locked_roster: false,
      });

    if (registrationError) {
      setNotice(registrationError.message);
      setSavingTeam(false);
      return;
    }

    setSavingTeam(false);
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
          <p className="mt-1 text-sm text-slate-400">
            {loadingTournament
              ? 'Carregando informacoes do torneio...'
              : tournamentName
                ? `Torneio: ${tournamentName}`
                : 'Torneio nao encontrado'}
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
            label="Nome do time"
            required
            value={teamForm.teamName}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, teamName: value }))
            }
          />
          <FieldInput
            label="Tag/abreviacao (3-5)"
            required
            value={teamForm.teamTag}
            onChange={(value) =>
              setTeamForm((prev) => ({ ...prev, teamTag: value }))
            }
          />
          <FieldInput
            label="Nome do responsavel"
            required
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
            label="Contato do responsavel (Discord)"
            required
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
          Confirmo que a equipe aceita as regras, anti-cheat e conduta do torneio.
          <span className="ml-1 text-rose-500">*</span>
        </label>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Envie a inscricao para o organizador revisar e aprovar.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={savingTeam || loadingTournament}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingTeam ? 'Enviando...' : 'Enviar inscricao'}
          </button>
        </div>
      </div>
    </div>
  );
};
