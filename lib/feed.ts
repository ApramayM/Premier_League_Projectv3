import {snapshotIsFresh} from './odds-policy';
import {db} from './store';
import {pricesFromOdds,type Market} from './market';
export const connected=()=>Boolean(process.env.API_FOOTBALL_KEY);
export const DAILY_REQUEST_LIMIT=10;
const CACHE='api-football-epl';
type Feed={markets:Market[];notice:string;fetchedAt:number};
type Fixture={fixture:{id:number;date:string};teams:{home:{name:string};away:{name:string}}};
type Book={id:number;name:string;bets:{id:number;values:{value:string;odd:string}[]}[]};
type Quote={fixture:{id:number;date:string};update:string;bookmakers:Book[]};
type Envelope<T>={errors:Record<string,unknown>|unknown[];response:T[];paging:{current:number;total:number}};
class FeedError extends Error{}
export function fresh(m:Market){return snapshotIsFresh(m.snapshotAt??0);}
async function save(id:string,data:unknown,updated=Date.now()){
 await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,data=excluded.data').bind(id,updated,JSON.stringify(data)).run();
}
// Public reads never contact the odds provider, including cache misses and failures.
export async function oddsMarkets():Promise<Feed>{
 const cached=await db().prepare('SELECT data,updated FROM feed_cache WHERE id=?').bind(CACHE).first<{data:string;updated:number}>();
 const status=await db().prepare('SELECT data FROM feed_cache WHERE id=?').bind('odds-status').first<{data:string}>();
 const markets:Market[]=cached?JSON.parse(cached.data).markets:[];
 return {markets:markets.map(m=>({...m,closed:m.closed||!fresh(m)})),fetchedAt:cached?.updated??0,notice:!connected()?'API-Football is not connected. Matches without fresh odds cannot be traded.':status?JSON.parse(status.data).notice:'The first daily API-Football update is pending.'};
}
// Only the authenticated scheduled job calls this. Database guards work across instances.
export async function refreshDailyOdds():Promise<Feed>{
 if(!connected())return oddsMarkets();
 const started=Date.now(),day=new Date(started).toISOString().slice(0,10);
 const claim=await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind('football-attempt:'+day,started,'{}').run();
 if(claim.meta.changes!==1)return oddsMarkets();
 const deadline=AbortSignal.timeout(30000);
 async function provider<T>(path:string,params:Record<string,string>):Promise<Envelope<T>>{
  const budget=await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=(CAST(feed_cache.data AS integer)+1)::text WHERE CAST(feed_cache.data AS integer)<?').bind('football-budget:'+day,started,'1',DAILY_REQUEST_LIMIT).run();
  if(budget.meta.changes!==1)throw new FeedError('The app daily request limit was reached. No more odds requests will run today.');
  const url=new URL('https://v3.football.api-sports.io/'+path);url.search=new URLSearchParams(params).toString();
  const response=await fetch(url,{headers:{'x-apisports-key':process.env.API_FOOTBALL_KEY!},cache:'no-store',signal:AbortSignal.any([deadline,AbortSignal.timeout(8000)])});
  if(response.status===429)throw new FeedError('API-Football request allowance is exhausted. The next scheduled update will retry tomorrow.');
  if(response.status===401||response.status===403)throw new FeedError('API-Football rejected the server key or account access.');
  if(!response.ok)throw new FeedError('API-Football is temporarily unavailable. The next scheduled update will retry tomorrow.');
  const body=await response.json() as Envelope<T>;
  if(body.errors&&Object.keys(body.errors).length){
   const error=JSON.stringify(body.errors).toLowerCase();
   if(/season|subscription|plan/.test(error))throw new FeedError('API-Football does not permit this season on the connected plan. No paid upgrade has been enabled.');
   if(/limit|quota|request/.test(error))throw new FeedError('API-Football request allowance is unavailable. The next scheduled update will retry tomorrow.');
   throw new FeedError('API-Football rejected the data request. Check the account key and access.');
  }
  if(!Array.isArray(body.response)||!Number.isInteger(body.paging?.total)||body.paging.total<1)throw new FeedError('API-Football returned incomplete data. Last known prices are retained.');
  return body;
 }
 try{
  const now=new Date(started),season=String(now.getUTCFullYear()-(now.getUTCMonth()<6?1:0));
  const fixtures=await provider<Fixture>('fixtures',{league:'39',season});
  if(fixtures.paging.total!==1)throw new FeedError('API-Football returned incomplete fixture data.');
  const teams=new Map(fixtures.response.map(f=>[f.fixture.id,f]));
  const previous=await oddsMarkets();const markets:Market[]=previous.markets.map(m=>({...m,closed:true}));
  let pages=1,quoted=0;
  for(let page=1;page<=pages;page++){
   const batch=await provider<Quote>('odds',{league:'39',season,bet:'1',page:String(page)});
   pages=batch.paging.total;
   if(pages>8||batch.paging.current!==page)throw new FeedError('API-Football response exceeds the safe daily batch size. Last known prices are retained.');
   for(const quote of batch.response){
    const fixture=teams.get(quote.fixture.id);if(!fixture)continue;
    const id='af:'+quote.fixture.id,prior=markets.find(m=>m.id===id);
    const books=[...quote.bookmakers].sort((a,b)=>a.id-b.id);
    const book=prior?books.find(b=>'api-football:'+b.id===prior.source):books.find(b=>b.bets.some(x=>x.id===1&&['Home','Draw','Away'].every(v=>x.values.some(o=>o.value===v&&Number(o.odd)>1))));
    const winner=book?.bets.find(b=>b.id===1);if(!book||!winner)continue;
    const odds=['Home','Draw','Away'].map(v=>Number(winner.values.find(o=>o.value===v)?.odd));
    const updated=Date.parse(quote.update),kickoff=Date.parse(fixture.fixture.date);
    if(odds.some(o=>!Number.isFinite(o)||o<=1)||!Number.isFinite(kickoff)||!snapshotIsFresh(updated,started)||kickoff<=started)continue;
    const market:Market={id,home:fixture.teams.home.name,away:fixture.teams.away.name,kickoff:fixture.fixture.date,odds,prices:pricesFromOdds(odds),source:'api-football:'+book.id,updated:quote.update,snapshotAt:Math.min(started,updated)};
    const index=markets.findIndex(m=>m.id===id);if(index<0)markets.push(market);else markets[index]=market;quoted++;
   }
  }
  await save(CACHE,{markets});
  await save('odds-status',{notice:quoted?'API-Football odds update once daily. Visiting or refreshing this page uses saved prices.':'API-Football returned no fresh upcoming Premier League odds. Trading remains paused until prices are available.',ok:true,quoted});
 }catch(error){
  await save('odds-status',{notice:error instanceof FeedError?error.message:'The daily API-Football update failed. Last known prices remain visible; expired prices cannot be traded. The next attempt is tomorrow.',ok:false});
 }
 return oddsMarkets();
}
