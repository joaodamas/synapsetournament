-- Supabase schema init for tournaments, matches, and results.
-- Run in the Supabase SQL editor.

-- Reset (only objects from this script).
drop table if exists match_results cascade;
drop table if exists match_participants cascade;
drop table if exists matches cascade;
drop table if exists tournament_participants cascade;
drop table if exists participants cascade;
drop table if exists tournaments cascade;

drop type if exists match_outcome;
drop type if exists match_status;
drop type if exists participant_type;
drop type if exists tournament_format;

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type tournament_format as enum (
  'single_elimination',
  'double_elimination',
  'round_robin',
  'swiss'
);

create type participant_type as enum ('player', 'team');

create type match_status as enum (
  'scheduled',
  'in_progress',
  'completed',
  'canceled'
);

create type match_outcome as enum (
  'win',
  'loss',
  'draw',
  'bye',
  'forfeit'
);

-- Tables
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format tournament_format not null,
  game_name text not null,
  owner_id uuid references auth.users(id),
  max_participants int,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table participants (
  id uuid primary key default gen_random_uuid(),
  type participant_type not null,
  display_name text not null,
  owner_user_id uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tournament_participants (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  seed int,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  primary key (tournament_id, participant_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number int not null default 1,
  bracket_position int,
  status match_status not null default 'scheduled',
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  next_match_id uuid references matches(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table match_participants (
  match_id uuid not null references matches(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  slot smallint not null,
  seed int,
  score numeric not null default 0,
  outcome match_outcome,
  created_at timestamptz not null default now(),
  primary key (match_id, slot),
  unique (match_id, participant_id),
  check (slot > 0)
);

create table match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  participant_id uuid not null references participants(id) on delete cascade,
  metric_key text not null,
  metric_value_numeric numeric,
  metric_value_text text,
  segment int not null default 1,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (
    metric_value_numeric is not null
    or metric_value_text is not null
  ),
  unique (match_id, participant_id, metric_key, segment)
);

-- updated_at helper
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tournaments_updated_at
before update on tournaments
for each row execute function set_updated_at();

create trigger participants_updated_at
before update on participants
for each row execute function set_updated_at();

create trigger matches_updated_at
before update on matches
for each row execute function set_updated_at();

-- Indexes
create index matches_by_tournament_round on matches (tournament_id, round_number);
create index match_participants_by_participant on match_participants (participant_id);
create index match_results_by_match on match_results (match_id);
create index tournament_participants_by_tournament on tournament_participants (tournament_id);

-- Realtime: add tables if not already present.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournaments'
  ) then
    alter publication supabase_realtime add table tournaments;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table matches;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'match_results'
  ) then
    alter publication supabase_realtime add table match_results;
  end if;
end;
$$;
