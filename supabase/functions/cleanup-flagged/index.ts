import { db, json } from '../_shared/common.ts';
// temporary one-off cleanup; deleted after use
Deno.serve(async req => {
  if (req.headers.get('x-nonce') !== '0a44f82520b3df2284b0f8843ad85ba4') return json({ error: 'no' }, 403);
  const c = db();
  const { data: week } = await c.rpc('current_week_key');
  const { data: runs } = await c.from('runs').select("id,player_id,score,perfects,needs_review").eq('week_key', week).eq('status', 'valid');
  const bad = (runs ?? []).filter(r => r.needs_review || (r.score > 30 && r.perfects / r.score > 0.6)).filter(r => r.score > 60);
  const ids = bad.map(r => r.id), players = [...new Set(bad.map(r => r.player_id))];
  if (ids.length) {
    await c.from('weekly_best').delete().in('run_id', ids);
    await c.from('runs').delete().in('id', ids);
  }
  for (const p of players) {
    const { data: rest } = await c.from('runs').select('id,score,submitted_at').eq('player_id', p).eq('week_key', week).eq('status', 'valid').or('needs_review.eq.false,approved.eq.true').order('score', { ascending: false }).limit(1);
    await c.from('weekly_best').delete().eq('player_id', p).eq('week_key', week);
    if (rest?.[0]) await c.from('weekly_best').insert({ player_id: p, week_key: week, score: rest[0].score, run_id: rest[0].id, achieved_at: rest[0].submitted_at });
  }
  return json({ removed: ids.length, players: players.length });
});
