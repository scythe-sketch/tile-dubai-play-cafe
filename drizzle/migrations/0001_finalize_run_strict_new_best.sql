-- a tied best is not a new best: report new_best only when the run strictly
-- beat the player's earlier best for the week.
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
  v_prior integer;
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

  select w.score into v_prior
    from public.weekly_best w
   where w.player_id = p_player_id and w.week_key = v_week;

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
    'new_best', p_score > coalesce(v_prior, -1)
  );
end;
$$;

revoke all on function public.finalize_run(uuid, uuid, integer[], integer, integer, integer, integer, boolean)
  from public, anon, authenticated;
grant execute on function public.finalize_run(uuid, uuid, integer[], integer, integer, integer, integer, boolean) to service_role;