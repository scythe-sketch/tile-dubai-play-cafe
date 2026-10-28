import { db, fail, ipHash, json, player, serve } from '../_shared/common.ts';
serve(async (req, body) => {
  const client = db();
  const owner = await player(client, body.token);
  if (!owner) return fail('not_registered');
  const now = Date.now();
  const { count, error } = await client.from('runs').select('id', { count: 'exact', head: true }).eq('player_id', owner.id).gte('started_at', new Date(now - 86400000).toISOString());
  if (error) throw error;
  const { data: recent, error: recentError } = await client.from('runs').select('id').eq('player_id', owner.id).gte('started_at', new Date(now - 3000).toISOString()).limit(1);
  if (recentError) throw recentError;
  if ((count ?? 0) >= 300 || recent?.length) return fail('rate_limited');
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const { data, error: insertError } = await client.from('runs').insert({ player_id: owner.id, seed, status: 'started', ip_hash: await ipHash(req) }).select('id').single();
  if (insertError) throw insertError;
  return json({ ok: true, runId: data.id, seed });
});
