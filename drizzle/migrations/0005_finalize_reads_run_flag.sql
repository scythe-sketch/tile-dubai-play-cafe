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
  v_flag := p_needs_review OR v_run.needs_review OR (coalesce(v_prior, 0) > 0 AND v_run.score > v_prior * 2.5);

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
GRANT EXECUTE ON FUNCTION public.current_week_key() TO service_role;