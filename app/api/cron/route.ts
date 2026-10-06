import {timingSafeEqual} from 'node:crypto';
import {syncAllPortfolios} from '@/lib/sync';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(req:Request){const expected=process.env.CRON_SECRET;const supplied=req.headers.get('authorization');if(!expected||expected.length<32||!supplied)return new Response('Unauthorized',{status:401});const a=Buffer.from(supplied),b=Buffer.from('Bearer '+expected);if(a.length!==b.length||!timingSafeEqual(a,b))return new Response('Unauthorized',{status:401});try{return Response.json(await syncAllPortfolios(),{headers:{'Cache-Control':'no-store'}});}catch{console.error('Scheduled settlement did not complete.');return Response.json({error:'Settlement check failed. Retrying is safe.'},{status:503});}}
