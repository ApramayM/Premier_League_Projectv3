import {settlementStatus} from '@/lib/store';
export const dynamic='force-dynamic';
// Only the authenticated cron handler may run the global updater.
export async function POST(){return Response.json({error:'Settlement runs through the host scheduler.'},{status:403});}
export async function GET(){return Response.json(await settlementStatus(),{headers:{'Cache-Control':'no-store'}});}
