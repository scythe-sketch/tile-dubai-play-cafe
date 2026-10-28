import { db, json } from '../_shared/common.ts';
// temporary: removes test players; deleted after use
Deno.serve(async req => {
  if (req.headers.get('x-nonce') !== '45608c6e40d490da1f7fa0186aba86b8') return json({ error: 'no' }, 403);
  const c = db();
  const { data: ps } = await c.from('players').select('id').ilike('nickname', 'qa check%');
  const ids = (ps ?? []).map(p => p.id);
  if (ids.length) { await c.from('weekly_best').delete().in('player_id', ids); await c.from('runs').delete().in('player_id', ids); await c.from('players').delete().in('id', ids); }
  return json({ removed: ids.length });
});
