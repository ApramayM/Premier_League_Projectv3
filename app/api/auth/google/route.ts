import {db} from '@/lib/store';
import {CHALLENGE,SESSION,authCookie,cookieValue,digest,randomToken,sameOrigin,verifyCredential} from '@/lib/player-auth';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(!sameOrigin(req)||!req.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'Sign-in request rejected.'},{status:403});
 try{const raw=await req.text();if(raw.length>12000)throw new Error('Invalid request');const body=JSON.parse(raw);const nonce=cookieValue(req.headers.get('cookie'),CHALLENGE);if(!/^[a-f0-9]{64}$/.test(nonce)||typeof body.credential!=='string')throw new Error('Invalid request');
 const challenge=await db().prepare('SELECT expires_at FROM login_challenges WHERE token_hash=? AND expires_at>?').bind(await digest(nonce),Date.now()).first();if(!challenge)throw new Error('Expired challenge');
 const sub=await verifyCredential(body.credential,nonce);
 const consumed=await db().prepare('DELETE FROM login_challenges WHERE token_hash=? AND expires_at>? RETURNING token_hash').bind(await digest(nonce),Date.now()).first();if(!consumed)throw new Error('Already used challenge');
 const id=crypto.randomUUID();await db().prepare('INSERT INTO players (id,google_sub,display_name,created_at,last_trade_at) VALUES (?,?,?,?,0) ON CONFLICT(google_sub) DO NOTHING').bind(id,sub,'Player '+id.slice(0,8),Date.now()).run();
 const player=await db().prepare('SELECT id FROM players WHERE google_sub=?').bind(sub).first<{id:string}>();if(!player)throw new Error('Unavailable');
 const token=randomToken();await db().prepare('INSERT INTO player_sessions (token_hash,player_id,expires_at) VALUES (?,?,?)').bind(await digest(token),player.id,Date.now()+14*86400000).run();
 const response=Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});response.headers.append('Set-Cookie',authCookie(SESSION,token,14*86400));response.headers.append('Set-Cookie',authCookie(CHALLENGE,'',0));return response;
 }catch{return Response.json({error:'Sign-in could not be completed. Please refresh and try again.'},{status:401});}
}
