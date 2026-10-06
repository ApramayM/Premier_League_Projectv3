import {db,settleLivePortfolios} from './store';
import {liveMarkets} from './live-feed';
export async function syncAllPortfolios(){
 const feed=await liveMarkets();let cursor='';let processed=0;let settledAccounts=0;
 do{const result=await settleLivePortfolios(feed.markets,cursor);processed+=result.processed;settledAccounts+=result.settledAccounts;cursor=result.nextCursor??'';}while(cursor);
 const status={processed,settledAccounts,fixtures:feed.markets.filter(m=>m.fixtureCode).length,confirmedResults:feed.markets.filter(m=>m.result).length,fixturesUpdated:feed.fixturesUpdated,fixturesConnected:feed.fixturesConnected,completedAt:new Date().toISOString(),notice:feed.notice};
 await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,data=excluded.data').bind('sync-status',Date.now(),JSON.stringify(status)).run();
 await db().batch([db().prepare('DELETE FROM player_sessions WHERE expires_at<?').bind(Date.now()),db().prepare('DELETE FROM login_challenges WHERE expires_at<?').bind(Date.now())]);
 if(!feed.fixturesConnected)throw new Error('Fixture source unavailable; settlement will retry at the next scheduled run.');
 return status;
}
