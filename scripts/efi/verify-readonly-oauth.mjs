#!/usr/bin/env node
// Efí production OAuth-only check. No Pix, reports, webhooks or database calls.
import https from 'node:https';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST='pix.api.efipay.com.br';
const REQUIRED=['pix.read','gn.reports.read','gn.reports.write'];

export function examineGrant(grant) {
  if (!grant || typeof grant!=='object' || Array.isArray(grant) ||
      typeof grant.access_token!=='string' || grant.access_token.length<8 ||
      grant.token_type!=='Bearer' || typeof grant.scope!=='string' ||
      grant.scope.length>8192) throw new Error('INVALID_OAUTH_RESPONSE');
  const scopes=new Set(grant.scope.split(/\s+/).filter(Boolean));
  const checks={
    pixRead:scopes.has('pix.read'),
    reportsRead:scopes.has('gn.reports.read'),
    reportsWrite:scopes.has('gn.reports.write')
  };
  return {
    result:REQUIRED.every(s=>scopes.has(s))?'verified':'missing_scopes',
    source:'efi_pix_production_oauth',
    oauthMtlsSucceeded:true,
    requiredScopes:checks,
    allRequiredScopesPresent:REQUIRED.every(s=>scopes.has(s)),
    bankAccountOwnershipVerified:false,
    reportFetched:false,
    pixQueried:false,
    moneyMoved:false
  };
}

async function requestGrant({clientId,clientSecret,p12,password}) {
  const body=Buffer.from(JSON.stringify({grant_type:'client_credentials'}));
  return await new Promise((resolve,reject)=>{
    const req=https.request({
      protocol:'https:',hostname:HOST,servername:HOST,port:443,
      method:'POST',path:'/oauth/token',timeout:15000,
      rejectUnauthorized:true,pfx:p12,passphrase:password,
      headers:{
        Authorization:'Basic '+Buffer.from(clientId+':'+clientSecret).toString('base64'),
        'Content-Type':'application/json',Accept:'application/json',
        'Accept-Encoding':'identity','Content-Length':String(body.length)
      }
    },res=>{
      const chunks=[];let total=0;
      res.on('data',chunk=>{
        total+=chunk.length;
        if(total>16384){req.destroy(new Error('RESPONSE_TOO_LARGE'));return;}
        chunks.push(chunk);
      });
      res.on('end',()=>{
        if(res.statusCode!==200){reject(new Error('HTTP_NOT_OK'));return;}
        try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));}
        catch{reject(new Error('INVALID_JSON'));}
      });
    });
    req.on('timeout',()=>req.destroy(new Error('TIMEOUT')));
    req.on('error',reject);
    req.end(body);
  });
}

export async function runProbe(env=process.env){
  if(env.NEXTGEN_EFI_PROBE_CONFIRM!=='OAUTH_ONLY_EFI_PRODUCTION')
    throw new Error('OPERATOR_CONFIRMATION_REQUIRED');
  const clientId=env.NEXTGEN_EFI_PROBE_CLIENT_ID;
  const clientSecret=env.NEXTGEN_EFI_PROBE_CLIENT_SECRET;
  const certPath=env.NEXTGEN_EFI_PROBE_P12_PATH;
  if(!clientId||!clientSecret||!certPath||
     !path.isAbsolute(certPath)||!certPath.toLowerCase().endsWith('.p12')||
     clientId.length>512||clientSecret.length>512)
    throw new Error('LOCAL_CONFIGURATION_MISSING');
  const stats=await fs.stat(certPath);
  if(!stats.isFile()||stats.size<100||stats.size>262144)
    throw new Error('LOCAL_P12_INVALID');
  const grant=await requestGrant({
    clientId,clientSecret,p12:await fs.readFile(certPath),
    password:env.NEXTGEN_EFI_PROBE_P12_PASSWORD||''
  });
  return examineGrant(grant);
}
const direct=process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  try{
    const result=await runProbe();
    console.log(JSON.stringify(result,null,2));
    if(!result.allRequiredScopesPresent)process.exitCode=2;
  }catch(err){
    // Never print bank HTTP bodies, token, P12 paths or raw TLS exceptions.
    const expected=['OPERATOR_CONFIRMATION_REQUIRED','LOCAL_CONFIGURATION_MISSING','LOCAL_P12_INVALID'];
    const code=expected.includes(err?.message)?err.message:'EFI_OAUTH_OR_MTLS_NOT_VERIFIED';
    console.log(JSON.stringify({
      result:'not_verified',errorCode:code,oauthMtlsSucceeded:false,
      bankDataAccessed:false,moneyMoved:false
    },null,2));
    process.exitCode=3;
  }
}
