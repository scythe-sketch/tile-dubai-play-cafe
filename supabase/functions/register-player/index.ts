import { db, fail, ipHash, json, serve, sha256 } from '../_shared/common.ts';
import { isProfane } from '../_shared/profanity.ts';
// aes-256-gcm with a random iv per value; key lives only in the backend secret store.
// stored as "enc:v1:<base64 iv>:<base64 ciphertext+tag>"
async function encryptContact(plain: string): Promise<string> {
  const secret = Deno.env.get('CONTACT_ENCRYPTION_KEY');
  if (!secret) throw new Error('missing encryption key');
  const keyBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)));
  const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
  return `enc:v1:${b64(iv)}:${b64(ct)}`;
}
serve(async (req, body) => {
  if (typeof body.nickname !== 'string' || typeof body.contact !== 'string') return fail('invalid_body', 400);
  const nickname = body.nickname.trim();
  if (!/^[a-zA-Z0-9_ ]{3,16}$/.test(nickname) || isProfane(nickname)) return fail('invalid_nickname', 400);
  // instagram handles only, with or without @ or a profile url
  const handle = body.contact.trim().replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '').replace(/[/?].*$/, '').replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9_.]{2,30}$/.test(handle)) return fail('invalid_contact', 400);
  const contact = await encryptContact('@' + handle);
  const client = db();
  const ip_hash = await ipHash(req);
  const { count, error } = await client.from('players').select('id', { count: 'exact', head: true }).eq('ip_hash', ip_hash).gte('created_at', new Date(Date.now() - 86400000).toISOString());
  if (error) throw error;
  if ((count ?? 0) >= 5) return fail('rate_limited');
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const { error: insertError } = await client.from('players').insert({ nickname, contact, ip_hash, device_token_hash: await sha256(token) });
  if (insertError?.code === '23505') return fail('nickname_taken');
  if (insertError) throw insertError;
  return json({ ok: true, token });
});
