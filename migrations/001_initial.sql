CREATE TABLE IF NOT EXISTS portfolios (id TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS feed_cache (id TEXT PRIMARY KEY, updated BIGINT NOT NULL, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS portfolio_history (portfolio_id TEXT NOT NULL, bucket BIGINT NOT NULL, at BIGINT NOT NULL, cash BIGINT NOT NULL, value BIGINT NOT NULL, revision INTEGER NOT NULL, PRIMARY KEY (portfolio_id,bucket));
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, google_sub TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, created_at BIGINT NOT NULL, last_trade_at BIGINT NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS players_active ON players(last_trade_at);
CREATE TABLE IF NOT EXISTS player_sessions (token_hash TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), expires_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON player_sessions(expires_at);
CREATE TABLE IF NOT EXISTS login_challenges (token_hash TEXT PRIMARY KEY, expires_at BIGINT NOT NULL);
