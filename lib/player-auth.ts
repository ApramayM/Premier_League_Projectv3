import {verifyGoogleToken} from './google-token';

import {headers} from 'next/headers';
import {createRemoteJWKSet} from 'jose';
import {db} from './store';
const keys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export const SESSION='__Host-touchline_session';
export const CHALLENGE='__Host-touchline_challenge';
export type Player={userId:string;displayName:string};
export const randomToken=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function cookieValue(raw:string|null,name:string){return raw?.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)??'';}
export function authCookie(name:string,value:string,seconds:number){return name+'='+value+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age='+seconds;}
export function sameOrigin(req:Request){return !!process.env.APP_ORIGIN&&req.headers.get('origin')===process.env.APP_ORIGIN&&new URL(req.url).origin===process.env.APP_ORIGIN;}
export async function getPlayer():Promise<Player|null>{const h=await headers();const token=cookieValue(h.get('cookie'),SESSION);if(!/^[a-f0-9]{64}$/.test(token))return null;return db().prepare('SELECT p.id AS userId,p.display_name AS displayName FROM player_sessions s JOIN players p ON p.id=s.player_id WHERE s.token_hash=? AND s.expires_at>?').bind(await digest(token),Date.now()).first<Player>();}
export async function verifyCredential(token:string,nonce:string){if(!process.env.GOOGLE_CLIENT_ID)throw new Error('Google sign-in is not configured.');return verifyGoogleToken(token,keys,process.env.GOOGLE_CLIENT_ID,nonce);}
