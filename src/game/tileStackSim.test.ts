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
  type Sim,
} from './tileStackSim';

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
  const sim = createSim(seed);
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
    const first = replay(12345, taps);
    const second = replay(12345, taps);
    expect(first).toEqual(second);
    expect(first.score).toBe(12);
    expect(first.perfects).toBe(12);
    expect(first.totalTicks).toBeGreaterThan(0);
  });

  test('the score comes only from the taps that were played', () => {
    const seed = 12345;
    const long = replay(seed, perfectTaps(seed, 12));
    const short = replay(seed, perfectTaps(seed, 6));
    expect(long.score).toBe(12);
    expect(short.score).toBe(6);
    expect(long.totalTicks).toBeGreaterThan(short.totalTicks);
  });

  test('a tap with no overlap ends the game', () => {
    const sim = createSim(77);
    advance(sim, 1);
    tap(sim);
    expect(sim.over).toBe(true);
    expect(sim.score).toBe(0);
  });

  test('a perfect drop keeps the tile its full width and snaps it into place', () => {
    const sim = createSim(7);
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
    const sim = createSim(11);
    stepNear(sim, 500_000 + 200_000);
    tap(sim);
    expect(sim.over).toBe(false);
    expect(sim.stack[1].width).toBeLessThan(BASE_WIDTH);
    expect(sim.stack[1].width).toBeGreaterThan(0);
    expect(sim.combo).toBe(0);
    expect(sim.lastSlice).not.toBeNull();
  });

  test('three perfects in a row grow the tile back', () => {
    const sim = createSim(11);
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
    const sim = createSim(5);
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

  test('taps after the tower falls change nothing', () => {
    const sim = createSim(77);
    advance(sim, 1);
    tap(sim);
    const frozen = replay(77, [1, 500, 1000, 2000]);
    expect(frozen.score).toBe(0);
    expect(frozen.over).toBe(true);
  });
});
