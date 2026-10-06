import ts from 'typescript';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
function compiled(file,replacements={}){let code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;for(const [from,to] of Object.entries(replacements))code=code.replaceAll(from,to);return 'data:text/javascript;base64,'+Buffer.from(code).toString('base64');}
const marketUrl=compiled('../lib/market.ts');const {freshAccount,UNIT,examples,executeTrade,settle}=await import(marketUrl);
const {rankPlayers}=await import(compiled('../lib/leaderboard.ts',{"'./market'":JSON.stringify(marketUrl)}));
const base=freshAccount();const m=examples[0];const bought=executeTrade(base,m,'home','buy',100,m.prices[0]);const won=settle(bought,[{...m,result:'home'}]);
const ranks=rankPlayers([{id:'a',displayName:'A',account:base},{id:'b',displayName:'B',account:won},{id:'c',displayName:'C',account:base}],[m]);
assert.equal(ranks[0].name,'B');assert.deepEqual(ranks.map(p=>p.rank),[1,2,2]);assert.equal(ranks[1].returnPercent,0);assert.equal(ranks[0].value,won.cash);
const unsettled=rankPlayers([{id:'b',displayName:'B',account:bought}],[{...m,result:'home'}]);assert.equal(unsettled[0].value,won.cash);
assert.equal(rankPlayers([{id:'a',displayName:'A',account:{...base,cash:900*UNIT}}],[])[0].returnPercent.toFixed(2),'-10.00');
const {verifyGoogleToken}=await import(compiled('../lib/google-token.ts',{"'jose'":JSON.stringify(import.meta.resolve('jose'))}));
const pair=await generateKeyPair('RS256');const other=await generateKeyPair('RS256');const audience='test.apps.googleusercontent.com';const nonce='test-nonce';
async function signed(overrides={},key=pair.privateKey){return new SignJWT({sub:'google-subject',nonce,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300,iss:'https://accounts.google.com',aud:audience,...overrides}).setProtectedHeader({alg:'RS256'}).sign(key);}
assert.equal(await verifyGoogleToken(await signed(),pair.publicKey,audience,nonce),'google-subject');
for(const overrides of [{aud:'wrong'},{iss:'https://evil.invalid'},{nonce:'wrong'},{exp:1},{iat:1},{sub:123}])await assert.rejects(()=>signed(overrides).then(token=>verifyGoogleToken(token,pair.publicKey,audience,nonce)));
await assert.rejects(()=>signed({},other.privateKey).then(token=>verifyGoogleToken(token,pair.publicKey,audience,nonce)));
console.log('PASS: leaderboard ranking, ties, returns, confirmed payouts, and Google signature/audience/issuer/expiry/nonce/subject checks.');
