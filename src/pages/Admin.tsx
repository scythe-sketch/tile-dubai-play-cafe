import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Row = { id: string; nickname: string; banned: boolean; created_at: string; week_score: number | null };

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data: d }) => { setSession(d.session); setReady(true); });
    return () => data.subscription.unsubscribe();
  }, []);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_players');
    if (error) { setIsAdmin(false); return; }
    setIsAdmin(true); setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => { if (session) void load(); else setIsAdmin(false); }, [session, load]);

  async function auth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setMessage('');
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email')).trim(), password = String(f.get('password'));
    if (mode === 'in') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message.toLowerCase());
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setMessage(error ? error.message.toLowerCase() : 'check your email to confirm, then sign in.');
    }
  }

  async function toggle(row: Row) {
    const { error } = await supabase.rpc('admin_set_banned', { p_player_id: row.id, p_banned: !row.banned });
    if (error) setMessage('could not update. please try again.'); else void load();
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-background text-foreground px-5 py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">leaderboard moderation</h1>
          {session && <Button variant="outline" onClick={() => supabase.auth.signOut()}>sign out</Button>}
        </header>

        {!session && (
          <form onSubmit={e => void auth(e)} className="space-y-3 rounded-2xl border border-border p-6">
            <Input name="email" type="email" placeholder="email" required autoComplete="email" />
            <Input name="password" type="password" placeholder="password" required minLength={8} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
            <Button type="submit" className="w-full">{mode === 'in' ? 'sign in' : 'create admin account'}</Button>
            <button type="button" className="text-sm text-muted-foreground underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
              {mode === 'in' ? 'first time? create your account' : 'have an account? sign in'}
            </button>
          </form>
        )}

        {session && !isAdmin && <p className="text-muted-foreground">this account doesn’t have admin access.</p>}

        {session && isAdmin && (
          <>
            <Input placeholder="search nicknames" value={filter} onChange={e => setFilter(e.target.value)} />
            <ul className="divide-y divide-border rounded-2xl border border-border">
              {rows.filter(r => r.nickname.toLowerCase().includes(filter.toLowerCase())).map(r => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className={r.banned ? 'opacity-50 line-through' : ''}>
                    <div className="font-medium">{r.nickname}</div>
                    <div className="text-xs text-muted-foreground">this week: {r.week_score ?? '—'} · joined {new Date(r.created_at).toLocaleDateString()}</div>
                  </div>
                  <Button size="sm" variant={r.banned ? 'outline' : 'destructive'} onClick={() => void toggle(r)}>
                    {r.banned ? 'restore' : 'remove'}
                  </Button>
                </li>
              ))}
              {rows.length === 0 && <li className="px-4 py-6 text-center text-muted-foreground">no players yet.</li>}
            </ul>
          </>
        )}
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </main>
  );
}
