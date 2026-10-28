import { db, fail, json, player, serve } from '../_shared/common.ts';
import { isValidTapTicks, replay, TICKS_PER_SECOND } from '../_shared/tileStackSim.ts';
serve(async (_req, body) => {
  if (Object.hasOwn(body, 'score')) return fail('score_not_allowed', 400);
  if (typeof body.runId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.runId)) return fail('invalid_run', 400);
  if (!isValidTapTicks(body.tapTicks)) return fail('invalid_taps', 400);
  const taps = body.tapTicks;
  // Bound replay CPU before advancing: no valid 45-minute run can exceed this.
  if (taps.some(t => !Number.isSafeInteger(t) || t > (45 * 60 + 2) * TICKS_PER_SECOND)) return fail('invalid_taps', 400);
  const client = db();
  const owner = await player(client, body.token);
  if (!owner) return fail('not_registered');
  const { data: run, error } = await client.from('runs').select('player_id,seed,status,started_at').eq('id', body.runId).maybeSingle();
  if (error) throw error;
  if (!run) return fail('unknown_run');
  // an unclaimed run (played before sign-up) is claimed by this player in finalize_run
  if (run.player_id !== null && run.player_id !== owner.id) return fail('wrong_player');
  if (run.status !== 'started') return fail('already_submitted');
  const seed = Number(run.seed);
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('invalid seed');
  const result = replay(seed, taps);
  const intervals = taps.slice(1).map((t, i) => t - taps[i]);
  const mean = intervals.reduce((a, b) => a + b, 0) / (intervals.length || 1);
  const deviation = Math.sqrt(intervals.reduce((sum, t) => sum + (t - mean) ** 2, 0) / (intervals.length || 1));
  const needsReview = (result.score > 40 && result.perfects / result.score > 0.9) || (taps.length > 15 && deviation < 3);
  const { data, error: finalizeError } = await client.rpc('finalize_run', {
    p_run_id: body.runId, p_player_id: owner.id, p_tap_ticks: taps,
    p_score: result.score, p_total_ticks: result.totalTicks, p_perfects: result.perfects,
    p_max_combo: result.maxCombo, p_needs_review: needsReview,
  });
  if (finalizeError) throw finalizeError;
  if (!data?.ok) return fail(typeof data?.reason === 'string' ? data.reason : 'rejected');
  return json({ ok: true, score: data.score, best: data.best, rank: data.rank, isFirst: data.is_first, newBest: data.new_best });
});
