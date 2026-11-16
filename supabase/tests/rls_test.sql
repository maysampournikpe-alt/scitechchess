-- Run against a scratch database: psql -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Stubs the parts of Supabase the migration needs (auth.users, auth.uid(), the two roles),
-- applies the migration, and checks that one user can never read or write another's rows.
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon nologin;
create role authenticated nologin;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

\i supabase/migrations/0001_training_sync.sql

insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
grant usage on all sequences in schema public to authenticated;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into public.attempts (user_id, at, item_id, module, skill, concept, difficulty, outcome, first_seen)
  values ('00000000-0000-0000-0000-00000000000a', now(), 'puzzle:x', 'puzzle', 'tactics', 'theme:fork', 1200, 'solo', true);
insert into public.journal_entries (user_id, body) values ('00000000-0000-0000-0000-00000000000a', 'mine');

-- A writes a row claiming to be B: must be refused.
do $$ begin
  insert into public.journal_entries (user_id, body) values ('00000000-0000-0000-0000-00000000000b', 'forged');
  raise exception 'FAIL: user A inserted a row for user B';
exception when insufficient_privilege then raise notice 'ok: forged insert refused';
end $$;

-- B sees nothing of A's, and cannot change or delete it.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ declare n int; begin
  select count(*) into n from public.attempts; if n <> 0 then raise exception 'FAIL: B can read A''s attempts'; end if;
  update public.journal_entries set body = 'hacked'; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL: B updated A''s journal'; end if;
  delete from public.attempts; get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL: B deleted A''s attempts'; end if;
  raise notice 'ok: user B cannot read, update or delete user A''s rows';
end $$;

-- Signed out: nothing at all.
reset role;
set role anon;
do $$ begin
  perform 1 from public.attempts;
  raise exception 'FAIL: anonymous role can read attempts';
exception when insufficient_privilege then raise notice 'ok: anonymous access refused';
end $$;

-- A still sees exactly its own rows.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ declare n int; begin
  select count(*) into n from public.journal_entries where body = 'mine'; if n <> 1 then raise exception 'FAIL: A lost its own row'; end if;
  raise notice 'ok: user A still sees its own row';
end $$;
