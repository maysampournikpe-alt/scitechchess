-- Optional cloud sync for ChessMastery. NOT USED by the app yet: today all progress lives in
-- the browser. This schema mirrors the local store (src/lib/store/store.ts) so that accounts
-- can be added later without redesigning anything.
--
-- Every table holds one user's private training data. Row-level security is enabled and forced
-- on all of them, and every policy is "the row belongs to the signed-in user". There are no
-- public tables. auth.uid() is wrapped in a sub-select so Postgres evaluates it once per query
-- instead of once per row.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  experience text not null check (experience in ('beginner','knowsMoves','casual','intermediate','tournament','advanced')),
  rating integer check (rating between 100 and 3500),
  rating_source text not null,
  goal text not null,
  goal_rating integer check (goal_rating between 400 and 3000),
  minutes_per_day integer not null check (minutes_per_day between 5 and 480),
  weaknesses text[] not null default '{}',
  preference text not null check (preference in ('exercises','short','videos','lessons','mix')),
  assessment_done_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per scored attempt. This log is the source of truth; skill states can be rebuilt from it.
create table public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null,
  item_id text not null,
  module text not null check (module in ('puzzle','calculation','opening','endgame','plan','quiz','vision','game','assessment')),
  skill text not null,
  concept text not null,
  difficulty integer not null,
  outcome text not null check (outcome in ('solo','assisted','failed')),
  hints smallint not null default 0 check (hints >= 0),
  ms integer not null default 0 check (ms >= 0),
  first_seen boolean not null
);
create index attempts_user_time on public.attempts (user_id, at desc);
create index attempts_user_concept on public.attempts (user_id, concept);

create table public.skill_states (
  user_id uuid not null references auth.users (id) on delete cascade,
  skill text not null,
  score real not null,
  rd real not null check (rd > 0),
  n integer not null default 0,
  last_at timestamptz,
  primary key (user_id, skill)
);

create table public.review_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  kind text not null check (kind in ('puzzle','opening','endgame','concept')),
  concept text not null,
  label text not null,
  href text not null check (href like '/%'), -- in-app links only
  due timestamptz not null,
  interval_days integer not null,
  ease real not null,
  reps integer not null default 0,
  lapses integer not null default 0,
  last_reviewed timestamptz,
  primary key (user_id, card_id)
);
-- "What is due for me now" is the hot query.
create index review_cards_user_due on public.review_cards (user_id, due);

create table public.games (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  played_at timestamptz not null,
  pgn text not null check (length(pgn) <= 200000),
  bot_level smallint not null check (bot_level between 1 and 9),
  color char(1) not null check (color in ('w','b')),
  result text not null check (result in ('win','draw','loss'))
);
create index games_user_time on public.games (user_id, played_at desc);

create table public.saved_positions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  fen text not null check (length(fen) <= 100),
  best_move text,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index saved_positions_user on public.saved_positions (user_id);

create table public.journal_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  body text not null check (length(body) <= 2000)
);
create index journal_entries_user on public.journal_entries (user_id, created_at desc);

-- Row-level security: owner-only, on every table.
do $$
declare t text;
begin
  foreach t in array array['profiles','attempts','skill_states','review_cards','games','saved_positions','journal_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_owner', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
