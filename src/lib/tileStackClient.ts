/**
 * tile stack — the browser's only window onto the leaderboard backend.
 *
 * the browser never sends a score or a list of taps. it starts a run, gets the
 * first two tiles, and sends every tap live as it happens; the server keeps its
 * own copy of the run, reveals one more tile per tap and decides the score. anything shown here as "your best" is
 * a local convenience and always gets replaced by the server's answer.
 */
import { supabase } from '@/integrations/supabase/client';
import type { TileParams } from '@/game/tileStackSim';

const TOKEN_KEY = 'tile.stack.token';
const LOCAL_BEST_KEY = 'tile.stack.localBest';
const MUSIC_KEY = 'tile.stack.music';

export const PRIZE = {
  headline: 'this week’s prize',
  line: 'top score by sunday midnight wins an unlimited board games voucher + a drink.',
  terms: '*terms & conditions apply',
};

/** bump this to wipe every device's saved sign-up and best score (e.g. after a leaderboard reset). */
const RESET_KEY = 'tile.stack.reset';
const RESET_VERSION = '2026-10-28';

export function forgetPlayer() {
  try {
    for (const key of [TOKEN_KEY, LOCAL_BEST_KEY, 'tile.stack.nickname']) window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

try {
  if (window.localStorage.getItem(RESET_KEY) !== RESET_VERSION) {
    forgetPlayer();
    window.localStorage.setItem(RESET_KEY, RESET_VERSION);
  }
} catch {
  /* ignore */
}

export function getDeviceToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setDeviceToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode — play still works, just without a saved spot */
  }
}

export function isRegistered() {
  return Boolean(getDeviceToken());
}

export type LeaderboardRow = {
  rank: number;
  nickname: string;
  score: number;
  achievedAt: string;
};

export type LastWinner = { weekKey: string; nickname: string; score: number } | null;

export type Leaderboard = { rows: LeaderboardRow[]; lastWinner: LastWinner };

export async function fetchLeaderboard(): Promise<Leaderboard> {
  const [board, winner] = await Promise.all([
    supabase.rpc('weekly_leaderboard'),
    supabase.rpc('last_week_winner'),
  ]);
  const rows: LeaderboardRow[] = (board.data ?? []).map((row: Record<string, unknown>) => ({
    rank: Number(row.player_rank),
    nickname: String(row.nickname),
    score: Number(row.score),
    achievedAt: String(row.achieved_at),
  }));
  const first = (winner.data ?? [])[0] as Record<string, unknown> | undefined;
  return {
    rows,
    lastWinner: first
      ? { weekKey: String(first.week_key), nickname: String(first.nickname), score: Number(first.score) }
      : null,
  };
}

export type RegisterResult = { ok: boolean; token?: string; reason?: string };

export async function registerPlayer(nickname: string, contact: string): Promise<RegisterResult> {
  const { data, error } = await supabase.functions.invoke('register-player', {
    body: { nickname, contact },
  });
  if (error || !data) {
    /* validation failures come back as 400 with a reason in the body */
    try {
      const body = await (error as { context?: Response })?.context?.json();
      if (body?.reason) return { ok: false, reason: String(body.reason) };
    } catch {
      /* fall through */
    }
    return { ok: false, reason: 'network' };
  }
  if (!data.ok || !data.token) return { ok: false, reason: data.reason ?? 'rejected' };
  setDeviceToken(data.token);
  return { ok: true, token: data.token };
}

export type StartResult = { ok: boolean; runId?: string; tiles?: TileParams[]; reason?: string };

/** every round is a real round: before sign-up the run is unclaimed and gets claimed on save. */
export async function startRun(): Promise<StartResult> {
  const token = getDeviceToken();
  const { data, error } = await supabase.functions.invoke('start-run', { body: token ? { token } : {} });
  if (error || !data) {
    /* a sign-up the server no longer knows (e.g. after a reset): forget it and play as a new player */
    let reason = '';
    try { reason = (await (error as { context?: Response })?.context?.json())?.reason ?? ''; } catch { /* ignore */ }
    if (token && reason === 'not_registered') { forgetPlayer(); return startRun(); }
    return { ok: false, reason: 'network' };
  }
  if (token && data.reason === 'not_registered') { forgetPlayer(); return startRun(); }
  if (!data.ok || !Array.isArray(data.tiles)) return { ok: false, reason: data.reason ?? 'rejected' };
  return { ok: true, runId: data.runId, tiles: data.tiles };
}

export type SubmitResult = {
  ok: boolean;
  score?: number;
  /** the player's best this week, which is what the rank refers to */
  best?: number;
  rank?: number;
  isFirst?: boolean;
  newBest?: boolean;
  /** this round is held for a check before it can appear on the board */
  pending?: boolean;
  reason?: string;
};

function toSubmit(data: Record<string, unknown>): SubmitResult {
  return {
    ok: true,
    score: Number(data.score),
    best: Number(data.best ?? data.score),
    rank: Number(data.rank),
    isFirst: Boolean(data.isFirst),
    newBest: Boolean(data.newBest),
    pending: Boolean(data.pending),
  };
}

export type TapEvent = 'tap' | 'pause' | 'resume';
export type TapResult =
  | { ok: true; over: false; index?: number; tile?: TileParams }
  | { ok: true; over: true; saved: boolean; score: number; result?: SubmitResult }
  | { ok: false; reason: string };

/** send one live event; retried up to 3 times before the run is treated as lost. */
export async function sendTap(runId: string, tick: number, event: TapEvent = 'tap'): Promise<TapResult> {
  const token = getDeviceToken();
  let reason = 'network';
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 250 * attempt));
    try {
      const { data, error } = await supabase.functions.invoke('tap', { body: { runId, tick, event, ...(token ? { token } : {}) } });
      if (error || !data) continue;
      if (!data.ok) {
        reason = String(data.reason ?? 'rejected');
        if (reason === 'busy' || reason === 'rate_limited') continue;
        return { ok: false, reason };
      }
      if (event !== 'tap' || !data.over) return { ok: true, over: false, index: data.index, tile: data.tile };
      return { ok: true, over: true, saved: Boolean(data.saved), score: Number(data.score), result: data.saved ? toSubmit(data) : undefined };
    } catch { /* retry */ }
  }
  return { ok: false, reason };
}

/** save a finished round that was played before sign-up. */
export async function submitRun(runId: string): Promise<SubmitResult> {
  const token = getDeviceToken();
  if (!token) return { ok: false, reason: 'not_registered' };
  const { data, error } = await supabase.functions.invoke('submit-run', { body: { token, runId } });
  if (error || !data) return { ok: false, reason: 'network' };
  if (!data.ok) {
    if (data.reason === 'not_registered') forgetPlayer();
    return { ok: false, reason: data.reason ?? 'rejected' };
  }
  return toSubmit(data);
}

const REVIEW_KEY = 'tile.stack.review';
/** a round of yours that is waiting on a check — only you ever see it. */
export function reviewScore(): number {
  try { return Number(window.localStorage.getItem(REVIEW_KEY)) || 0; } catch { return 0; }
}
export function setReviewScore(score: number) {
  try { if (score > reviewScore()) window.localStorage.setItem(REVIEW_KEY, String(score)); } catch { /* ignore */ }
}

export function localBest(): number {
  try {
    return Number(window.localStorage.getItem(LOCAL_BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function saveLocalBest(score: number) {
  try {
    if (score > localBest()) window.localStorage.setItem(LOCAL_BEST_KEY, String(score));
  } catch {
    /* ignore */
  }
}

export function musicOn(): boolean {
  try {
    return window.localStorage.getItem(MUSIC_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setMusicOn(on: boolean) {
  try {
    window.localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

/** dubai is utc+4 all year; a week ends when dubai clocks hit monday 00:00. */
const DUBAI_OFFSET_MS = 4 * 60 * 60 * 1000;

export function nextResetAt(now: Date = new Date()): Date {
  const local = new Date(now.getTime() + DUBAI_OFFSET_MS);
  const day = local.getUTCDay();
  const daysToMonday = ((8 - day) % 7) || 7;
  const target = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + daysToMonday,
    0,
    0,
    0
  );
  return new Date(target - DUBAI_OFFSET_MS);
}

export function countdownParts(target: Date, now: Date = new Date()) {
  const ms = Math.max(0, target.getTime() - now.getTime());
  const totalMinutes = Math.floor(ms / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor(totalMinutes / 60) % 24,
    minutes: totalMinutes % 60,
    done: ms <= 0,
  };
}

export function formatCountdown(target: Date, now: Date = new Date()) {
  const { days, hours, minutes, done } = countdownParts(target, now);
  if (done) return 'resetting now';
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

const NICK_KEY = 'tile.stack.nickname';

/** remembered so the leaderboard can highlight "you." */
export function myNickname(): string | null {
  try {
    return window.localStorage.getItem(NICK_KEY);
  } catch {
    return null;
  }
}

export function setMyNickname(nickname: string) {
  try {
    window.localStorage.setItem(NICK_KEY, nickname);
  } catch {
    /* ignore */
  }
}

/** the highest-scoring round that hasn't reached the leaderboard yet (e.g. played before sign-up or while offline). */
export type PendingRun = { runId: string; score: number };
const PENDING_KEY = 'tile.stack.pending';

export function pendingRun(): PendingRun | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(PENDING_KEY) ?? 'null');
    return value && typeof value.runId === 'string' && typeof value.score === 'number' && !value.tapTicks ? value : null;
  } catch {
    return null;
  }
}

/** keeps only the best unsaved round; returns the round that should be submitted. */
export function keepPendingRun(run: PendingRun): PendingRun {
  const current = pendingRun();
  if (current && current.score >= run.score) return current;
  try { window.localStorage.setItem(PENDING_KEY, JSON.stringify(run)); } catch { /* ignore */ }
  return run;
}

export function clearPendingRun() {
  try { window.localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}
