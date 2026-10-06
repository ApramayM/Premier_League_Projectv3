import {jwtVerify,type JWTVerifyGetKey} from 'jose';
export async function verifyGoogleToken(token:string,keys:JWTVerifyGetKey|CryptoKey,audience:string,nonce:string){
 const {payload}=await jwtVerify(token,keys as JWTVerifyGetKey,{issuer:['https://accounts.google.com','accounts.google.com'],audience,algorithms:['RS256'],requiredClaims:['sub','exp','iat','nonce'],maxTokenAge:'10m'});
 if(payload.nonce!==nonce||typeof payload.sub!=='string'||payload.sub.length>255)throw new Error('Invalid sign-in response.');
 return payload.sub;
}
