# Touchline

Premier League predictions with virtual money, daily odds snapshots, Google sign-in, persistent portfolios, automatic settlement, and an active-player leaderboard. Built with Next.js for Vercel and Neon Postgres.

## Game rules

- New players start with $1,000 virtual dollars.
- The aggregate purchase cost of remaining shares in a match cannot exceed 10% of current bankroll when buying.
- Confirmed winning shares pay $1; losing shares pay $0. Trading locks at kickoff.
- Odds are fetched at most once every 24 hours, shared across all players. Page refreshes do not fetch new odds within that window. Expired snapshots pause trading.
- Official fixtures and results refresh separately; odds refreshes do not drive result settlement.
- Vercel Hobby runs the background check daily. Opening a portfolio also settles confirmed results.
- Portfolio history has 7-, 30-, and 90-day views.
- Players who traded in the last 30 days appear on the leaderboard, ranked by total live portfolio value and return. Equal values share a rank. Google names and emails are not published.

## GitHub to Vercel

Connect this repository's main branch to Vercel. Each push produces a deployment; vercel.json selects Next.js, the build command, and a daily cron. See [DEPLOYMENT.md](DEPLOYMENT.md) for setup and migration. GitHub Actions checks the app independently.

## Development

Use Node.js 22 or later. Run npm ci, npm test, and npm run build. Copy .env.example to .env.local and set private environment values for a development Postgres database, then run npm run db:migrate and npm run dev. Never connect preview deployments or tests to a production database.

## Current configuration requirements

A connected Postgres database, Google web client ID, exact application origin, odds key, and cron secret are required to activate all features. Real Google login must be verified on the configured domain. Existing ChatGPT-hosted balances are not automatically transferred. Only virtual money: no deposits, withdrawals, prizes, or real-money bets.
