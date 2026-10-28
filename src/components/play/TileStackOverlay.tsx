import { useEffect, useRef, useState } from 'react';
import { createSim, advance, tap, TICK_MS, MIN_TAP_GAP, MIN_CENTER, MAX_CENTER, type Sim } from '@/game/tileStackSim';
import * as client from '@/lib/tileStackClient';
import { X, Volume2, VolumeX, Hand, Scissors, Layers, Trophy } from 'lucide-react';
import { createRenderer, type FallingSlice } from './tileStackRenderer';
import { createAudio } from './tileStackAudio';
import './play.css';
const rules = [
  'highest score when it resets (sunday 23:59 dubai time) wins 2 unlimited game passes.',
  'winners are contacted on the phone or instagram they entered and announced on @tiledubai.',
  'passes redeemed in person at tile within 30 days.',
  'one prize per person every 4 weeks, otherwise it passes to the next eligible player.',
  'scores are verified before prizes are awarded and tile may remove scores or players that appear to use cheats, bots or multiple accounts.',
  'contact details are used only to contact you about the prize.',
];
type Screen = 'start' | 'playing' | 'over' | 'board' | 'winner';
export const TileStackOverlay = ({ open, onClose }: { open: boolean; onClose: () => void }) => open ? <Experience onClose={onClose} /> : null;
export default TileStackOverlay;
function Experience({ onClose }: { onClose: () => void }) {
  const [screen, setScreen] = useState<Screen>('start'), [music, setMusic] = useState(client.musicOn()), [rulesOpen, setRulesOpen] = useState(false);
  const [best, setBest] = useState(client.localBest()), [newBest, setNewBest] = useState(false), [score, setScore] = useState(0), [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [registered, setRegistered] = useState(client.isRegistered());
  const [board, setBoard] = useState<client.Leaderboard | null>(null), [lastWeek, setLastWeek] = useState(false), [own, setOwn] = useState<{ rank: number; score: number } | null>(null);
  const [countdown, setCountdown] = useState(() => client.formatCountdown(client.nextResetAt()));
  const canvas = useRef<HTMLCanvasElement>(null), panel = useRef<HTMLDivElement>(null), sim = useRef<Sim | null>(null), audio = useRef<ReturnType<typeof createAudio> | null>(null);
  const run = useRef<string | null>(null), ticks = useRef<number[]>([]), pausedRef = useRef(false), mounted = useRef(true), reduced = useRef(false);
  const effects = useRef<{ slices: FallingSlice[]; flash: number; milestone: { score: number; alpha: number } | null }>({ slices: [], flash: 0, milestone: null });
  const completed = useRef(false), requestId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    audio.current = createAudio(); audio.current.setEnabled(client.musicOn());
    const query = matchMedia('(prefers-reduced-motion: reduce)'), update = () => { reduced.current = query.matches; }; update(); query.addEventListener('change', update);
    const old = document.body.style.overflow, oldPad = document.body.style.paddingRight;
    const gap = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden'; if (gap) document.body.style.paddingRight = `${gap}px`;
    const focus = document.activeElement as HTMLElement | null; panel.current?.focus();
    const timer = setInterval(() => setCountdown(client.formatCountdown(client.nextResetAt())), 1000);
    return () => { mounted.current = false; requestId.current++; clearInterval(timer); audio.current?.destroy(); query.removeEventListener('change', update); document.body.style.overflow = old; document.body.style.paddingRight = oldPad; focus?.focus(); };
  }, []);
  /** the drop key has to work even after focus drifts off the panel to the page body */
  const dropRef = useRef(drop);
  dropRef.current = drop;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { rulesOpen ? setRulesOpen(false) : onClose(); return; }
      const target = e.target as HTMLElement | null;
      if (screen === 'playing' && !rulesOpen && (e.key === ' ' || e.key === 'Enter') && !e.repeat && !target?.closest('button,input')) { e.preventDefault(); dropRef.current(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, rulesOpen, onClose]);
  useEffect(() => { panel.current?.focus(); }, [screen]);
  useEffect(() => {
    if (screen !== 'board') return;
    let live = true;
    async function refresh() { try { const data = await client.fetchLeaderboard(); if (live) setBoard(data); } catch { if (live) setMessage('leaderboard unavailable. please try again.'); } }
    void refresh(); const timer = setInterval(() => void refresh(), 30000);
    return () => { live = false; clearInterval(timer); };
  }, [screen]);
  useEffect(() => { if (screen === 'board' && own) panel.current?.querySelector('[data-you]')?.scrollIntoView({ block: 'nearest' }); }, [screen, own, board]);
  useEffect(() => {
    if (screen !== 'winner') return;
    audio.current?.numberOne(); const timer = setTimeout(() => setScreen('board'), reduced.current ? 700 : 2400); return () => clearTimeout(timer);
  }, [screen]);
  async function submit() {
    if (!run.current) { setMessage('this practice round cannot be submitted. your spot is claimed — play again for a verified score.'); return; }
    setBusy(true);
    try {
      const result = await client.submitRun(run.current, ticks.current);
      if (!mounted.current) return;
      if (!result.ok) { setMessage('score could not be verified. try submitting again.'); return; }
      setScore(result.score); setOwn({ rank: result.rank, score: result.score }); setNewBest(result.newBest);
      setMessage('verified score'); setScreen(result.isFirst ? 'winner' : 'board');
    } catch { if (mounted.current) setMessage('connection unavailable. your round is saved here; retry submitting.'); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function begin() {
    if (busy) return;
    audio.current?.start(); setBusy(true); setMessage(''); const id = ++requestId.current;
    let result: client.StartResult;
    try { result = await Promise.race([client.startRun(), new Promise<client.StartResult>(resolve => setTimeout(() => resolve({ ok: false, reason: 'network' }), 6000))]); }
    catch { result = { ok: false, reason: 'network' }; }
    if (!mounted.current || id !== requestId.current) return;
    const verified = result.ok && result.runId && Number.isFinite(result.seed);
    run.current = verified ? result.runId! : null;
    sim.current = createSim(verified ? result.seed! : (globalThis.crypto?.getRandomValues(new Uint32Array(1))[0] ?? Date.now()) >>> 0);
    ticks.current = []; completed.current = false; effects.current = { slices: [], flash: 0, milestone: null }; pausedRef.current = false;
    setPaused(false); setNewBest(false); setScore(0); setBusy(false); setScreen('playing');
    if (!verified) setMessage("practice round — this round can't go on the leaderboard. claim a spot and play a new verified round.");
  }
  function drop() {
    if (screen !== 'playing' || rulesOpen || completed.current || !sim.current) return;
    if (pausedRef.current) { pausedRef.current = false; setPaused(false); audio.current?.resume(); return; }
    const s = sim.current;
    if (s.over || s.tick - s.lastTapTick < MIN_TAP_GAP || ticks.current.length >= 2000) return;
    ticks.current.push(s.tick); tap(s);
    if (s.over) { audio.current?.gameOver(); return; }
    audio.current?.drop();
    if (s.lastPerfect) { audio.current?.perfect(s.combo); if (!reduced.current) { effects.current.flash = 1; try { navigator.vibrate?.(10); } catch { /* optional */ } } }
    if (s.lastSlice) { audio.current?.slice(); effects.current.slices.push({ ...s.lastSlice, level: s.score, age: 0 }); }
    if ([10,25,50,75,100].includes(s.score)) effects.current.milestone = { score: s.score, alpha: 1 };
  }
  useEffect(() => {
    if (screen !== 'playing' || !canvas.current) return;
    const renderer = createRenderer(canvas.current); let raf = 0, previous = performance.now(), accumulator = 0, cameraY = 0, overAge = 0;
    function frame(now: number) {
      const dt = Math.min(50, now - previous); previous = now;
      const s = sim.current;
      if (s && !pausedRef.current) {
        accumulator += dt;
        while (accumulator >= TICK_MS) { advance(s, 1); accumulator -= TICK_MS; }
        const e = effects.current;
        e.flash = Math.max(0, e.flash - dt / 550); e.slices = e.slices.map(p => ({ ...p, age: p.age + dt / 1000 })).filter(p => p.age < 1.2);
        if (e.milestone) { e.milestone.alpha -= dt / 1800; if (e.milestone.alpha <= 0) e.milestone = null; }
        const rect = canvas.current!.getBoundingClientRect(), target = Math.max(0, s.stack.length * 65 - (rect.height / (rect.width / 1000) * .67 - 150));
        cameraY += (target - cameraY) * (reduced.current ? 1 : 1 - Math.exp(-dt / 160));
        renderer.draw({ sim: s, cameraY, shake: e.flash * Math.sin(now * .05) * 2, flash: e.flash, slices: e.slices, milestone: e.milestone, time: now, reducedMotion: reduced.current, currentCenter: s.over ? s.current.center : Math.max(MIN_CENTER, Math.min(MAX_CENTER, s.current.center + s.dir * s.speed * accumulator / TICK_MS)) });
        if (s.over) {
          overAge += dt;
          if (overAge >= (reduced.current ? 0 : 650) && !completed.current) {
            completed.current = true; setScore(s.score); const oldBest = client.localBest(); setNewBest(s.score > oldBest); client.saveLocalBest(s.score); setBest(Math.max(oldBest, s.score)); setScreen('over');
            if (run.current) void submit();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    function visibility() { if (document.hidden) { pausedRef.current = true; setPaused(true); audio.current?.suspend(); } }
    document.addEventListener('visibilitychange', visibility);
    return () => { cancelAnimationFrame(raf); renderer.destroy(); document.removeEventListener('visibilitychange', visibility); };
  }, [screen]);
  useEffect(() => {
    if (screen === 'playing' && rulesOpen) { pausedRef.current = true; setPaused(true); audio.current?.suspend(); }
  }, [rulesOpen, screen]);
  function keyboard(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { e.stopPropagation(); rulesOpen ? setRulesOpen(false) : onClose(); return; }
    if (e.key === 'Tab') {
      const root = rulesOpen ? panel.current?.querySelector('[data-rules]') : panel.current;
      const elements = root?.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]');
      if (elements?.length) { const first = elements[0], last = elements[elements.length - 1]; if (e.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
    if (screen === 'playing' && !rulesOpen && (e.key === ' ' || e.key === 'Enter') && !e.repeat && !(e.target as HTMLElement).closest('button,input')) { e.preventDefault(); drop(); }
  }
  async function share() {
    try {
      const card = document.createElement('canvas'); card.width = 1080; card.height = 1920; const c = card.getContext('2d'); if (!c) return;
      const styles = getComputedStyle(panel.current!), color = (token: string) => `hsl(${styles.getPropertyValue('--' + token)})`;
      c.fillStyle = color('tile-charcoal'); c.fillRect(0,0,1080,1920); c.fillStyle = color('primary'); c.textAlign = 'center'; c.font = '800 130px "League Spartan"'; c.fillText('tile.',540,210);
      const stack = sim.current?.stack.slice(-14) ?? [];
      stack.forEach((t,i) => { c.fillStyle = color(['primary','tile-cream','tile-wood'][i%3]); c.beginPath(); c.roundRect(540+(t.center-500000)/1000*.9-t.width/1000*.45,1220-i*45,t.width/1000*.9,38,10); c.fill(); });
      c.fillStyle = color('tile-cream'); c.font = '800 240px "League Spartan"'; c.fillText(String(score),540,660); c.font = '800 64px "League Spartan"'; c.fillText(`i stacked ${score} at tile.`,540,1450); c.fillText('beat me.',540,1530); c.font = '36px "Public Sans"'; c.fillText('tiledubai.com/#play',540,1740);
      const blob = await new Promise<Blob | null>(resolve => card.toBlob(resolve,'image/png')); if (!blob) return;
      const file = new File([blob], 'tile-stack.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'tile stack' });
      else { const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); }
    } catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage('sharing is unavailable. please try again.'); }
  }
  return <div className="ts-overlay dark-section" role="dialog" aria-modal="true" aria-label="tile stack" onKeyDown={keyboard}>
    <div className="ts-panel" ref={panel} tabIndex={-1}>
      <header className="ts-header"><span className="font-display">tile<span>.</span></span><div><button aria-label={music ? 'mute music' : 'enable music'} aria-pressed={music} onClick={() => { audio.current?.start(); audio.current?.setEnabled(!music); client.setMusicOn(!music); setMusic(!music); }}>{music ? <Volume2/> : <VolumeX/>}</button><button onClick={onClose} aria-label="close game"><X/></button></div></header>
      {screen === 'playing' ? <><canvas ref={canvas} className="ts-canvas" onPointerDown={e => { e.preventDefault(); drop(); }} aria-label="tile stack playfield. press space or enter to drop."/>{paused && <button className="ts-paused" onClick={drop}>paused. tap to resume.</button>}<p className="ts-hint">tap anywhere to stack</p></> : <main className="ts-content">
      {screen === 'start' && <><div className="ts-idle" aria-hidden="true">{[0,1,2,3,4].map(i => <i key={i} style={{ width: `${170-i*12}px`, marginLeft: `${i*6}px` }}/>)}</div><h1 className="font-display">tile stack</h1><div className="ts-prize"><Trophy size={18}/><div><small>{client.PRIZE.headline}</small><p>{client.PRIZE.line}</p></div></div><button className="ts-terms" onClick={() => setRulesOpen(true)}>{client.PRIZE.terms}</button><h3>how to play</h3><ol className="ts-steps"><li><Hand/>tap anywhere to drop the sliding tile</li><li><Scissors/>whatever hangs over gets sliced off and your tile gets smaller</li><li><Layers/>land it perfectly to keep its size and build a combo</li></ol>{best > 0 && <p>your best: {best}</p>}<p className="ts-muted">weekly reset in {countdown}</p><button className="ts-primary" disabled={busy} onClick={() => void begin()}>{busy ? 'starting…' : 'play'}</button><button onClick={() => setScreen('board')}>leaderboard</button><button className="ts-terms" onClick={() => setRulesOpen(true)}>prize rules</button></>}
      {screen === 'over' && <section className="ts-result"><h1>game over.</h1><strong className="ts-score font-display">{score}</strong><p>your best this week: {own?.score ?? 'not verified yet'}</p>{newBest && <span className="ts-badge">new best!</span>}{!run.current && <p className="ts-muted">this round can't go on the leaderboard. claim your spot, then play a new verified round.</p>}{!registered && score > 0 && <form className="ts-form" onSubmit={async e => { e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); try { const result = await client.registerPlayer(String(data.get('nickname')).trim(),String(data.get('contact')).trim()); if (!mounted.current) return; if (!result.ok) { setMessage('could not claim your spot. please try again.'); return; } setRegistered(true); await submit(); } catch { setMessage('connection unavailable. please try again.'); } finally { if (mounted.current) setBusy(false); } }}><h3>claim your spot on the leaderboard</h3><label>nickname<input name="nickname" required maxLength={24} autoComplete="nickname"/></label><label>phone or instagram<input name="contact" required maxLength={100} autoComplete="off"/></label><label className="ts-checkbox"><input type="checkbox" required/>i agree to the prize rules</label><button type="button" className="ts-terms" onClick={() => setRulesOpen(true)}>read prize rules</button><button className="ts-primary" disabled={busy}>{busy ? 'saving…' : 'save score'}</button></form>}{registered && run.current && <button disabled={busy} onClick={() => void submit()}>retry verified submission</button>}<button className="ts-primary" disabled={busy} onClick={() => void begin()}>play again</button><button onClick={() => setScreen('board')}>leaderboard</button><button onClick={() => void share()}>share</button></section>}
      {screen === 'winner' && <div className="ts-winner"><div className="ts-rain" aria-hidden="true">{Array.from({length:18},(_,i)=><i key={i} style={{ left:`${i*6}%`, animationDelay:`${i*.07}s` }}/>)}</div><Trophy size={64}/><h1>you're on top.</h1><p>verified score: {score}</p><button onClick={() => setScreen('board')}>see leaderboard</button></div>}
      {screen === 'board' && <><h1>this week's top 25</h1><p className="ts-muted">resets in {countdown}</p><div className="ts-prize">{client.PRIZE.line}</div><div className="ts-tabs"><button aria-pressed={!lastWeek} onClick={() => setLastWeek(false)}>this week</button><button aria-pressed={lastWeek} onClick={() => setLastWeek(true)}>last week's winner</button></div>{lastWeek ? <p>{board?.lastWinner ? `${board.lastWinner.nickname.toLowerCase()} · ${board.lastWinner.score}` : 'no winner announced yet.'}</p> : <>{!board ? <p>loading leaderboard…</p> : !board.rows.length ? <p>no scores yet this week. be the first.</p> : <ol className="ts-board">{board.rows.slice(0,25).map((row,i) => <li key={`${row.rank}-${row.nickname}`} data-you={own?.rank === row.rank ? true : undefined} className={`ts-rank ts-rank-${row.rank}`} style={{ animationDelay:`${i*.045}s` }}>{row.rank === 1 && <span className="ts-crown" aria-hidden="true">▱ ▱ ▱</span>}<b>#{row.rank}</b><span>{row.nickname.toLowerCase()}{own?.rank === row.rank && <small> you.</small>}{row.rank === 1 && <small>winning 2 unlimited passes</small>}</span><strong>{row.score}</strong></li>)}</ol>}{own && own.rank > 25 && <div className="ts-rank ts-pinned" data-you><b>#{own.rank}</b><span>you.</span><strong>{own.score}</strong></div>}</>}<button className="ts-primary" disabled={busy} onClick={() => void begin()}>play again</button><button onClick={() => setRulesOpen(true)}>prize rules</button></>}
      {message && <p className="ts-message" role="status">{message}</p>}
      </main>}
      {rulesOpen && <div className="ts-modal" data-rules role="dialog" aria-modal="true" aria-label="prize rules"><div><button autoFocus onClick={() => setRulesOpen(false)} aria-label="close prize rules"><X/></button><h2>prize rules</h2><ul>{rules.map(rule => <li key={rule}>{rule}</li>)}</ul></div></div>}
    </div>
  </div>;
}
