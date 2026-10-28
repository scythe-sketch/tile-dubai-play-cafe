import { U, type Sim } from '@/game/tileStackSim';
export type FallingSlice = { center: number; width: number; level: number; dir: number; age: number };
export type Frame = { sim: Sim; cameraY: number; shake: number; flash: number; slices: FallingSlice[]; milestone: { score: number; alpha: number } | null; time: number; reducedMotion: boolean; currentCenter?: number };
export function createRenderer(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  let w = 1, h = 1, colors: string[] = [];
  function resize() {
    const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
    w = box.width; h = box.height;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const style = getComputedStyle(canvas);
    colors = ['tile-charcoal', 'primary', 'tile-cream', 'tile-wood', 'tile-surface'].map(t => `hsl(${style.getPropertyValue('--' + t).trim()})`);
  }
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  function draw(f: Frame) {
    if (!ctx || !w || !h) return;
    const c = ctx, scale = w / 1000, step = 65, base = h / scale - 200;
    c.clearRect(0, 0, w, h); c.fillStyle = colors[0]; c.fillRect(0, 0, w, h);
    c.save(); c.scale(scale, scale);
    c.strokeStyle = colors[1]; c.lineWidth = 1;
    c.globalAlpha = .045;
    for (let x = 20; x < 1000; x += 100) for (let y = 20; y < h / scale; y += 100) { c.beginPath(); c.roundRect(x, y, 64, 64, 12); c.stroke(); }
    c.globalAlpha = .12;
    const drift = f.reducedMotion ? 0 : Math.sin(f.time / 7000) * 35;
    c.beginPath(); c.roundRect(650 + drift, 250 + drift, 160, 160, 22); c.stroke(); c.globalAlpha = 1;
    if (f.milestone) { c.globalAlpha = f.milestone.alpha * .13; c.fillStyle = colors[1]; c.font = '800 360px "League Spartan", sans-serif'; c.textAlign = 'center'; c.fillText(String(f.milestone.score), 500, h / scale * .55); c.globalAlpha = 1; }
    c.translate(f.reducedMotion ? 0 : f.shake / scale, f.cameraY);
    function tile(center: number, width: number, level: number) {
      const x = (center - width / 2) / U, y = base - level * step, tw = width / U;
      const index = level > 0 && level % 10 === 0 ? 1 : 1 + (((f.sim.params[0]?.offset ?? 0) % 4 + level * 3) % 4);
      c.fillStyle = colors[index]; c.strokeStyle = colors[1]; c.lineWidth = 2;
      c.beginPath(); c.roundRect(x, y, tw, 56, Math.min(10, tw / 2)); c.fill(); if (index === 4) c.stroke();
      c.fillStyle = colors[0]; c.globalAlpha = .2; c.fillRect(x + 5, y + 5, Math.max(0, tw - 10), 5); c.globalAlpha = 1;
      if (level > 0 && level % 10 === 0 && tw > 70) {
        c.save(); c.translate(center / U, y + 29); c.strokeStyle = colors[0]; c.lineWidth = 2.5;
        c.beginPath(); c.roundRect(-15, -15, 30, 30, 5); c.stroke();
        for (const [px, py] of [[-7,-7],[0,0],[7,7]]) { c.beginPath(); c.arc(px,py,2,0,Math.PI*2); c.stroke(); } c.restore();
      }
    }
    f.sim.stack.forEach((t, i) => tile(t.center, t.width, i));
    tile(f.currentCenter ?? f.sim.current.center, f.sim.current.width, f.sim.stack.length);
    if (!f.reducedMotion) {
      for (const s of f.slices) {
        c.save(); c.globalAlpha = Math.max(0, 1 - s.age / 1.2);
        const x = s.center / U + s.dir * s.age * 110, y = base - s.level * step + 520 * s.age ** 2;
        c.translate(x, y); c.rotate(s.dir * s.age * 2); c.fillStyle = colors[3]; c.beginPath(); c.roundRect(-s.width / U / 2, 0, s.width / U, 56, Math.min(10, s.width / U / 2)); c.fill(); c.restore();
      }
      if (f.flash > 0) { c.globalAlpha = f.flash * .45; c.strokeStyle = colors[1]; c.lineWidth = 5; c.beginPath(); c.ellipse(f.sim.stack[f.sim.stack.length - 1].center / U, base - f.sim.score * step + 28, (1 - f.flash) * 220 + 50, (1 - f.flash) * 90 + 30, 0, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1; }
    }
    c.restore(); c.fillStyle = colors[2]; c.textAlign = 'center'; c.font = '800 68px "League Spartan", sans-serif'; c.fillText(String(f.sim.score), w / 2, 150);
    if (f.sim.combo > 1) { c.fillStyle = colors[1]; c.font = '14px "Public Sans", sans-serif'; c.fillText(`perfect × ${f.sim.combo}`, w / 2, 175); }
  }
  return { draw, resize, destroy() { observer.disconnect(); } };
}
