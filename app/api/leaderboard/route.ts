import {db} from '@/lib/store';
import {getPlayer} from '@/lib/player-auth';
import {liveMarkets} from '@/lib/live-feed';
import {rankPlayers} from '@/lib/leaderboard';
import type {Account} from '@/lib/market';
export const dynamic='force-dynamic';
export async function GET(){try{const player=await getPlayer();if(!player)return Response.json({error:'Sign in to see the leaderboard.'},{status:401});const feed=await liveMarkets();const rows=await db().prepare("SELECT p.id,p.display_name AS displayName,a.data FROM players p JOIN portfolios a ON a.id=p.id || ':live' WHERE p.last_trade_at>=?").bind(Date.now()-30*86400000).all<{id:string;displayName:string;data:string}>();
 const ranked=rankPlayers(rows.results.map(p=>({...p,account:JSON.parse(p.data) as Account})),feed.markets);
 const clean=(p:(typeof ranked)[number])=>({rank:p.rank,name:p.name,value:p.value,returnPercent:p.returnPercent,isYou:p.id===player.userId});
 const me=ranked.find(p=>p.id===player.userId);return Response.json({players:ranked.slice(0,100).map(clean),yourRank:me?clean(me):null,total:ranked.length,updatedAt:feed.fetchedAt,healthy:feed.fixturesConnected},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Leaderboard is temporarily unavailable.'},{status:503});}}
