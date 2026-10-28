import { db, fail, json, player, serve } from '../_shared/common.ts';
// Only finalises a run whose taps were all received live by the tap function
// (e.g. a round played before sign-up). It never accepts taps or a score.
serve(async (_req, body) => {
  if (Object.hasOwn(body, 'score') || Object.hasOwn(body, 'tapTicks')) return fail('not_allowed', 400);
  if (typeof body.runId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.runId)) return fail('invalid_run', 400);
  const client = db();
  const owner = await player(client, body.token);
  if (!owner) return fail('not_registered');
  const { data, error } = await client.rpc('finalize_live_run', { p_run_id: body.runId, p_player_id: owner.id, p_needs_review: false });
  if (error) throw error;
  if (!data?.ok) return fail(typeof data?.reason === 'string' ? data.reason : 'rejected');
  return json({ ok: true, score: data.score, best: data.best, rank: data.rank, isFirst: data.is_first, newBest: data.new_best, pending: data.pending });
});
