import { lazy, Suspense, useEffect, useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchLeaderboard,
  formatCountdown,
  nextResetAt,
  PRIZE,
  type LeaderboardRow,
} from '@/lib/tileStackClient';
import { termsNote } from '@/lib/tile-content';

/** the game is heavy; it only reaches the browser once the overlay is opened. */
const TileStackOverlay = lazy(() =>
  import('@/components/play/TileStackOverlay').then((module) => ({ default: module.TileStackOverlay }))
);

export const PlaySection = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let alive = true;
    fetchLeaderboard()
      .then((board) => {
        if (alive) setRows(board.rows.slice(0, 3));
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  /* tiledubai.com/#play lands on this section and starts the game */
  useEffect(() => {
    const sync = () => setOpen(window.location.hash === '#play');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const close = () => {
    setOpen(false);
    if (window.location.hash === '#play') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const countdown = formatCountdown(nextResetAt(), now);

  return (
    <section id="play" className="section-band dark-section">
      <div className="page-width play-layout">
        <div className="play-copy">
          <p className="hero-eyebrow">
            <span className="neon-square" /> weekly challenge
          </p>
          <h2>
            stack it.
            <br />
            win it<span className="text-primary">.</span>
          </h2>
          <p className="play-subline">
            top of the leaderboard every week wins {PRIZE.drinks} free drinks at tile.
          </p>
          <div className="play-prize">
            <Trophy />
            <div>
              <h3>
                this week's prize: {PRIZE.drinks} free drinks<span className="price-mark">*</span>
              </h3>
              <p>
                top score by sunday midnight wins<span className="price-mark">*</span>
              </p>
            </div>
          </div>
          <p className="price-terms">{termsNote}</p>
          <Button size="lg" className="play-cta" onClick={() => setOpen(true)}>
            Play tile stack <Play />
          </Button>
        </div>
        <div className="play-preview">
          <div className="play-preview-head">
            <span>this week's top 3</span>
            <span className="play-countdown">resets in {countdown}</span>
          </div>
          {rows.length ? (
            <ol className="play-podium">
              {rows.map((row) => (
                <li key={`${row.rank}-${row.nickname}`} className={`play-row play-rank-${row.rank}`}>
                  <span className="play-rank">{row.rank}</span>
                  <span className="play-nickname">{row.nickname}</span>
                  <span className="play-score">{row.score}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="play-empty">
              {ready ? 'no scores yet this week. be the first.' : 'loading this week’s board…'}
            </p>
          )}
          <p className="play-fineprint">scores are replayed on our server, never taken from your device.</p>
        </div>
      </div>
      {open ? (
        <Suspense fallback={null}>
          <TileStackOverlay open onClose={close} />
        </Suspense>
      ) : null}
    </section>
  );
};
