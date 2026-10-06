
import {db} from '@/lib/store';
import {CHALLENGE,authCookie,digest,randomToken} from '@/lib/player-auth';
export const dynamic='force-dynamic';
export async function GET(){if(!process.env.GOOGLE_CLIENT_ID||!process.env.APP_ORIGIN)return Response.json({configured:false},{headers:{'Cache-Control':'no-store'}});const nonce=randomToken();await db().prepare('INSERT INTO login_challenges (token_hash,expires_at) VALUES (?,?)').bind(await digest(nonce),Date.now()+600000).run();return Response.json({configured:true,clientId:process.env.GOOGLE_CLIENT_ID,nonce},{headers:{'Cache-Control':'no-store','Set-Cookie':authCookie(CHALLENGE,nonce,600)}});}
