import { db, fail, ipHash, json, serve, sha256 } from '../_shared/common.ts';
import { isProfane } from '../_shared/profanity.ts';
serve(async (req, body) => {
  if (typeof body.nickname !== 'string' || typeof body.contact !== 'string') return fail('invalid_body', 400);
  const nickname = body.nickname.trim();
  if (!/^[a-zA-Z0-9_ ]{3,16}$/.test(nickname) || isProfane(nickname)) return fail('invalid_nickname', 400);
  const rawContact = body.contact.trim();
  // accept 05x / 9715x / +9715x phones and instagram handles with or without @
  const digits = rawContact.replace(/[\s()-]/g, '');
  const phone = /^0\d{9}$/.test(digits) ? '+971' + digits.slice(1) : /^971\d{9}$/.test(digits) ? '+' + digits : /^00971\d{9}$/.test(digits) ? '+' + digits.slice(2) : digits;
  const handle = rawContact.replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '').replace(/\/+$/, '');
  const contact = /^\+971\d{9}$/.test(phone) ? phone : handle.startsWith('@') ? handle : '@' + handle;
  if (!/^\+971\d{9}$/.test(contact) && !/^@[a-zA-Z0-9_.]{2,30}$/.test(contact)) return fail('invalid_contact', 400);
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
