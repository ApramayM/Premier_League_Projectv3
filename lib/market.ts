export const UNIT=1000000;
export type Outcome='home'|'draw'|'away';
export type Market={id:string;home:string;away:string;odds:number[];prices:number[];kickoff:string|null;updated:string;source:string;snapshotAt?:number;result?:Outcome;closed?:boolean;quoted?:boolean;week?:number|null;fixtureCode?:number;homeScore?:number|null;awayScore?:number|null;started?:boolean;archived?:boolean};
export type Position={marketId:string;outcome:Outcome;shares:number;cost:number};
export type Trade={id:string;at:string;label:string;kind:'buy'|'sell'|'settle';shares:number;amount:number};
export type Account={cash:number;positions:Position[];trades:Trade[];settled:string[];demoMarkets?:Market[];revision:number};
export const outcomes:Outcome[]=['home','draw','away'];
export function pricesFromOdds(odds:number[]){if(odds.length!==3||odds.some(x=>!Number.isFinite(x)||x<=1))throw new Error('Invalid odds');const probs=odds.map(x=>1/x),sum=probs.reduce((a,b)=>a+b,0);const p=probs.map(x=>Math.round(x/sum*UNIT));p[1]+=UNIT-p.reduce((a,b)=>a+b,0);return p;}
export const examples:Market[]=[['ars-che','Arsenal','Chelsea',[1.8,3.8,4.5]],['mci-new','Manchester City','Newcastle',[1.5,4.6,6.5]],['liv-tot','Liverpool','Tottenham',[1.7,4.2,4.8]],['mun-avl','Manchester United','Aston Villa',[2.3,3.5,3.0]],['bha-bre','Brighton','Brentford',[2.05,3.6,3.7]],['eve-ful','Everton','Fulham',[2.65,3.2,2.85]]].map(([id,home,away,odds])=>({id:id as string,home:home as string,away:away as string,odds:odds as number[],prices:pricesFromOdds(odds as number[]),kickoff:null,updated:'',source:'Illustrative odds'}));
export const freshAccount=():Account=>({cash:1000*UNIT,positions:[],trades:[],settled:[],revision:0});
export const credit=(units:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(units/UNIT);
export function portfolioValue(a:Account,markets:Market[]){return a.cash+a.positions.reduce((total,p)=>{const m=markets.find(m=>m.id===p.marketId);const price=m?.prices[outcomes.indexOf(p.outcome)];return total+(m?.result?(m.result===p.outcome?p.shares*UNIT:0):Number.isFinite(price)?p.shares*price!:p.cost);},0);}
export function matchAllowance(a:Account,marketId:string,markets:Market[]){const bankroll=portfolioValue(a,markets);const limit=Math.max(0,Math.floor(bankroll/10));const committed=a.positions.filter(p=>p.marketId===marketId).reduce((s,p)=>s+p.cost,0);return {bankroll,limit,committed,remaining:Math.max(0,Math.min(a.cash,limit-committed))};}
export const label=(m:Market,o:Outcome)=>o==='home'?m.home:o==='away'?m.away:'Draw';
export function executeTrade(a:Account,m:Market,o:Outcome,side:'buy'|'sell',shares:number,expectedPrice:number,now=Date.now(),markets:Market[]=[m]){
 if(!outcomes.includes(o)||!['buy','sell'].includes(side)||!Number.isSafeInteger(shares)||shares<1||shares>1000000)throw new Error('Choose a whole number of shares between 1 and 1,000,000.');
 if(m.result||m.closed||m.started||(m.kickoff&&Date.parse(m.kickoff)<=now))throw new Error('Trading closes at kickoff.');
 if(m.quoted===false||m.prices.length!==3)throw new Error('Live odds are not available for this match yet.');
 const price=m.prices[outcomes.indexOf(o)];if(expectedPrice!==price)throw new Error('The price changed. Review the refreshed quote and try again.');
 const amount=price*shares,next:Account=structuredClone(a);const p=next.positions.find(x=>x.marketId===m.id&&x.outcome===o);
 if(side==='buy'){if(amount>next.cash)throw new Error('Not enough available virtual dollars.');const allowance=matchAllowance(a,m.id,markets);if(amount>allowance.remaining)throw new Error(`The 10% match limit is ${credit(allowance.limit)}. You can commit ${credit(allowance.remaining)} more to this match across all outcomes.`);next.cash-=amount;if(p){p.shares+=shares;p.cost+=amount;}else next.positions.push({marketId:m.id,outcome:o,shares,cost:amount});}
 else{if(!p||p.shares<shares)throw new Error('You do not own that many shares.');next.cash+=amount;p.cost=p.shares===shares?0:Math.round(p.cost*(p.shares-shares)/p.shares);p.shares-=shares;next.positions=next.positions.filter(x=>x.shares>0);}
 next.trades.unshift({id:crypto.randomUUID(),at:new Date(now).toISOString(),label:`${m.home} v ${m.away} · ${label(m,o)}`,kind:side,shares,amount});return next;
}
export function settle(a:Account,markets:Market[]){const next:Account=structuredClone(a);for(const m of markets){if(!m.result||next.settled.includes(m.id))continue;const ps=next.positions.filter(p=>p.marketId===m.id);if(!ps.length)continue;const winning=ps.filter(p=>p.outcome===m.result).reduce((s,p)=>s+p.shares,0),payout=winning*UNIT;next.cash+=payout;next.positions=next.positions.filter(p=>p.marketId!==m.id);next.settled.push(m.id);next.trades.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),label:`${m.home} v ${m.away} · ${label(m,m.result)} won`,kind:'settle',shares:winning,amount:payout});}return next;}
