import {neon} from '@neondatabase/serverless';
export type QueryResult={rows:Record<string,unknown>[];rowCount:number};
export type QueryExecutor=(text:string,values:unknown[])=>Promise<QueryResult>;
const numericFields=new Set(['at','cash','value','revision','updated','bucket','expires_at','created_at','last_trade_at']);
export function postgresParameters(text:string){let n=0;return text.replace(/\?/g,()=>'$'+(++n));}
function normalize(row:Record<string,unknown>){return Object.fromEntries(Object.entries(row).map(([k,v])=>{if(numericFields.has(k)&&typeof v==='string'&&/^-?\d+$/.test(v)){const number=Number(v);if(!Number.isSafeInteger(number))throw new Error('Stored numeric value exceeds supported range.');return [k,number];}return [k,v];}));}
export function createDatabase(execute:QueryExecutor){
 class Statement{
  constructor(readonly text:string,readonly values:unknown[]=[]){}
  bind(...values:unknown[]){return new Statement(this.text,values);}
  async first<T=Record<string,unknown>>():Promise<T|null>{const r=await execute(postgresParameters(this.text),this.values);return r.rows[0]?normalize(r.rows[0]) as T:null;}
  async all<T=Record<string,unknown>>(){const r=await execute(postgresParameters(this.text),this.values);return {results:r.rows.map(normalize) as T[]};}
  async run(){const r=await execute(postgresParameters(this.text),this.values);return {meta:{changes:r.rowCount}};}
 }
 return {prepare:(text:string)=>new Statement(text),batch:(statements:Statement[])=>Promise.all(statements.map(s=>s.run()))};
}
let database:ReturnType<typeof createDatabase>|undefined;
export function db(){if(database)return database;const connection=process.env.DATABASE_URL;if(!connection)throw new Error('Portfolio storage is not configured.');const sql=neon(connection);database=createDatabase(async(text,values)=>{const result=await sql.query(text,values,{fullResults:true});return {rows:result.rows as Record<string,unknown>[],rowCount:result.rowCount??0};});return database;}
