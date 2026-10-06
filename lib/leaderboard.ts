import {portfolioValue,UNIT,type Account,type Market} from './market';
export type Competitor={id:string;displayName:string;account:Account};
export function rankPlayers(players:Competitor[],markets:Market[]){const sorted=players.map(p=>({id:p.id,name:p.displayName,value:portfolioValue(p.account,markets)})).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));let rank=0;return sorted.map((p,i)=>{if(i===0||p.value!==sorted[i-1].value)rank=i+1;return {...p,rank,returnPercent:(p.value/(1000*UNIT)-1)*100};});}
