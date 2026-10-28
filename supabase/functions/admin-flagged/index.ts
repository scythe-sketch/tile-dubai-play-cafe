import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
// Admin only: this week's flagged runs with the player's decrypted instagram.
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
async function decrypt(value: string): Promise<string> {
  const m = /^enc:v1:([^:]+):(.+)$/.exec(value);
  if (!m) return value;
  const secret = Deno.env.get('CONTACT_ENCRYPTION_KEY')!;
  const keyBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const bytes = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  try { return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(m[1]) }, key, bytes(m[2]))); } catch { return '(unreadable)'; }
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: u, error: ue } = await admin.auth.getUser(auth.slice(7));
    if (ue || !u.user) return json({ error: 'unauthorized' }, 401);
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: u.user.id, _role: 'admin' });
    if (!isAdmin) return json({ error: 'forbidden' }, 403);
    const { data: week } = await admin.rpc('current_week_key');
    const { data: runs, error } = await admin.from('runs')
      .select('id,score,perfects,perfects_after_cap,tap_deviation,submitted_at,player_id,players(nickname,contact,banned)')
      .eq('week_key', week).eq('status', 'valid').eq('needs_review', true).eq('approved', false)
      .order('score', { ascending: false }).limit(200);
    if (error) throw error;
    const rows = await Promise.all((runs ?? []).map(async (r: Record<string, any>) => ({
      id: r.id, playerId: r.player_id, nickname: r.players?.nickname ?? '', banned: Boolean(r.players?.banned),
      contact: r.players?.contact ? await decrypt(r.players.contact) : '', score: r.score, perfects: r.perfects,
      perfectsAfterCap: r.perfects_after_cap, deviation: Math.round(Number(r.tap_deviation) * 10) / 10, at: r.submitted_at,
    })));
    return json({ rows });
  } catch { return json({ error: 'please_try_again' }, 500); }
});
