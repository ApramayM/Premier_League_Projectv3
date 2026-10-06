export const ODDS_REFRESH_MS=24*60*60*1000;
export function snapshotIsFresh(snapshotAt:number,now=Date.now()){return Number.isFinite(snapshotAt)&&snapshotAt>0&&now-snapshotAt<ODDS_REFRESH_MS&&snapshotAt<=now+60000;}
