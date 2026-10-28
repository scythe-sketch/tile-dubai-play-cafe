-- tile stack: players, runs and weekly bests, with secure read paths.
-- the browser never writes to these tables: only the edge functions (service
-- role) do, and the leaderboard is exposed through a definer function that
-- returns nicknames and scores only.

create table public.players (
  id uuid primary key default gen_random_uuid(),
  device_token_hash text not null unique,
  nickname text not null,
  contact text not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  banned boolean not null default false
);

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  seed bigint not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  tap_ticks integer[] not null default '{}',
  score integer not null default 0,
  total_ticks integer not null default 0,
  perfects integer not null default 0,
  max_combo integer not null default 0,
  week_key text not null default '',
  status text not null default 'started' check (status in ('started', 'valid', 'rejected')),
  reject_reason text,
  needs_review boolean not null default false,
  ip_hash text
);

create table public.weekly_best (
  player_id uuid not null references public.players (id) on delete cascade,
  week_key text not null,
  score integer not null,
  run_id uuid,
  achieved_at timestamptz not null default now(),
  primary key (player_id, week_key)
);

create index runs_player_started_idx on public.runs (player_id, started_at desc);
create index runs_ip_started_idx on public.runs (ip_hash, started_at desc);
create index weekly_best_week_idx on public.weekly_best (week_key, score desc, achieved_at asc);
create index players_ip_created_idx on public.players (ip_hash, created_at desc);
create unique index players_nickname_key on public.players (lower(nickname)) where banned = false;

grant all on public.players to service_role;
grant all on public.runs to service_role;
grant all on public.weekly_best to service_role;

alter table public.players enable row level security;
alter table public.runs enable row level security;
alter table public.weekly_best enable row level security;

-- weeks run monday 00:00 to sunday 23:59:59 in dubai time (utc+4).
create or replace function public.current_week_key()
returns text language sql stable security definer set search_path = '' as
$$ select to_char(now() + interval '4 hours', 'IYYY-"W"IW') $$;

create or replace function public.previous_week_key()
returns text language sql stable security definer set search_path = '' as
$$ select to_char(now() + interval '4 hours' - interval '7 days', 'IYYY-"W"IW') $$;

-- the only public read path: nickname, score, rank. never ids or contact.
create or replace function public.weekly_leaderboard()
returns table (player_rank bigint, nickname text, score integer, achieved_at timestamptz)
language sql stable security definer set search_path = '' as
$$
  select row_number() over (order by wb.score desc, wb.achieved_at asc)::bigint,
         p.nickname, wb.score, wb.achieved_at
  from public.weekly_best wb
  join public.players p on p.id = wb.player_id
  where wb.week_key = public.current_week_key()
    and p.banned = false
  order by wb.score desc, wb.achieved_at asc
  limit 25
$$;

create or replace function public.last_week_winner()
returns table (week_key text, nickname text, score integer)
language sql stable security definer set search_path = '' as
$$
  select wb.week_key, p.nickname, wb.score
  from public.weekly_best wb
  join public.players p on p.id = wb.player_id
  where wb.week_key = public.previous_week_key()
    and p.banned = false
  order by wb.score desc, wb.achieved_at asc
  limit 1
$$;

-- atomic write path for a finished run: re-checks ownership, single use, age
-- and elapsed wall-clock time, then records the server-computed score.
create or replace function public.finalize_run(
  p_run_id uuid,
  p_player_id uuid,
  p_tap_ticks integer[],
  p_score integer,
  p_total_ticks integer,
  p_perfects integer,
  p_max_combo integer,
  p_needs_review boolean
) returns jsonb
language plpgsql security definer set search_path = '' as
$$
declare
  v_run public.runs%rowtype;
  v_week text;
  v_best integer;
  v_achieved timestamptz;
  v_rank bigint;
  v_elapsed interval;
begin
  select * into v_run from public.runs where id = p_run_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown_run');
  end if;
  if v_run.player_id <> p_player_id then
    return jsonb_build_object('ok', false, 'reason', 'wrong_player');
  end if;
  if v_run.status <> 'started' then
    return jsonb_build_object('ok', false, 'reason', 'already_submitted');
  end if;

  v_elapsed := now() - v_run.started_at;
  if v_elapsed > interval '45 minutes' then
    update public.runs
       set status = 'rejected', reject_reason = 'too_old', submitted_at = now(), tap_ticks = p_tap_ticks
     where id = p_run_id;
    return jsonb_build_object('ok', false, 'reason', 'too_old');
  end if;
  if v_elapsed < (p_total_ticks::numeric / 60.0) * interval '1 second' - interval '2 seconds' then
    update public.runs
       set status = 'rejected', reject_reason = 'impossible_time', submitted_at = now(), tap_ticks = p_tap_ticks
     where id = p_run_id;
    return jsonb_build_object('ok', false, 'reason', 'impossible_time');
  end if;

  v_week := public.current_week_key();

  update public.runs
     set tap_ticks = p_tap_ticks,
         score = p_score,
         total_ticks = p_total_ticks,
         perfects = p_perfects,
         max_combo = p_max_combo,
         status = 'valid',
         submitted_at = now(),
         needs_review = p_needs_review,
         week_key = v_week
   where id = p_run_id;

  insert into public.weekly_best as wb (player_id, week_key, score, run_id, achieved_at)
  values (p_player_id, v_week, p_score, p_run_id, now())
  on conflict (player_id, week_key) do update
     set score = excluded.score, run_id = excluded.run_id, achieved_at = excluded.achieved_at
   where excluded.score > wb.score;

  select w.score, w.achieved_at into v_best, v_achieved
    from public.weekly_best w
   where w.player_id = p_player_id and w.week_key = v_week;

  select count(*) + 1 into v_rank
    from public.weekly_best wb
    join public.players p on p.id = wb.player_id
   where wb.week_key = v_week
     and p.banned = false
     and (wb.score > v_best or (wb.score = v_best and wb.achieved_at < v_achieved));

  return jsonb_build_object(
    'ok', true,
    'score', p_score,
    'week_key', v_week,
    'rank', v_rank,
    'is_first', v_rank = 1,
    'new_best', v_best = p_score
  );
end;
$$;

-- admin only: top 5 per week with contact details, so the winner can be found
-- and verified before the prize is handed over.
create or replace view public.weekly_winners_admin as
select week_key, nickname, contact, score, run_id, needs_review, rank_no
from (
  select wb.week_key,
         p.nickname,
         p.contact,
         wb.score,
         wb.run_id,
         r.needs_review,
         row_number() over (partition by wb.week_key order by wb.score desc, wb.achieved_at asc) as rank_no
  from public.weekly_best wb
  join public.players p on p.id = wb.player_id
  join public.runs r on r.id = wb.run_id
) ranked
where rank_no <= 5;

revoke all on public.weekly_winners_admin from public, anon, authenticated;
grant select on public.weekly_winners_admin to service_role;

revoke all on function public.current_week_key() from public, anon, authenticated;
revoke all on function public.previous_week_key() from public, anon, authenticated;
revoke all on function public.finalize_run(uuid, uuid, integer[], integer, integer, integer, integer, boolean)
  from public, anon, authenticated;

grant execute on function public.current_week_key() to service_role;
grant execute on function public.previous_week_key() to service_role;
grant execute on function public.finalize_run(uuid, uuid, integer[], integer, integer, integer, integer, boolean) to service_role;
grant execute on function public.weekly_leaderboard() to anon, authenticated;
grant execute on function public.last_week_winner() to anon, authenticated;
