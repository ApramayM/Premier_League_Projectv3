# Deploy through GitHub to Vercel

## Connect the project

Import ApramayM/Premier_League_Projectv3 into your Vercel account, with main as the production branch and the repository root as the root directory. The project configuration selects Next.js. Keep Vercel's Git integration enabled so every main-branch push deploys automatically. No ChatGPT service is involved in this runtime.

## Database and environment

Use Vercel Storage to create/connect a Neon Postgres database on the free plan. Review and accept provider terms yourself. Ensure it supplies DATABASE_URL to the production project. For previews use a separate Neon branch/database.

Set these in the project's production environment variables (never GitHub source):

| Variable | Value |
| --- | --- |
| DATABASE_URL | Neon connection string supplied by the integration |
| APP_ORIGIN | https://premierleagueprojectv3.vercel.app, without a trailing slash |
| GOOGLE_CLIENT_ID | Your Google OAuth Web application client ID |
| API_FOOTBALL_KEY | Your private API-Sports / API-Football free-plan key |
| CRON_SECRET | A random secret of at least 32 characters |

Google's Authorized JavaScript origins must include the exact APP_ORIGIN. This Google Identity Services integration needs the public client ID, not a client secret. Sign-in uses verified signatures, issuer, audience, expiry, issued-at, single-use nonce validation, and hashed server-side session tokens in Secure HttpOnly cookies.

On a production deployment with DATABASE_URL configured, the build runs the idempotent schema migration in a transaction. Builds without a database can complete so the project can be provisioned; trading and saved portfolios remain unavailable until the database is connected. Configure secrets and redeploy after setup.

## Scheduling

Vercel Hobby's single daily job calls /api/cron at 03:05 UTC (08:35 India time). Hobby may invoke it anytime within the following 59 minutes. The endpoint requires Vercel's Authorization: Bearer CRON_SECRET header; missing or wrong credentials are denied. Public POST /api/sync cannot trigger updates.

Only the authenticated cron job can contact API-Football. A database claim permits one batch per UTC calendar day, including failed attempts. Every outbound request reserves part of a durable 10-request daily budget; the batch has one fixtures request and at most eight odds pages, with no retries. Page visits, trades, leaderboard reads and manual refreshes only read saved odds, even on a cache miss. No paid fallback is configured. Verify current-season EPL access on the free account before claiming live odds are available. HTTP 200 provider errors are handled as failures.

Prices expire 24 hours after the provider timestamp and cannot be traded after expiry or kickoff. A failed batch retains prior prices without extending their timestamp. Fixtures and confirmed results come from the official Premier League feed, cached for 15 minutes independently of odds. Merged market data is cached for five minutes. Visible live screens poll every five minutes with overlapping requests suppressed; hidden and demo screens do not poll. Hobby settlement can wait until the next daily job if nobody visits.

A paid plan or separate scheduler is required for hourly unattended settlement. Do not change the cron to hourly on Hobby. Monitor runtime logs and the last settlement check. Large player populations will need queued settlement batches before exceeding function execution limits.

## Verification

Run npm test and npm run build. Tests cover market rules, ranking/ties, Google token verification, real PostgreSQL query semantics via an isolated local test engine, optimistic concurrency, history, duplicate settlements, and cache-only public reads, concurrent daily jobs, durable request budgets, bounded pagination, provider errors and stale odds.

After deployment verify Google login/logout, two separate players, a trade and 10% cap, leaderboard access, a successful authenticated cron run, and saved history after refresh. Real Google sign-in is unverified until the live client ID/domain are configured.

## Existing data and backups

The old ChatGPT-hosted app and database are unchanged. Existing portfolios and history have not been exported or imported. New Google accounts start with $1,000. Before switching existing players, obtain an authorized old-database export, verify balances/history, and map accounts only after proving ownership of both identities. Never match identities by names or an unverified email.

Keep the old app available until login, balances, and history are verified on Vercel, then disable the old settlement automation. GitHub stores code, not the database: retain private Postgres exports and configure the recovery options available on your Neon plan. Test restoration separately. No hosting provider guarantees uninterrupted service.
