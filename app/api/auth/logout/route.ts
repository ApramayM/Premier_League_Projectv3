import {db} from '@/lib/store';
import {SESSION,authCookie,cookieValue,digest,sameOrigin} from '@/lib/player-auth';
export async function POST(req:Request){if(!sameOrigin(req))return new Response(null,{status:403});const token=cookieValue(req.headers.get('cookie'),SESSION);if(token)await db().prepare('DELETE FROM player_sessions WHERE token_hash=?').bind(await digest(token)).run();return Response.json({ok:true},{headers:{'Set-Cookie':authCookie(SESSION,'',0),'Cache-Control':'no-store'}});}
