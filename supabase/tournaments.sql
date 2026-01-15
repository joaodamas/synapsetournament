-- Tournament system schema (v1). Run in Supabase SQL editor.

create extension if not exists "pgcrypto";

alter type tournament_format add value if not exists 'round_robin_single';
alter type tournament_format add value if not exists 'round_robin_double';
alter type tournament_format add value if not exists 'gsl';
alter type tournament_format add value if not exists 'league_playoffs';
alter type tournament_format add value if not exists 'lcq';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'tournament_visibility') then
    create type tournament_visibility as enum ('publico', 'privado');
  end if;

  if not exists (select 1 from pg_type where typname = 'tournament_status') then
    create type tournament_status as enum (
      'draft',
      'published',
      'checkin_open',
      'live',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'tournament_format_type') then
    create type tournament_format_type as enum (
      'single_elimination',
      'double_elimination',
      'round_robin_single',
      'round_robin_double',
      'swiss',
      'gsl',
      'league_playoffs',
      'lcq'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'registration_status') then
    create type registration_status as enum (
      'pending',
      'approved',
      'paid',
      'checked_in',
      'rejected',
      'dropped'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'match_result_mode') then
    create type match_result_mode as enum (
      'team_report',
      'admin_validate',
      'auto'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'veto_action_type') then
    create type veto_action_type as enum ('ban', 'pick', 'decider', 'side');
  end if;
end $$;

create table if not exists rulesets (
  id uuid primary key default gen_random_uuid(),
  late_tolerance_min int,
  wo_after_min int,
  wo_score_rule text,
  pause_policy_json jsonb not null default '{}'::jsonb,
  substitution_policy_json jsonb not null default '{}'::jsonb,
  anti_cheat_policy_json jsonb not null default '{}'::jsonb,
  protest_policy_json jsonb not null default '{}'::jsonb,
  result_reporting_mode match_result_mode not null default 'team_report',
  created_at timestamptz not null default now()
);

create table if not exists map_pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  maps_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tournament_formats (
  id uuid primary key default gen_random_uuid(),
  format_type tournament_format_type not null,
  phases_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.tournaments
  add column if not exists description_short text,
  add column if not exists description_full text,
  add column if not exists timezone text,
  add column if not exists banner_url text,
  add column if not exists visibility tournament_visibility not null default 'publico',
  add column if not exists invite_code text,
  add column if not exists status tournament_status not null default 'draft',
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz,
  add column if not exists max_teams int,
  add column if not exists seeding_mode text,
  add column if not exists checkin_enabled boolean not null default false,
  add column if not exists checkin_open_minutes_before int,
  add column if not exists checkin_close_minutes_before int,
  add column if not exists ruleset_id uuid references rulesets(id) on delete set null,
  add column if not exists map_pool_id uuid references map_pools(id) on delete set null,
  add column if not exists format_id uuid references tournament_formats(id) on delete set null,
  add column if not exists format_type tournament_format_type,
  add column if not exists created_by_player_id uuid references players(id),
  add column if not exists organizer_name text,
  add column if not exists organizer_contact text,
  add column if not exists organizer_email text,
  add column if not exists discord_link text,
  add column if not exists stream_link text,
  add column if not exists rules_link text,
  add column if not exists official_channel text,
  add column if not exists admin_contacts text,
  add column if not exists languages text,
  add column if not exists location text,
  add column if not exists server_region text,
  add column if not exists map_veto_method text,
  add column if not exists delay_policy text,
  add column if not exists wo_policy text,
  add column if not exists pause_policy text,
  add column if not exists substitutions_policy text,
  add column if not exists anti_cheat text,
  add column if not exists protest_policy text,
  add column if not exists prize_pool text,
  add column if not exists entry_fee text,
  add column if not exists refund_policy text,
  add column if not exists approval_required boolean not null default false,
  add column if not exists notes text;

create index if not exists tournaments_by_creator on public.tournaments (created_by_player_id);
create index if not exists tournaments_by_status on public.tournaments (status);
create index if not exists tournaments_by_invite on public.tournaments (invite_code);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tag text not null,
  logo_url text,
  manager_name text,
  manager_contact text,
  manager_email text,
  captain_player_id uuid references players(id),
  discord_team text,
  availability text,
  preferred_region text,
  created_at timestamptz not null default now()
);

create unique index if not exists teams_tag_unique on teams (lower(tag));

alter table public.teams
  add column if not exists manager_name text,
  add column if not exists manager_contact text,
  add column if not exists manager_email text,
  add column if not exists availability text,
  add column if not exists preferred_region text;

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  nickname text not null,
  steam_id64 text,
  faceit_id text,
  role text,
  is_sub boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists team_members_by_team on team_members (team_id);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  status registration_status not null default 'pending',
  paid_at timestamptz,
  checked_in_at timestamptz,
  locked_roster boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create index if not exists registrations_by_tournament on registrations (tournament_id);

alter type match_status add value if not exists 'live';
alter type match_status add value if not exists 'finished';
alter type match_status add value if not exists 'wo';
alter type match_status add value if not exists 'disputed';

alter table public.matches
  add column if not exists phase_key text,
  add column if not exists bracket text,
  add column if not exists team_a_id uuid references teams(id),
  add column if not exists team_b_id uuid references teams(id),
  add column if not exists server_region text,
  add column if not exists winner_team_id uuid references teams(id),
  add column if not exists score_a int,
  add column if not exists score_b int;

create index if not exists matches_by_tournament_phase on public.matches (tournament_id, phase_key);

create table if not exists match_maps (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  map_name text not null,
  order_index int not null default 1,
  score_a int,
  score_b int,
  winner_team_id uuid references teams(id),
  created_at timestamptz not null default now()
);

create table if not exists veto_actions (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  action_index int not null default 1,
  team_id uuid references teams(id),
  action_type veto_action_type not null,
  map_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  opened_by_player_id uuid references players(id),
  reason text,
  evidence_urls_json jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  resolved_by_player_id uuid references players(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  registration_id uuid references registrations(id) on delete cascade,
  amount numeric not null default 0,
  method text,
  status text not null default 'pending',
  provider_ref text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
