/**
 * tile stack — deterministic simulation core.
 *
 * this module is deliberately free of the dom, date, math.random and
 * requestAnimationFrame. it is the single source of truth for how a run
 * resolves: the browser runs it to draw the game, and the edge function runs
 * an identical copy to recompute every score. the same per-tile parameters plus
 * the same tap ticks always produce the same result. the seed that generates the
 * parameters never leaves the server; the browser is fed tiles two at a time.
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
/** the number of tiles placed when the speed curve first hits MAX_SPEED. */
export const SPEED_CAP_TILE = Math.ceil((MAX_SPEED - START_SPEED) / SPEED_STEP);
export const MAX_START_OFFSET = 200 * U;

/** what the server reveals about one tile: entry side, start offset and speed multiplier (permille). */
export type TileParams = { fromLeft: boolean; offset: number; speedMul: number };

export type Tile = { center: number; width: number };
export type Slice = { center: number; width: number; dir: 1 | -1; tick: number };

export type Sim = {
  params: TileParams[];
  /** ticks that passed while the next tile's parameters were not known yet. */
  waitingTicks: number;
  awaiting: boolean;
  perfectsAfterCap: number;
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
};

export type ReplayResult = {
  score: number;
  totalTicks: number;
  perfects: number;
  maxCombo: number;
  perfectsAfterCap: number;
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

/** server only: derive every tile's parameters from the secret run seed. */
export function generateTileParams(seed: number, count: number): TileParams[] {
  const rand = mulberry32(seed >>> 0);
  const out: TileParams[] = [];
  for (let i = 0; i < count; i++) {
    const fromLeft = rand() < 0.5;
    const offset = even(Math.floor(rand() * (MAX_START_OFFSET + 1)));
    const speedMul = 920 + Math.floor(rand() * 161);
    out.push({ fromLeft, offset, speedMul });
  }
  return out;
}

export function isValidTileParams(p: unknown): p is TileParams {
  const t = p as TileParams;
  return !!t && typeof t.fromLeft === 'boolean' && Number.isInteger(t.offset) && t.offset >= 0 && t.offset <= MAX_START_OFFSET
    && Number.isInteger(t.speedMul) && t.speedMul >= 920 && t.speedMul <= 1080;
}

function baseSpeed(score: number) {
  return Math.min(MAX_SPEED, START_SPEED + SPEED_STEP * score);
}

function spawn(sim: Sim) {
  const p = sim.params[sim.score];
  if (!p) { sim.awaiting = true; return; }
  sim.awaiting = false;
  const below = sim.stack[sim.stack.length - 1];
  sim.current = { center: p.fromLeft ? MIN_CENTER + p.offset : MAX_CENTER - p.offset, width: below.width };
  sim.dir = p.fromLeft ? 1 : -1;
  sim.speed = Math.trunc((baseSpeed(sim.score) * p.speedMul) / 1000);
  const wait = sim.waitingTicks;
  sim.waitingTicks = 0;
  if (wait > 0) move(sim, wait);
}

export function createSim(params: TileParams[]): Sim {
  const base: Tile = { center: FIELD_WIDTH / 2, width: BASE_WIDTH };
  const sim: Sim = {
    params: [...params],
    waitingTicks: 0,
    awaiting: false,
    perfectsAfterCap: 0,
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
  };
  spawn(sim);
  return sim;
}

/** hand the sim more tile parameters (the browser gets them as the server reveals them). */
export function supplyParams(sim: Sim, index: number, params: TileParams) {
  sim.params[index] = params;
  if (sim.awaiting && index === sim.score && !sim.over) spawn(sim);
}

function move(sim: Sim, ticks: number) {
  for (let i = 0; i < ticks; i++) {
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
}

/** advance the moving tile by whole ticks, bouncing off the playfield ends. */
export function advance(sim: Sim, ticks: number): Sim {
  if (sim.over || ticks <= 0) return sim;
  sim.tick += ticks;
  if (sim.awaiting) sim.waitingTicks += ticks;
  else move(sim, ticks);
  return sim;
}

/** drop the moving tile wherever it is right now. */
export function tap(sim: Sim): Sim {
  if (sim.over || sim.awaiting) return sim;
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
    if (sim.score > SPEED_CAP_TILE) sim.perfectsAfterCap += 1;
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

  sim.lastPerfect = perfect;
  spawn(sim);
  return sim;
}

/**
 * replay a whole run from its tile parameters and the player's tap ticks.
 * the tap edge function runs this and only ever stores what it returns.
 */
export function replay(params: TileParams[], tapTicks: number[]): ReplayResult {
  const sim = createSim(params);
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
    perfectsAfterCap: sim.perfectsAfterCap,
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

/** standard deviation of the gaps between taps, in ticks. */
export function tapDeviation(tapTicks: number[]): number {
  const gaps = tapTicks.slice(1).map((t, i) => t - tapTicks[i]);
  if (!gaps.length) return 0;
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return Math.sqrt(gaps.reduce((sum, g) => sum + (g - mean) ** 2, 0) / gaps.length);
}

/** silent bot checks; a flagged run waits for staff review before it can reach the board. */
export function needsReview(result: ReplayResult, tapTicks: number[]): boolean {
  if (result.perfectsAfterCap > 8) return true;
  if (result.score > 30 && result.perfects / result.score > 0.6) return true;
  if (tapTicks.length >= 15 && tapDeviation(tapTicks) < 3) return true;
  return false;
}

export const EARLY_SLACK_MS = 1500;
export const MAX_PAUSES = 3;
export const MAX_PAUSED_MS = 5 * 60 * 1000;

/** what the server tracks to check a run is played in real time. */
export type PaceState = { serverStartMs: number | null; pausedMs: number; pauseCount: number; pausedAtMs: number | null; lastTick: number; tapCount: number };
export type PaceEvent = 'tap' | 'pause' | 'resume';

export function newPace(): PaceState {
  return { serverStartMs: null, pausedMs: 0, pauseCount: 0, pausedAtMs: null, lastTick: -Infinity, tapCount: 0 };
}

/**
 * apply one live event as it reaches the server. taps may arrive late (network,
 * pauses) but never more than EARLY_SLACK_MS earlier than real time allows.
 */
export function applyPace(state: PaceState, event: PaceEvent, tick: number, nowMs: number): { ok: true; state: PaceState } | { ok: false; reason: string } {
  const next = { ...state };
  if (event === 'pause') {
    if (next.pausedAtMs !== null) return { ok: true, state: next };
    if (next.pauseCount >= MAX_PAUSES) return { ok: false, reason: 'too_many_pauses' };
    next.pausedAtMs = nowMs;
    return { ok: true, state: next };
  }
  if (next.pausedAtMs !== null) {
    next.pausedMs += Math.max(0, nowMs - next.pausedAtMs);
    next.pauseCount += 1;
    next.pausedAtMs = null;
    if (next.pausedMs > MAX_PAUSED_MS) return { ok: false, reason: 'paused_too_long' };
  }
  if (event === 'resume') return { ok: true, state: next };
  if (!Number.isInteger(tick) || tick < 0 || tick - next.lastTick < MIN_TAP_GAP || next.tapCount >= MAX_TAPS) return { ok: false, reason: 'bad_tick' };
  const tickMs = (tick * 1000) / TICKS_PER_SECOND;
  if (next.serverStartMs === null) next.serverStartMs = Math.round(nowMs - tickMs);
  else if (nowMs < next.serverStartMs + tickMs + next.pausedMs - EARLY_SLACK_MS) return { ok: false, reason: 'too_fast' };
  next.lastTick = tick;
  next.tapCount += 1;
  return { ok: true, state: next };
}
