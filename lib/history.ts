import {portfolioValue,type Account,type Market} from './market';
export type HistoryPoint={at:number;cash:number;value:number;revision:number};
export function historyPoint(account:Account,markets:Market[],at=Date.now()):HistoryPoint{return {at,cash:account.cash,value:portfolioValue(account,markets),revision:account.revision};}
export const historyBucket=(at:number)=>Math.floor(at/3600000)*3600000;
