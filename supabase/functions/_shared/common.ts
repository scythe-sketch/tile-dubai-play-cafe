import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

export const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export const fail = (reason: string, status = 200) => json({ ok: false, reason }, status);
export async function sha256(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), b => b.toString(16).padStart(2, '0')).join('');
}
export async function ipHash(req: Request) {
  return (await sha256(req.headers.get('cf-connecting-ip')?.trim() || req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown')).slice(0, 32);
}
export async function player(client: ReturnType<typeof db>, token: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { data, error } = await client.from('players').select('id,banned').eq('device_token_hash', await sha256(token)).maybeSingle();
  if (error) throw error;
  return data && !data.banned ? data : null;
}
export function serve(handler: (req: Request, body: Record<string, unknown>) => Promise<Response>) {
  Deno.serve(async req => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (req.method !== 'POST') return fail('method_not_allowed', 405);
    try {
      // Bound memory use before parsing attacker-controlled json.
      const reader = req.body?.getReader();
      if (!reader) return fail('invalid_body', 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 32768) { await reader.cancel(); return fail('invalid_body', 400); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      let body: unknown;
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return fail('invalid_body', 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('invalid_body', 400);
      return await handler(req, body as Record<string, unknown>);
    } catch { return fail('please_try_again', 500); }
  });
}
