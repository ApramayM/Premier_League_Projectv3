import {ODDS_REFRESH_MS,snapshotIsFresh} from './odds-policy';

import {db} from './store';
import {pricesFromOdds,type Market} from './market';
export const connected=()=>Boolean(process.env.ODDS_API_KEY);
type Book={key:string;title:string;last_update:string;markets:{key:string;last_update?:string;outcomes:{name:string;price:number}[]}[]};
type Event={id:string;home_team:string;away_team:string;commence_time:string;bookmakers:Book[]};
async function provider(path:string,params:Record<string,string>){const url=new URL('https://api.the-odds-api.com/v4/sports/soccer_epl/'+path);url.search=new URLSearchParams({...params,apiKey:process.env.ODDS_API_KEY!}).toString();const r=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('The live odds provider is unavailable. Trading is paused until fresh prices return.');return r.json();}
export function fresh(m:Market){return snapshotIsFresh(m.snapshotAt??0);}
export async function oddsMarkets():Promise<{markets:Market[];notice:string;fetchedAt:number}>{
 if(!connected())return {markets:[],notice:'Live odds are not connected. A server-side The Odds API key is needed to activate this market.',fetchedAt:0};
 const cached=await db().prepare('SELECT data,updated FROM feed_cache WHERE id=?').bind('epl').first<{data:string;updated:number}>();
 if(cached&&Date.now()-cached.updated<ODDS_REFRESH_MS)return {...JSON.parse(cached.data),fetchedAt:cached.updated};
 const attemptAt=Date.now();const claim=await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated WHERE feed_cache.updated<=?').bind('odds-attempt',attemptAt,'{}',attemptAt-ODDS_REFRESH_MS).run();
 if(claim.meta.changes!==1)return {markets:cached?(JSON.parse(cached.data).markets as Market[]).map(m=>({...m,closed:true})):[],notice:'The daily odds update is pending or unavailable. Trading resumes when the next daily snapshot succeeds.',fetchedAt:cached?.updated??0};
 try{const raw=await provider('odds',{regions:'uk',markets:'h2h',oddsFormat:'decimal'}) as Event[];if(!Array.isArray(raw))throw new Error('Invalid feed.');
 const previous:Market[]=cached?JSON.parse(cached.data).markets:[];const markets:Market[]=previous.map(m=>({...m,closed:true}));
 for(const event of raw){const prior=previous.find(m=>m.id===event.id);const book=prior?event.bookmakers.find(b=>b.key===prior.source):[...event.bookmakers].sort((a,b)=>a.key.localeCompare(b.key)).find(b=>b.markets.some(m=>m.key==='h2h'&&m.outcomes.length===3));if(!book)continue;const h2h=book.markets.find(m=>m.key==='h2h');if(!h2h)continue;const odds=[event.home_team,'Draw',event.away_team].map(n=>h2h.outcomes.find(o=>o.name===n)?.price??0);if(odds.some(x=>!Number.isFinite(x)||x<=1)||!Number.isFinite(Date.parse(event.commence_time)))continue;
 const m:Market={id:event.id,home:event.home_team,away:event.away_team,kickoff:event.commence_time,odds,prices:pricesFromOdds(odds),updated:h2h.last_update||book.last_update,source:book.key,snapshotAt:attemptAt,result:prior?.result};const index=markets.findIndex(m=>m.id===event.id);if(index>=0)markets[index]=m;else markets.push(m);}
 const notice='Odds are updated once every 24 hours. These are daily snapshot prices.';
 const updated=Date.now();await db().prepare('INSERT INTO feed_cache (id,updated,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,data=excluded.data').bind('epl',updated,JSON.stringify({markets,notice})).run();return {markets,notice,fetchedAt:updated};
 }catch{if(cached)return {markets:(JSON.parse(cached.data).markets as Market[]).map(m=>({...m,closed:true})),notice:'Live refresh failed. Last known prices are shown; trading is paused.',fetchedAt:cached.updated};return {markets:[],notice:'Live data is currently unavailable. Try refreshing shortly.',fetchedAt:0};}
}
