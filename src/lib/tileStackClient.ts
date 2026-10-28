/**
 * tile stack — the browser's only window onto the leaderboard backend.
 *
 * the browser never sends a score. it registers a device, asks the server for a
 * run seed, plays, and hands back the taps it made; the edge function replays
 * the run and decides what the score was. anything shown here as "your best" is
 * a local convenience and always gets replaced by the server's answer.
 */
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'tile.stack.token';
const LOCAL_BEST_KEY = 'tile.stack.localBest';
const MUSIC_KEY = 'tile.stack.music';

export const PRIZE = {
  headline: 'this week’s prize',
  line: 'top score by sunday midnight wins a free games voucher + a complimentary drink.',
  terms: '*terms & conditions apply',
};

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

export type StartResult = { ok: boolean; runId?: string; seed?: number; reason?: string };

/** every round is a real round: before sign-up the run is unclaimed and gets claimed on save. */
export async function startRun(): Promise<StartResult> {
  const token = getDeviceToken();
  const { data, error } = await supabase.functions.invoke('start-run', { body: token ? { token } : {} });
  if (error || !data) return { ok: false, reason: 'network' };
  if (!data.ok) return { ok: false, reason: data.reason ?? 'rejected' };
  return { ok: true, runId: data.runId, seed: Number(data.seed) };
}

export type SubmitResult = {
  ok: boolean;
  score?: number;
  /** the player's best this week, which is what the rank refers to */
  best?: number;
  rank?: number;
  isFirst?: boolean;
  newBest?: boolean;
  reason?: string;
};

export async function submitRun(runId: string, tapTicks: number[]): Promise<SubmitResult> {
  const token = getDeviceToken();
  if (!token) return { ok: false, reason: 'not_registered' };
  const { data, error } = await supabase.functions.invoke('submit-run', {
    body: { token, runId, tapTicks },
  });
  if (error || !data) return { ok: false, reason: 'network' };
  if (!data.ok) return { ok: false, reason: data.reason ?? 'rejected' };
  return {
    ok: true,
    score: Number(data.score),
    best: Number(data.best ?? data.score),
    rank: Number(data.rank),
    isFirst: Boolean(data.isFirst),
    newBest: Boolean(data.newBest),
  };
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
