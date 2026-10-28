/**
 * tile stack — deterministic simulation core.
 *
 * this module is deliberately free of the dom, date, math.random and
 * requestAnimationFrame. it is the single source of truth for how a run
 * resolves: the browser runs it to draw the game, and the edge function runs
 * an identical copy to recompute every submitted score. the same seed plus the
 * same tap ticks always produces the same result.
 *
 * every position is an integer in milli-units (U = 1000 milli-units per world
 * unit), so no browser's floating point can change an outcome.
 */

export const U = 1000;
export const FIELD_WIDTH = 1000 * U;
export const BASE_WIDTH = 600 * U;
export const MAX_WIDTH = 600 * U;
export const MIN_CENTER = -300 * U;
export const MAX_CENTER = 1300 * U;
export const START_SPEED = 9 * U;
export const SPEED_STEP = 350; // +0.35 units per tile placed
export const MAX_SPEED = 26 * U;
export const PERFECT_TOLERANCE = 8 * U;
export const COMBO_GROWTH = 30 * U;
export const COMBO_INTERVAL = 3;
export const MIN_TAP_GAP = 6;
export const MAX_TAPS = 2000;
export const TICKS_PER_SECOND = 60;
export const MILESTONE_EVERY = 10;
export const TICK_MS = 1000 / TICKS_PER_SECOND;

export type Tile = { center: number; width: number };
export type Slice = { center: number; width: number; dir: 1 | -1; tick: number };

export type Sim = {
  seed: number;
  tick: number;
  score: number;
  combo: number;
  maxCombo: number;
  perfects: number;
  stack: Tile[];
  current: Tile;
  dir: 1 | -1;
  speed: number;
  over: boolean;
  lastTapTick: number;
  lastPerfect: boolean;
  lastGrew: boolean;
  lastSlice: Slice | null;
  rand: () => number;
};

export type ReplayResult = {
  score: number;
  totalTicks: number;
  perfects: number;
  maxCombo: number;
  over: boolean;
};

/** mulberry32 — small, fast, deterministic. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** widths stay even so every edge lands on a whole milli-unit. */
const even = (n: number) => n - (n % 2);

function spawn(sim: Sim) {
  const below = sim.stack[sim.stack.length - 1];
  const fromLeft = sim.rand() < 0.5;
  sim.current = { center: fromLeft ? MIN_CENTER : MAX_CENTER, width: below.width };
  sim.dir = fromLeft ? 1 : -1;
}

export function createSim(seed: number): Sim {
  const base: Tile = { center: FIELD_WIDTH / 2, width: BASE_WIDTH };
  const sim: Sim = {
    seed: seed >>> 0,
    tick: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfects: 0,
    stack: [base],
    current: { ...base },
    dir: 1,
    speed: START_SPEED,
    over: false,
    lastTapTick: -Infinity,
    lastPerfect: false,
    lastGrew: false,
    lastSlice: null,
    rand: mulberry32(seed >>> 0),
  };
  spawn(sim);
  return sim;
}

/** advance the moving tile by whole ticks, bouncing off the playfield ends. */
export function advance(sim: Sim, ticks: number): Sim {
  if (sim.over || ticks <= 0) return sim;
  for (let i = 0; i < ticks; i++) {
    sim.tick += 1;
    let center = sim.current.center + sim.dir * sim.speed;
    if (center <= MIN_CENTER) {
      center = MIN_CENTER;
      sim.dir = 1;
    } else if (center >= MAX_CENTER) {
      center = MAX_CENTER;
      sim.dir = -1;
    }
    sim.current.center = center;
  }
  return sim;
}

/** drop the moving tile wherever it is right now. */
export function tap(sim: Sim): Sim {
  if (sim.over) return sim;
  if (sim.tick - sim.lastTapTick < MIN_TAP_GAP) return sim; // double-tap guard
  sim.lastTapTick = sim.tick;
  sim.lastPerfect = false;
  sim.lastGrew = false;
  sim.lastSlice = null;

  const below = sim.stack[sim.stack.length - 1];
  const cur = sim.current;
  const curLeft = cur.center - cur.width / 2;
  const curRight = cur.center + cur.width / 2;
  const belowLeft = below.center - below.width / 2;
  const belowRight = below.center + below.width / 2;

  const overlap = Math.min(curRight, belowRight) - Math.max(curLeft, belowLeft);
  if (overlap <= 0) {
    sim.over = true;
    return sim;
  }

  const offset = cur.center - below.center;
  const perfect = Math.abs(offset) <= PERFECT_TOLERANCE;

  let center: number;
  let width: number;
  if (perfect) {
    center = below.center;
    width = cur.width;
  } else {
    const overlapLeft = Math.max(curLeft, belowLeft);
    const overlapRight = Math.min(curRight, belowRight);
    center = even(overlapLeft + overlapRight) / 2;
    width = even(overlap);
    if (curRight > belowRight) {
      sim.lastSlice = { center: (belowRight + curRight) / 2, width: curRight - belowRight, dir: 1, tick: sim.tick };
    } else if (curLeft < belowLeft) {
      sim.lastSlice = { center: (curLeft + belowLeft) / 2, width: belowLeft - curLeft, dir: -1, tick: sim.tick };
    }
  }

  if (width <= 0) {
    sim.over = true;
    return sim;
  }

  sim.stack.push({ center, width });
  sim.score += 1;

  if (perfect) {
    sim.perfects += 1;
    sim.combo += 1;
    sim.maxCombo = Math.max(sim.maxCombo, sim.combo);
    if (sim.combo % COMBO_INTERVAL === 0) {
      const top = sim.stack[sim.stack.length - 1];
      top.width = Math.min(MAX_WIDTH, even(top.width + COMBO_GROWTH));
      sim.lastGrew = true;
    }
  } else {
    sim.combo = 0;
  }

  sim.speed = Math.min(MAX_SPEED, START_SPEED + SPEED_STEP * sim.score);
  sim.lastPerfect = perfect;
  spawn(sim);
  return sim;
}

/**
 * replay a whole run from the server-issued seed and the player's tap ticks.
 * the edge function runs this and only ever stores what it returns.
 */
export function replay(seed: number, tapTicks: number[]): ReplayResult {
  const sim = createSim(seed);
  let previous = -Infinity;
  let lastAccepted = 0;
  for (const tick of tapTicks) {
    if (!Number.isInteger(tick) || tick <= previous) continue;
    previous = tick;
    lastAccepted = tick;
    advance(sim, tick - sim.tick);
    tap(sim);
    if (sim.over) break;
  }
  return {
    score: sim.score,
    totalTicks: Math.max(sim.tick, lastAccepted),
    perfects: sim.perfects,
    maxCombo: sim.maxCombo,
    over: sim.over,
  };
}

/** tap ticks must be strictly increasing, at least MIN_TAP_GAP apart, and capped. */
export function isValidTapTicks(tapTicks: unknown): tapTicks is number[] {
  if (!Array.isArray(tapTicks) || tapTicks.length > MAX_TAPS) return false;
  let previous = -Infinity;
  for (const tick of tapTicks) {
    if (!Number.isInteger(tick) || tick < 0) return false;
    if (tick - previous < MIN_TAP_GAP) return false;
    previous = tick;
  }
  return true;
}

export function isMilestone(score: number) {
  return score > 0 && score % MILESTONE_EVERY === 0;
}
