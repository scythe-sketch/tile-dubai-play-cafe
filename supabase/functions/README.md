# tile stack backend

register-player validates a nickname and private contact, stores only a sha-256 device-token digest, and returns the random token once. start-run authenticates that token and issues a random seed. submit-run accepts taps, never a client score, and replays the byte-identical simulation. finalize_run performs the atomic ownership, age, single-use, timing and weekly-best checks. review flags stay private.

tokens belong in request bodies; never log them. service-role credentials stay in edge-function environment variables. every response includes the supabase cors headers. expected business rejections return http 200 so the existing browser wrapper can read their reason; malformed requests return 400.

find the public weekly board with weekly_leaderboard() and the previous week's winner with last_week_winner(). an authorized staff service must separately look up the winning player's private contact; never expose that contact through public leaderboard functions. review suspicious runs before awarding prizes.

the managed platform deploys each function's index.ts automatically. no config.toml changes are needed. keep _shared/tileStackSim.ts byte-identical to src/game/tileStackSim.ts whenever the simulation changes.

## outstanding hardening

the specified count-then-insert limits are not atomic: parallel requests can exceed registration and run-start quotas. strict enforcement needs database transactions that serialize per ip/player (for example, new service-role-only rpc functions with transaction-level advisory locks). this cannot be guaranteed by these edge functions alone with the currently provided database interface. do not represent these limits as concurrency-safe.

finalize_run currently reports new_best when the submitted score equals the stored best, even when no update happened. its upsert correctly updates only on strictly higher scores; the return flag needs a database-side correction if ties must return false.
