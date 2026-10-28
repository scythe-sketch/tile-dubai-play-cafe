import { db, fail, ipHash, json, player, serve } from '../_shared/common.ts';
// A run can start before sign-up: without a token it is issued to nobody and
// claimed by the player who signs up and submits it (see finalize_run).
serve(async (req, body) => {
  const client = db();
  const ip_hash = await ipHash(req);
  const hasToken = body.token !== undefined && body.token !== null;
  const owner = hasToken ? await player(client, body.token) : null;
  if (hasToken && !owner) return fail('not_registered');
  const now = Date.now();
  const scope = owner ? { column: 'player_id', value: owner.id } : { column: 'ip_hash', value: ip_hash };
  const dayLimit = owner ? 300 : 600;
  const { count, error } = await client.from('runs').select('id', { count: 'exact', head: true }).eq(scope.column, scope.value).gte('started_at', new Date(now - 86400000).toISOString());
  if (error) throw error;
  const { data: recent, error: recentError } = await client.from('runs').select('id').eq(scope.column, scope.value).gte('started_at', new Date(now - 2000).toISOString()).limit(1);
  if (recentError) throw recentError;
  if ((count ?? 0) >= dayLimit || recent?.length) return fail('rate_limited');
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { data, error: insertError } = await client.from('runs').insert({ player_id: owner?.id ?? null, seed, status: 'started', ip_hash }).select('id').single();
  if (insertError) throw insertError;
  return json({ ok: true, runId: data.id, seed });
});
