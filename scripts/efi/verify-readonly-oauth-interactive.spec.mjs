import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeP12Path,collectLocalCredentials} from './verify-readonly-oauth-interactive.mjs';

test('accepts copied Windows P12 path with surrounding quotes',()=>{
  assert.equal(normalizeP12Path('  "C:\\Users\\User\\Downloads\\cert.p12"  '),
               'C:\\Users\\User\\Downloads\\cert.p12');
});
test('collects credentials in memory without CLI arguments, env mutation or file writes',async()=>{
  const initial=process.env.NEXTGEN_EFI_PROBE_CLIENT_SECRET;
  const responses=['Client_Id_mock','SECRET_NOT_TO_PRINT',
    'C:\\Users\\User\\Downloads\\cert.p12','CERT_PASSPHRASE'];
  const prompts=[];
  const result=await collectLocalCredentials(async(label,hidden)=>{
    prompts.push({label,hidden});
    return responses.shift();
  });
  assert.equal(result.NEXTGEN_EFI_PROBE_CLIENT_SECRET,'SECRET_NOT_TO_PRINT');
  assert.equal(result.NEXTGEN_EFI_PROBE_P12_PASSWORD,'CERT_PASSPHRASE');
  assert.deepEqual(prompts.map(p=>p.hidden),[false,true,false,true]);
  assert.equal(process.env.NEXTGEN_EFI_PROBE_CLIENT_SECRET,initial);
});
test('empty password supported with hidden prompt',async()=>{
  const responses=['id','secret','C:\\Users\\User\\cert.p12',''];
  const result=await collectLocalCredentials(async()=>responses.shift());
  assert.equal(result.NEXTGEN_EFI_PROBE_P12_PASSWORD,'');
});
