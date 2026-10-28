ALTER TABLE public.runs
  ADD COLUMN approved boolean NOT NULL DEFAULT false,
  ADD COLUMN tap_ms bigint[] NOT NULL DEFAULT '{}',
  ADD COLUMN server_start_ms bigint,
  ADD COLUMN paused_ms bigint NOT NULL DEFAULT 0,
  ADD COLUMN pause_count integer NOT NULL DEFAULT 0,
  ADD COLUMN paused_at_ms bigint,
  ADD COLUMN perfects_after_cap integer NOT NULL DEFAULT 0,
  ADD COLUMN tap_deviation real NOT NULL DEFAULT 0;

-- finalise a run whose taps were all received live by the tap function (status 'complete').
CREATE OR REPLACE FUNCTION public.finalize_live_run(p_run_id uuid, p_player_id uuid, p_needs_review boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_run public.runs%rowtype;
  v_week text;
  v_prior integer;
  v_best integer;
  v_achieved timestamptz;
  v_rank bigint;
  v_flag boolean;
BEGIN
  SELECT * INTO v_run FROM public.runs WHERE id = p_run_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'unknown_run'); END IF;
  IF v_run.player_id IS NOT NULL AND v_run.player_id <> p_player_id THEN RETURN jsonb_build_object('ok', false, 'reason', 'wrong_player'); END IF;
  IF v_run.status <> 'complete' THEN
    RETURN jsonb_build_object('ok', false, 'reason', CASE WHEN v_run.status = 'started' THEN 'not_finished' ELSE 'already_submitted' END);
  END IF;
  IF now() - v_run.started_at > interval '24 hours' THEN
    UPDATE public.runs SET status = 'rejected', reject_reason = 'too_old' WHERE id = p_run_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'too_old');
  END IF;

  v_week := public.current_week_key();
  SELECT w.score INTO v_prior FROM public.weekly_best w WHERE w.player_id = p_player_id AND w.week_key = v_week;
  v_flag := p_needs_review OR (coalesce(v_prior, 0) > 0 AND v_run.score > v_prior * 2.5);

  UPDATE public.runs SET player_id = p_player_id, status = 'valid', submitted_at = now(), needs_review = v_flag, week_key = v_week
   WHERE id = p_run_id;

  IF NOT v_flag THEN
    INSERT INTO public.weekly_best AS wb (player_id, week_key, score, run_id, achieved_at)
    VALUES (p_player_id, v_week, v_run.score, p_run_id, now())
    ON CONFLICT (player_id, week_key) DO UPDATE
       SET score = excluded.score, run_id = excluded.run_id, achieved_at = excluded.achieved_at
     WHERE excluded.score > wb.score;
  END IF;

  SELECT w.score, w.achieved_at INTO v_best, v_achieved FROM public.weekly_best w WHERE w.player_id = p_player_id AND w.week_key = v_week;
  IF v_best IS NOT NULL THEN
    SELECT count(*) + 1 INTO v_rank FROM public.weekly_best wb JOIN public.players p ON p.id = wb.player_id
     WHERE wb.week_key = v_week AND p.banned = false
       AND (wb.score > v_best OR (wb.score = v_best AND wb.achieved_at < v_achieved));
  END IF;

  RETURN jsonb_build_object('ok', true, 'score', v_run.score, 'best', coalesce(v_best, 0), 'rank', coalesce(v_rank, 0),
    'is_first', v_rank = 1, 'new_best', NOT v_flag AND v_run.score > coalesce(v_prior, -1), 'pending', v_flag AND v_run.score > coalesce(v_best, -1));
END $$;
REVOKE ALL ON FUNCTION public.finalize_live_run(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_live_run(uuid, uuid, boolean) TO service_role;

-- the old list-of-taps path is retired.
REVOKE ALL ON FUNCTION public.finalize_run(uuid, uuid, integer[], integer, integer, integer, integer, boolean) FROM service_role;
COMMENT ON FUNCTION public.finalize_run(uuid, uuid, integer[], integer, integer, integer, integer, boolean) IS 'DEPRECATED: replaced by finalize_live_run';

-- admin: approve a flagged run so it can count.
CREATE OR REPLACE FUNCTION public.admin_approve_run(p_run_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_run public.runs%rowtype;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT * INTO v_run FROM public.runs WHERE id = p_run_id AND status = 'valid' FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  UPDATE public.runs SET approved = true WHERE id = p_run_id;
  INSERT INTO public.weekly_best AS wb (player_id, week_key, score, run_id, achieved_at)
  VALUES (v_run.player_id, v_run.week_key, v_run.score, v_run.id, coalesce(v_run.submitted_at, now()))
  ON CONFLICT (player_id, week_key) DO UPDATE
     SET score = excluded.score, run_id = excluded.run_id, achieved_at = excluded.achieved_at
   WHERE excluded.score > wb.score;
END $$;
REVOKE ALL ON FUNCTION public.admin_approve_run(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_run(uuid) TO authenticated;

-- leaderboards only read runs that are clean or approved (belt and braces on top of weekly_best).
CREATE OR REPLACE FUNCTION public.weekly_leaderboard()
RETURNS TABLE (player_rank bigint, nickname text, score integer, achieved_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT row_number() OVER (ORDER BY wb.score DESC, wb.achieved_at ASC)::bigint, p.nickname, wb.score, wb.achieved_at
  FROM public.weekly_best wb
  JOIN public.players p ON p.id = wb.player_id
  LEFT JOIN public.runs r ON r.id = wb.run_id
  WHERE wb.week_key = public.current_week_key() AND p.banned = false
    AND (r.id IS NULL OR r.needs_review = false OR r.approved = true)
  ORDER BY wb.score DESC, wb.achieved_at ASC
  LIMIT 25
$$;
CREATE OR REPLACE FUNCTION public.last_week_winner()
RETURNS TABLE (week_key text, nickname text, score integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT wb.week_key, p.nickname, wb.score
  FROM public.weekly_best wb
  JOIN public.players p ON p.id = wb.player_id
  LEFT JOIN public.runs r ON r.id = wb.run_id
  WHERE wb.week_key = public.previous_week_key() AND p.banned = false
    AND (r.id IS NULL OR r.needs_review = false OR r.approved = true)
  ORDER BY wb.score DESC, wb.achieved_at ASC
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.last_week_winner() TO anon, authenticated;