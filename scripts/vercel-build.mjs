import {spawnSync} from 'node:child_process';
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
// Only production deploys migrate the connected production database.
// Preview deployments should receive an isolated database through Neon.
if(process.env.VERCEL_ENV==='production'&&process.env.DATABASE_URL)run(['scripts/migrate.mjs']);
run(['node_modules/next/dist/bin/next','build']);
