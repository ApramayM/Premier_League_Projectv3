import {db} from './store';
import {connected,oddsMarkets} from './feed';
import {mapFixtures,type Bootstrap,type Fixture,type Week} from './fixtures';
import type {Market} from './market';
export type LiveFeed={markets:Market[];weeks:Week[];selectedWeek:number;notice:string;fetchedAt:number;fixturesUpdated:number;fixturesConnected:boolean};
async function publicJson(url:string){const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('Premier League fixture feed unavailable.');return r.json();}
async function fixtureSource(){const row=await db().prepare('SELECT data,updated FROM feed_cache WHERE id=?').bind('pl-fixtures').first<{data:string;updated:number}>();if(row&&Date.now()-row.updated<900000)return {...JSON.parse(row.data),updated:row.updated} as {bootstrap:Bootstrap;fixtures:Fixture[];updated:number};
 const [bootstrapRaw,fixturesRaw]=await Promise.all([publicJson('https://fantasy.premierleague.com/api/bootstrap-static/'),publicJson('https://fantasy.premierleague.com/api/fixtures/')]);
 const b=bootstrapRaw as Bootstrap;const f=fixturesRaw as Fixture[];if(!Array.isArray(b.teams)||!Array.isArray(b.events)||!Array.isArray(f)||f.length<1)throw new Error('Incomplete fixture data.');
 const bootstrap:Bootstrap={teams:b.teams.map(t=>({id:t.id,name:t.name})),events:b.events.map(e=>({id:e.id,name:e.name,is_current:e.is_current,is_next:e.is_next}))};
 const fixtures=f.map(x=>({id:x.id,code:x.code,event:x.event,team_h:x.team_h,team_a:x.team_a,kickoff_time:x.kickoff_time,started:x.started,finished:x.finished,finished_provisional:x.finished_provisional,team_h_score:x.team_h_score,team_a_score:x.team_a_score}));
 const updated=Date.now();await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,data=excluded.data').bind('pl-fixtures',updated,JSON.stringify({bootstrap,fixtures})).run();return {bootstrap,fixtures,updated};}
export async function liveMarkets():Promise<LiveFeed>{
 const row=await db().prepare('SELECT data,updated FROM feed_cache WHERE id=?').bind('weekly-markets').first<{data:string;updated:number}>();const prior:LiveFeed|null=row?JSON.parse(row.data):null;if(row&&Date.now()-row.updated<60000&&prior)return prior;
 // One refresher at a time prevents older requests from overwriting newer final scores.
 const now=Date.now();const lease=await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated WHERE feed_cache.updated < ?').bind('weekly-refresh-lock',now+45000,'{}',now).run();
 if(lease.meta.changes!==1){if(prior)return prior;return {markets:[],weeks:[],selectedWeek:0,notice:'The weekly schedule is updating. It will appear on the next refresh.',fetchedAt:0,fixturesUpdated:0,fixturesConnected:false};}
 try{const [official,odds]=await Promise.all([fixtureSource(),oddsMarkets()]);const merged=mapFixtures(official.bootstrap,official.fixtures,prior?.markets??odds.markets,odds.markets);
 const notice=connected()?odds.notice||'Weekly fixtures and final scores from the Premier League. Confirmed results settle automatically.':'Weekly fixtures and final scores are connected. Live odds need a provider key; matches without prices cannot be traded.';
 const feed:LiveFeed={...merged,notice,fetchedAt:Date.now(),fixturesUpdated:official.updated,fixturesConnected:true};
 await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,data=excluded.data').bind('weekly-markets',feed.fetchedAt,JSON.stringify(feed)).run();return feed;
 }catch{if(prior)return {...prior,markets:prior.markets.map(m=>({...m,closed:true})),fixturesConnected:false,notice:'The fixture refresh failed. Last confirmed results are retained; new trading is paused.'};return {markets:[],weeks:[],selectedWeek:0,notice:'The Premier League fixture feed is unavailable. Please try again shortly.',fetchedAt:0,fixturesUpdated:0,fixturesConnected:false};}
 finally{await db().prepare('DELETE FROM feed_cache WHERE id=? AND updated=?').bind('weekly-refresh-lock',now+45000).run();}
}
