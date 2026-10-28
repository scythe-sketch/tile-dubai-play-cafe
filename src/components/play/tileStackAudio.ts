export function createAudio() {
  let ctx: AudioContext | undefined, master: GainNode | undefined, filter: BiquadFilterNode | undefined;
  let timer: ReturnType<typeof setInterval> | undefined, enabled = true, running = false, next = 0, beat = 0, score = 0;
  const roots = [130.813, 110, 87.307, 97.999], chords = [[0,4,7,11],[0,3,7,10],[0,4,7,11],[0,4,7,9]];
  function tone(freq: number, at: number, duration: number, volume: number, type: OscillatorType = 'sine') {
    if (!ctx || !filter || !enabled) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .012); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    osc.connect(gain); gain.connect(filter); osc.start(at); osc.stop(at + duration + .03);
  }
  function noise(at: number, duration: number, volume: number) {
    if (!ctx || !filter || !enabled) return;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource(), gain = ctx.createGain(), high = ctx.createBiquadFilter(); src.buffer = buffer; high.type = 'highpass'; high.frequency.value = 3500; gain.gain.value = volume;
    src.connect(high); high.connect(gain); gain.connect(filter); src.start(at);
  }
  function schedule() {
    if (!ctx || !running || !enabled || ctx.state !== 'running') return;
    if (next < ctx.currentTime) next = ctx.currentTime + .03;
    while (next < ctx.currentTime + .15) {
      const bar = Math.floor(beat / 8) % 4, root = roots[bar], t = next;
      if (beat % 8 === 0) chords[bar].forEach(n => tone(root * 2 ** (n / 12), t, 2.7, .025, 'triangle'));
      if (beat % 2 === 0) tone(root / 2, t, .55, .1);
      if (beat % 4 === 0) { tone(55, t, .15, .12); tone(90, t, .04, .035); }
      noise(t, .045, .025);
      if (score >= 15) tone(root * 2 ** ((chords[bar][beat % 4] + 12) / 12), t, .18, .025, 'triangle');
      if (score >= 60 && beat % 4 === 2) noise(t, .12, .045);
      if (filter) filter.frequency.setTargetAtTime(score >= 35 ? 6000 : 3500, t, .4);
      beat++; next += 60 / 88 / 2;
    }
  }
  function start() {
    try {
      if (!ctx) { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = enabled ? .65 : 0; filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 3500; filter.connect(master); master.connect(ctx.destination); }
      running = true; score = 0; beat = 0; next = ctx.currentTime + .03;
      master!.gain.cancelScheduledValues(ctx.currentTime); master!.gain.setTargetAtTime(enabled ? .65 : 0, ctx.currentTime, .08);
      void ctx.resume().catch(() => {}); if (!timer) timer = setInterval(schedule, 25);
    } catch { /* audio is optional */ }
  }
  const now = () => ctx?.currentTime ?? 0;
  return {
    start,
    resume() { if (ctx) { next = ctx.currentTime + .03; void ctx.resume().catch(() => {}); } },
    suspend() { void ctx?.suspend().catch(() => {}); },
    drop() { score++; tone(220, now(), .07, .09, 'triangle'); },
    perfect(combo: number) { const n = [0,2,4,7,9][(combo - 1) % 5] + 12 * (Math.floor((combo - 1) / 5) % 2); tone(523.25 * 2 ** (n / 12), now(), .35, .11, 'triangle'); },
    slice() { noise(now(), .16, .09); },
    gameOver() { [392,330,261.63].forEach((n,i) => tone(n, now() + i * .18, .45, .1, 'triangle')); running = false; if (ctx && master) master.gain.setTargetAtTime(.0001, now() + .5, .22); },
    numberOne() { if (master && ctx) master.gain.setTargetAtTime(enabled ? .65 : 0, now(), .02); [523.25,659.25,783.99,1046.5].forEach((n,i) => tone(n,now()+i*.11,.4,.1,'triangle')); },
    setEnabled(on: boolean) { enabled = on; if (ctx && master) master.gain.setTargetAtTime(on ? .65 : 0, now(), .03); },
    destroy() { if (timer) clearInterval(timer); timer = undefined; running = false; void ctx?.close().catch(() => {}); ctx = undefined; },
  };
}
