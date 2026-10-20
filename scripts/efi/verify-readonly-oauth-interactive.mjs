#!/usr/bin/env node
// Windows CMD-compatible, local-only Efí OAuth check.
// Secret input is hidden and is not passed as a command-line argument.
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProbe } from './verify-readonly-oauth.mjs';

export function normalizeP12Path(text) {
  const value = String(text ?? '').trim();
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1,-1);
  return value;
}

export async function hiddenAwarePrompt(label, hidden=false) {
  if (!process.stdin.isTTY || !process.stdout.isTTY ||
      typeof process.stdin.setRawMode !== 'function') {
    throw new Error('INTERACTIVE_TERMINAL_REQUIRED');
  }
  return await new Promise((resolve,reject) => {
    let buffer='';
    const initialRaw=Boolean(process.stdin.isRaw);
    readline.emitKeypressEvents(process.stdin);
    process.stdout.write(label + ': ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const done=()=>{
      process.stdin.removeListener('keypress',onKey);
      process.stdin.setRawMode(initialRaw);
    };
    const onKey=(text,key={})=>{
      if(key.ctrl && key.name==='c'){
        done();
        process.stdout.write('\n');
        reject(new Error('OPERATOR_CANCELLED'));
        return;
      }
      if(key.name==='return'||key.name==='enter'){
        done();
        process.stdout.write('\n');
        resolve(buffer);
        return;
      }
      if(key.name==='backspace'){
        if(buffer.length){
          buffer=buffer.slice(0,-1);
          if(!hidden)process.stdout.write('\b \b');
        }
        return;
      }
      if(key.ctrl||key.meta||key.name==='escape'||key.name==='tab')return;
      if(typeof text==='string'){
        const clean=Array.from(text).filter(ch=>ch>=' ' && ch!=='\u007f').join('');
        buffer+=clean;
        // NEVER echo client secrets or certificate passwords.
        if(!hidden)process.stdout.write(clean);
      }
    };
    process.stdin.on('keypress',onKey);
  });
}

export async function collectLocalCredentials(prompt=hiddenAwarePrompt){
  const clientId=(await prompt('Client ID de producao',false)).trim();
  const clientSecret=await prompt('Client Secret (oculto)',true);
  const certPath=normalizeP12Path(await prompt('Caminho completo do certificado .p12',false));
  const certPassword=await prompt('Senha do P12 (oculta, Enter se nao tiver)',true);
  return {
    NEXTGEN_EFI_PROBE_CONFIRM:'OAUTH_ONLY_EFI_PRODUCTION',
    NEXTGEN_EFI_PROBE_CLIENT_ID:clientId,
    NEXTGEN_EFI_PROBE_CLIENT_SECRET:clientSecret,
    NEXTGEN_EFI_PROBE_P12_PATH:certPath,
    NEXTGEN_EFI_PROBE_P12_PASSWORD:certPassword
  };
}

const direct=process.argv[1] &&
  path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  console.log('NextGen / Efi: validacao OAuth mTLS SOMENTE LEITURA.');
  console.log('Sem Pix, extrato, saldo, banco de dados ou mudancas em producao.');
  console.log('Use as credenciais da MESMA aplicacao Efi ativa.');
  try{
    const inputs=await collectLocalCredentials();
    const result=await runProbe(inputs);
    console.log(JSON.stringify(result,null,2));
    if(!result.allRequiredScopesPresent)process.exitCode=2;
  }catch(error){
    const expected=new Set([
      'OPERATOR_CANCELLED','INTERACTIVE_TERMINAL_REQUIRED',
      'LOCAL_CONFIGURATION_MISSING','LOCAL_P12_INVALID'
    ]);
    const code=expected.has(error?.message) ? error.message
      : 'EFI_OAUTH_OR_MTLS_NOT_VERIFIED';
    console.log(JSON.stringify({
      result:'not_verified',errorCode:code,oauthMtlsSucceeded:false,
      moneyMoved:false,bankDataAccessed:false
    },null,2));
    process.exitCode=3;
  }
}
