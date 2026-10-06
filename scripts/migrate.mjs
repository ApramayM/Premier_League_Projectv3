import {neon} from '@neondatabase/serverless';
import {readFileSync} from 'node:fs';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL must be configured before running migrations.');
const sql=neon(process.env.DATABASE_URL);
const statements=readFileSync(new URL('../migrations/001_initial.sql',import.meta.url),'utf8').split(';').map(s=>s.trim()).filter(Boolean);
await sql.transaction(statements.map(text=>sql.query(text)));
console.log('Postgres schema is ready.');
