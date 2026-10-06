# Touchline

A Premier League prediction market using virtual money, live match odds, persistent portfolios, Google sign-in, and an active-player leaderboard. Prepared for independent hosting in your own Cloudflare account.

- Every new account starts with $1,000 virtual dollars.
- Aggregate purchase cost in one match is capped at 10% of current bankroll.
- Winning shares pay $1; losing shares pay $0 after confirmed full-time results.
- Weekly fixtures load automatically; a native hourly scheduled job settles results and records portfolio history even when nobody has the page open.
- Portfolio history has 7-, 30-, and 90-day views.
- Active players are ranked by portfolio value and return. Google identities and emails are not displayed publicly.

See [DEPLOYMENT.md](DEPLOYMENT.md) for hosting, Google setup, backups, and migration requirements.

## Development

Use Node.js 22 or later. Run npm ci, npm test, and npm run build. Local D1 migrations: npx wrangler d1 migrations apply DB --local --config wrangler.standalone.jsonc. Start development with npm run dev. Google login requires an authorized origin and configured client ID; no mock identities are accepted.

## Status

Source is prepared for standalone hosting. Publishing this repository does not deploy a live app. Real Google login and production scheduled execution must be verified after account, database, domain, client ID, and secret configuration. Existing ChatGPT-hosted portfolios are not automatically transferred.

Only virtual money: no deposits, withdrawals, prizes, or real-money bets.

