-- Supabase schema init for tournaments, matches, and results.
-- Run in the Supabase SQL editor.

-- Reset (only objects from this script).
drop view if exists leaderboard cascade;
drop function if exists increment_elo(uuid, int);
drop table if exists match_results cascade;
drop table if exists match_participants cascade;
drop table if exists matches cascade;
drop table if exists tournament_participants cascade;
drop table if exists participants cascade;
drop table if exists match_stats cascade;
drop table if exists mix_participants cascade;
drop table if exists mixes cascade;
drop table if exists players cascade;
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

create table players (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  steam_id text not null unique,
  faceit_level int not null default 0,
  gc_level int not null default 0,
  avatar_url text,
  gc_profile_url text,
  faceit_profile_url text,
  elo_interno int not null default 1000,
  created_at timestamptz not null default now()
);

create table mixes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references players(id) on delete set null,
  status text not null default 'waiting',
  banned_maps text[] not null default '{}'::text[],
  final_map text,
  score_a int not null default 0,
  score_b int not null default 0,
  team_a uuid[] not null default '{}'::uuid[],
  team_b uuid[] not null default '{}'::uuid[],
  server_ip text,
  created_at timestamptz not null default now()
);

create table mix_participants (
  mix_id uuid not null references mixes(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (mix_id, player_id)
);

create table match_stats (
  id uuid primary key default gen_random_uuid(),
  mix_id uuid not null references mixes(id) on delete cascade,
  player_id uuid references players(id) on delete set null,
  nickname text not null,
  kills int not null default 0,
  assists int not null default 0,
  deaths int not null default 0,
  adr numeric not null default 0,
  kdr numeric not null default 0,
  is_mvp boolean not null default false,
  created_at timestamptz not null default now()
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
create index mix_participants_by_mix on mix_participants (mix_id);
create index mix_participants_by_player on mix_participants (player_id);
create index match_stats_by_mix on match_stats (mix_id);
create index match_stats_by_player on match_stats (player_id);

create or replace view leaderboard as
select
  row_number() over (
    order by elo_interno desc, gc_level desc, faceit_level desc, nickname asc
  ) as posicao,
  id as player_id,
  nickname,
  avatar_url,
  faceit_level,
  gc_level,
  elo_interno
from players;

create or replace function increment_elo(player_id uuid, amount int)
returns int
language plpgsql
as $$
declare new_elo int;
begin
  update players
  set elo_interno = coalesce(elo_interno, 0) + amount
  where id = player_id
  returning elo_interno into new_elo;

  return coalesce(new_elo, 0);
end;
$$;

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

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mixes'
  ) then
    alter publication supabase_realtime add table mixes;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mix_participants'
  ) then
    alter publication supabase_realtime add table mix_participants;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime add table players;
  end if;
end;
$$;
