import { db, fail, json, player, serve } from '../_shared/common.ts';
import { applyPace, generateTileParams, needsReview, replay, tapDeviation, TICKS_PER_SECOND } from '../_shared/tileStackSim.ts';

// Every tap is sent live. The server keeps its own copy of the run, checks that
// taps never arrive faster than real time, and reveals one more tile per tap.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TICK = 45 * 60 * TICKS_PER_SECOND;

serve(async (_req, body) => {
  if (Object.hasOwn(body, 'score') || Object.hasOwn(body, 'tapTicks')) return fail('not_allowed', 400);
  const { runId, tick, event = 'tap' } = body as { runId?: unknown; tick?: unknown; event?: unknown };
  if (typeof runId !== 'string' || !UUID.test(runId)) return fail('invalid_run', 400);
  if (!Number.isSafeInteger(tick) || (tick as number) < 0 || (tick as number) > MAX_TICK) return fail('invalid_tick', 400);
  if (event !== 'tap' && event !== 'pause' && event !== 'resume') return fail('invalid_event', 400);
  const t = tick as number;
  const client = db();
  const owner = body.token ? await player(client, body.token) : null;
  const { data: run, error } = await client.from('runs')
    .select('id,player_id,seed,status,tap_ticks,tap_ms,server_start_ms,paused_ms,pause_count,paused_at_ms,score')
    .eq('id', runId).maybeSingle();
  if (error) throw error;
  if (!run) return fail('unknown_run');
  if (run.player_id && run.player_id !== owner?.id) return fail('wrong_player');
  const taps: number[] = run.tap_ticks ?? [];
  const tapMs: number[] = (run.tap_ms ?? []).map(Number);
  const seed = Number(run.seed);
  const now = Date.now();

  // a retried request for a tap we already stored gets the same answer
  if (event === 'tap' && taps.length && taps[taps.length - 1] === t) return respond(client, run.id, seed, taps, owner?.id ?? run.player_id, run.status);
  if (run.status !== 'started') return fail(run.status === 'rejected' ? 'rejected' : 'already_finished');

  const reject = async (reason: string) => {
    await client.from('runs').update({ status: 'rejected', reject_reason: reason, submitted_at: new Date().toISOString() }).eq('id', run.id);
    return fail('rejected');
  };

  if (tapMs.filter(ms => now - ms < 1000).length >= 20) return fail('rate_limited');

  const pace = applyPace({
    serverStartMs: run.server_start_ms === null ? null : Number(run.server_start_ms),
    pausedMs: Number(run.paused_ms ?? 0), pauseCount: run.pause_count ?? 0,
    pausedAtMs: run.paused_at_ms === null ? null : Number(run.paused_at_ms),
    lastTick: taps.length ? taps[taps.length - 1] : -Infinity, tapCount: taps.length,
  }, event, t, now);
  if (!pace.ok) return reject(pace.reason);
  const p = pace.state;
  const paceCols = { server_start_ms: p.serverStartMs, paused_ms: p.pausedMs, pause_count: p.pauseCount, paused_at_ms: p.pausedAtMs };
  if (event !== 'tap') {
    await client.from('runs').update(paceCols).eq('id', run.id).eq('status', 'started');
    return json({ ok: true });
  }

  const nextTaps = [...taps, t];
  const params = generateTileParams(seed, nextTaps.length + 2);
  const result = replay(params, nextTaps);
  const update: Record<string, unknown> = {
    tap_ticks: nextTaps, tap_ms: [...tapMs, now], ...paceCols,
  };
  if (result.over) Object.assign(update, {
    status: 'complete', score: result.score, total_ticks: result.totalTicks, perfects: result.perfects,
    max_combo: result.maxCombo, perfects_after_cap: result.perfectsAfterCap,
    tap_deviation: tapDeviation(nextTaps), needs_review: needsReview(result, nextTaps),
  });
  // optimistic lock: only one tap can extend a given tap list
  const { data: saved, error: saveError } = await client.from('runs').update(update)
    .eq('id', run.id).eq('status', 'started').eq('tap_ticks', `{${taps.join(',')}}`).select('id');
  if (saveError) throw saveError;
  if (!saved?.length) return fail('busy');
  return respond(client, run.id, seed, nextTaps, owner?.id ?? run.player_id, result.over ? 'complete' : 'started');
});

async function respond(client: ReturnType<typeof db>, runId: string, seed: number, taps: number[], playerId: string | null, status: string) {
  const params = generateTileParams(seed, taps.length + 2);
  const result = replay(params, taps);
  if (!result.over) return json({ ok: true, over: false, index: taps.length + 1, tile: params[taps.length + 1] });
  if (!playerId) return json({ ok: true, over: true, score: result.score, saved: false });
  if (status === 'complete') {
    const { data, error } = await client.rpc('finalize_live_run', { p_run_id: runId, p_player_id: playerId, p_needs_review: false });
    if (error) throw error;
    if (data?.ok) return json({ ok: true, over: true, saved: true, score: data.score, best: data.best, rank: data.rank, isFirst: data.is_first, newBest: data.new_best, pending: data.pending });
  }
  return json({ ok: true, over: true, score: result.score, saved: false });
}
