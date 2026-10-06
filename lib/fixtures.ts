import type {Market,Outcome} from './market';
export type Week={id:number;name:string;is_current:boolean;is_next:boolean};
export type Bootstrap={teams:{id:number;name:string}[];events:Week[]};
export type Fixture={id:number;code:number;event:number|null;team_h:number;team_a:number;kickoff_time:string|null;started:boolean|null;finished:boolean;finished_provisional:boolean;team_h_score:number|null;team_a_score:number|null};
const aliases:Record<string,string>={'man city':'manchester city','man utd':'manchester united','man united':'manchester united','spurs':'tottenham hotspur','tottenham':'tottenham hotspur','newcastle':'newcastle united','brighton and hove albion':'brighton','brighton & hove albion':'brighton','nottm forest':'nottingham forest','nott m forest':'nottingham forest','leeds':'leeds united','wolves':'wolverhampton wanderers','ipswich':'ipswich town','west ham':'west ham united'};
export function teamKey(name:string){const cleaned=name.toLowerCase().replace(/[.'’]/g,'').replace(/\s+/g,' ').trim();return aliases[cleaned]??cleaned;}
export function sameFixture(a:Pick<Market,'home'|'away'|'kickoff'>,b:Pick<Market,'home'|'away'|'kickoff'>){return teamKey(a.home)===teamKey(b.home)&&teamKey(a.away)===teamKey(b.away)&&!!a.kickoff&&!!b.kickoff&&Math.abs(Date.parse(a.kickoff)-Date.parse(b.kickoff))<=6*3600000;}
export function mapFixtures(bootstrap:Bootstrap,fixtures:Fixture[],previous:Market[],quotes:Market[]){
 if(!Array.isArray(bootstrap.teams)||!Array.isArray(bootstrap.events)||!Array.isArray(fixtures)||!fixtures.length)throw new Error('The fixture feed is incomplete.');
 const teams=new Map(bootstrap.teams.map(t=>[t.id,t.name]));
 const markets:Market[]=fixtures.map(f=>{const home=teams.get(f.team_h),away=teams.get(f.team_a);if(!home||!away||!Number.isInteger(f.code))throw new Error('Unknown fixture teams.');const identity={home,away,kickoff:f.kickoff_time};const prior=previous.find(m=>m.fixtureCode===f.code)??previous.find(m=>!m.fixtureCode&&sameFixture(m,identity));const quote=quotes.find(m=>sameFixture(m,identity));
 const scoresValid=Number.isInteger(f.team_h_score)&&Number.isInteger(f.team_a_score)&&f.team_h_score!>=0&&f.team_a_score!>=0;
 const result:Outcome|undefined=prior?.result??(f.finished===true&&f.finished_provisional===true&&scoresValid?(f.team_h_score!>f.team_a_score!?'home':f.team_h_score!<f.team_a_score!?'away':'draw'):undefined);
 return {id:prior?.id??`pl:${f.code}`,fixtureCode:f.code,archived:false,...identity,week:f.event,homeScore:f.team_h_score,awayScore:f.team_a_score,started:f.started===true,result,odds:quote?.odds??prior?.odds??[],prices:quote?.prices??prior?.prices??[],updated:quote?.updated??prior?.updated??'',snapshotAt:quote?.snapshotAt??prior?.snapshotAt,source:quote?.source??prior?.source??'',quoted:!!quote&&!quote.closed,closed:!!result||f.started===true||!f.kickoff_time||!quote||quote.closed};});
 // Keep historical positions addressable after a new season replaces the public feed.
 for(const old of previous)if(!markets.some(m=>m.id===old.id))markets.push({...old,closed:true,archived:true});
 const weeks=bootstrap.events.map(e=>({id:e.id,name:e.name,is_current:e.is_current,is_next:e.is_next}));
 const current=weeks.find(w=>w.is_current&&markets.some(m=>m.week===w.id&&!m.result));const selectedWeek=current?.id??weeks.find(w=>w.is_next)?.id??weeks.find(w=>w.is_current)?.id??weeks[0]?.id??0;
 return {markets,weeks,selectedWeek};
}
