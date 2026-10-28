import { describe, expect, test } from 'bun:test';
import {
  BASE_WIDTH,
  COMBO_GROWTH,
  MAX_TAPS,
  PERFECT_TOLERANCE,
  advance,
  createSim,
  isValidTapTicks,
  replay,
  tap,
  generateTileParams,
  supplyParams,
  applyPace,
  newPace,
  needsReview,
  type Sim,
} from './tileStackSim';
import * as server from '../../supabase/functions/_shared/tileStackSim';
import { readFileSync } from 'node:fs';

const P = (seed: number) => generateTileParams(seed, 2100);

/** walk the sliding tile until it first sits within a perfect window of `target`. */
function stepNear(sim: Sim, target: number, maxTicks = 400_000) {
  let guard = 0;
  while (
    guard++ < maxTicks &&
    !sim.over &&
    Math.abs(sim.current.center - target) > PERFECT_TOLERANCE
  ) {
    advance(sim, 1);
  }
}

function perfectTaps(seed: number, count: number) {
  const sim = createSim(P(seed));
  const taps: number[] = [];
  for (let i = 0; i < count; i++) {
    const top = sim.stack[sim.stack.length - 1];
    stepNear(sim, top.center);
    expect(Math.abs(sim.current.center - top.center)).toBeLessThanOrEqual(PERFECT_TOLERANCE);
    taps.push(sim.tick);
    tap(sim);
    if (sim.over) break;
  }
  return taps;
}

describe('tile stack simulation', () => {
  test('the same seed and taps always produce the same run', () => {
    const taps = perfectTaps(12345, 12);
    const first = replay(P(12345), taps);
    const second = replay(P(12345), taps);
    expect(first).toEqual(second);
    expect(first.score).toBe(12);
    expect(first.perfects).toBe(12);
    expect(first.totalTicks).toBeGreaterThan(0);
  });

  test('the score comes only from the taps that were played', () => {
    const seed = 12345;
    const long = replay(P(seed), perfectTaps(seed, 12));
    const short = replay(P(seed), perfectTaps(seed, 6));
    expect(long.score).toBe(12);
    expect(short.score).toBe(6);
    expect(long.totalTicks).toBeGreaterThan(short.totalTicks);
  });

  test('a tap with no overlap ends the game', () => {
    const sim = createSim(P(77));
    advance(sim, 1);
    tap(sim);
    expect(sim.over).toBe(true);
    expect(sim.score).toBe(0);
  });

  test('a perfect drop keeps the tile its full width and snaps it into place', () => {
    const sim = createSim(P(7));
    const base = sim.stack[0];
    stepNear(sim, base.center);
    tap(sim);
    expect(sim.score).toBe(1);
    expect(sim.perfects).toBe(1);
    expect(sim.stack[1].width).toBe(BASE_WIDTH);
    expect(sim.stack[1].center).toBe(base.center);
    expect(sim.combo).toBe(1);
  });

  test('a missed drop slices the tile down to the overlap', () => {
    const sim = createSim(P(11));
    stepNear(sim, 500_000 + 200_000);
    tap(sim);
    expect(sim.over).toBe(false);
    expect(sim.stack[1].width).toBeLessThan(BASE_WIDTH);
    expect(sim.stack[1].width).toBeGreaterThan(0);
    expect(sim.combo).toBe(0);
    expect(sim.lastSlice).not.toBeNull();
  });

  test('three perfects in a row grow the tile back', () => {
    const sim = createSim(P(11));
    stepNear(sim, 500_000 + 200_000);
    tap(sim);
    const sliced = sim.stack[1].width;
    for (let i = 0; i < 3; i++) {
      const top = sim.stack[sim.stack.length - 1];
      stepNear(sim, top.center);
      tap(sim);
    }
    expect(sim.combo).toBe(3);
    expect(sim.stack[sim.stack.length - 1].width).toBe(sliced + COMBO_GROWTH);
  });

  test('taps less than six ticks apart are ignored', () => {
    const sim = createSim(P(5));
    stepNear(sim, 500_000);
    tap(sim);
    expect(sim.over).toBe(false);
    expect(sim.score).toBe(1);
    const lastTap = sim.lastTapTick;
    const stackSize = sim.stack.length;
    advance(sim, 3);
    tap(sim);
    expect(sim.stack.length).toBe(stackSize);
    expect(sim.lastTapTick).toBe(lastTap);
  });

  test('tap ticks must be whole, increasing, spaced and capped', () => {
    expect(isValidTapTicks([10, 20, 30])).toBe(true);
    expect(isValidTapTicks([10, 12, 30])).toBe(false);
    expect(isValidTapTicks([10, 10])).toBe(false);
    expect(isValidTapTicks([30, 10])).toBe(false);
    expect(isValidTapTicks([1.5, 100])).toBe(false);
    expect(isValidTapTicks([-5, 100])).toBe(false);
    expect(isValidTapTicks(Array.from({ length: MAX_TAPS + 1 }, (_, i) => i * 10))).toBe(false);
  });

  test('browser and server copies give identical results from the same tiles and taps', () => {
    expect(readFileSync('supabase/functions/_shared/tileStackSim.ts', 'utf8')).toBe(readFileSync('src/game/tileStackSim.ts', 'utf8'));
    const params = generateTileParams(999, 2100);
    const taps = perfectTaps(999, 20);
    expect(server.replay(params, taps)).toEqual(replay(params, taps));
  });

  test('tile parameters stay in range: offset 0–200 units, speed 0.92–1.08x', () => {
    for (const t of generateTileParams(4242, 500)) {
      expect(t.offset).toBeGreaterThanOrEqual(0);
      expect(t.offset).toBeLessThanOrEqual(200_000);
      expect(t.speedMul).toBeGreaterThanOrEqual(920);
      expect(t.speedMul).toBeLessThanOrEqual(1080);
    }
  });

  test('a browser fed only two tiles ahead ends up exactly where the server does', () => {
    const all = generateTileParams(31337, 60);
    const taps = perfectTaps(31337, 20);
    const sim = createSim(all.slice(0, 2));
    let i = 0;
    for (const t of taps) {
      advance(sim, t - sim.tick);
      tap(sim);
      i++;
      supplyParams(sim, i + 1, all[i + 1]);
    }
    const full = replay(all, taps);
    expect(sim.score).toBe(full.score);
    expect(sim.perfects).toBe(full.perfects);
  });

  test('a late tile still lands where the server expects', () => {
    const all = generateTileParams(8, 10);
    const a = createSim([all[0]]);
    const b = createSim(all);
    for (const s of [a, b]) { advance(s, 40); tap(s); }
    advance(a, 17); advance(b, 17);
    supplyParams(a, 1, all[1]);
    expect(a.current.center).toBe(b.current.center);
  });

  test('a precomputed list of taps sent in one burst is rejected', () => {
    const taps = perfectTaps(555, 30);
    let pace = newPace();
    const now = 1_000_000;
    let rejected = '';
    for (const t of taps) {
      const r = applyPace(pace, 'tap', t, now + 5); // all arrive within milliseconds
      if (r.ok === false) { rejected = r.reason; break; }
      pace = r.state;
    }
    expect(rejected).toBe('too_fast');
  });

  test('a normal human-paced run with a tab pause still saves', () => {
    const taps = perfectTaps(555, 30);
    let pace = newPace();
    const start = 1_000_000;
    let pausedFor = 0;
    for (let i = 0; i < taps.length; i++) {
      const arrive = start + (taps[i] * 1000) / 60 + 120 + pausedFor; // ~120ms network delay
      if (i === 10) {
        const p = applyPace(pace, 'pause', taps[i - 1] + 2, arrive - 500);
        expect(p.ok).toBe(true); if (p.ok) pace = p.state;
        pausedFor += 20_000;
        const r = applyPace(pace, 'resume', taps[i - 1] + 2, arrive - 500 + 20_000);
        expect(r.ok).toBe(true); if (r.ok) pace = r.state;
      }
      const r = applyPace(pace, 'tap', taps[i], start + (taps[i] * 1000) / 60 + 120 + pausedFor);
      expect(r.ok).toBe(true);
      if (r.ok) pace = r.state;
    }
    expect(pace.tapCount).toBe(30);
    expect(pace.pauseCount).toBe(1);
  });

  test('more than 3 pauses or 5 minutes paused ends the run', () => {
    let pace = newPace();
    let now = 0;
    for (let i = 0; i < 3; i++) {
      const p = applyPace(pace, 'pause', 0, now); if (p.ok) pace = p.state;
      const r = applyPace(pace, 'resume', 0, now + 1000); if (r.ok) pace = r.state;
      now += 2000;
    }
    const fourth = applyPace(pace, 'pause', 0, now);
    expect(fourth.ok).toBe(false);
    const long = applyPace(applyPace(newPace(), 'pause', 0, 0).ok ? { ...newPace(), pausedAtMs: 0 } : newPace(), 'resume', 0, 5 * 60 * 1000 + 1);
    expect(long.ok).toBe(false);
  });

  test('taps out of order or under 6 ticks apart are rejected live', () => {
    const first = applyPace(newPace(), 'tap', 100, 10_000);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(applyPace(first.state, 'tap', 103, 20_000).ok).toBe(false);
    expect(applyPace(first.state, 'tap', 90, 20_000).ok).toBe(false);
  });

  test('bot checks flag suspicious runs', () => {
    const base = { score: 20, totalTicks: 0, perfects: 5, maxCombo: 1, perfectsAfterCap: 0, over: true };
    const human = [0, 40, 75, 120, 150, 199, 230, 280, 310, 355, 401, 430, 480, 515, 560, 600];
    expect(needsReview(base, human)).toBe(false);
    expect(needsReview({ ...base, perfectsAfterCap: 9 }, human)).toBe(true);
    expect(needsReview({ ...base, score: 31, perfects: 19 }, human)).toBe(true);
    expect(needsReview(base, Array.from({ length: 15 }, (_, i) => i * 40))).toBe(true);
  });

  test('taps after the tower falls change nothing', () => {
    const sim = createSim(P(77));
    advance(sim, 1);
    tap(sim);
    const frozen = replay(P(77), [1, 500, 1000, 2000]);
    expect(frozen.score).toBe(0);
    expect(frozen.over).toBe(true);
  });
});
