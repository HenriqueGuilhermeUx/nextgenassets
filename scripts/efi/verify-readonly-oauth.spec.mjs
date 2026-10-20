import {test} from 'node:test';
import assert from 'node:assert/strict';
import {examineGrant,runProbe} from './verify-readonly-oauth.mjs';
const grant={access_token:'EXAMPLE_TOKEN_1234',token_type:'Bearer',
  scope:'pix.read gn.reports.read gn.reports.write pix.send'};
test('matches exact required scopes without leaking token or extra write scopes',()=>{
  const p=examineGrant(grant);
  assert.equal(p.allRequiredScopesPresent,true);
  assert.equal(p.moneyMoved,false);
  assert.equal(p.pixQueried,false);
  assert.equal(p.reportFetched,false);
  assert.equal(JSON.stringify(p).includes('EXAMPLE_TOKEN_1234'),false);
  assert.equal(JSON.stringify(p).includes('pix.send'),false);
});
test('partial and similarly named scopes never satisfy requirements',()=>{
  assert.equal(examineGrant({...grant,scope:'pix.read gn.reports.read'}).allRequiredScopesPresent,false);
  assert.deepEqual(examineGrant({...grant,scope:'pix.read_more gn.reports.read2 gn.reports.write_extra'}).requiredScopes,{
    pixRead:false,reportsRead:false,reportsWrite:false
  });
});
test('invalid token, type, or missing scope fail closed',()=>{
  for(const bad of [
    {...grant,access_token:undefined},
    {...grant,scope:undefined},
    {...grant,token_type:'Basic'}
  ])assert.throws(()=>examineGrant(bad),/INVALID_OAUTH_RESPONSE/);
});
test('probe never calls bank without explicit operator opt-in',async()=>{
  await assert.rejects(()=>runProbe({NEXTGEN_EFI_PROBE_CONFIRM:'OFF'}),/OPERATOR_CONFIRMATION_REQUIRED/);
});
test('probe rejects missing or relative P12 before bank network',async()=>{
  await assert.rejects(()=>runProbe({
    NEXTGEN_EFI_PROBE_CONFIRM:'OAUTH_ONLY_EFI_PRODUCTION',
    NEXTGEN_EFI_PROBE_CLIENT_ID:'example',
    NEXTGEN_EFI_PROBE_CLIENT_SECRET:'example',
    NEXTGEN_EFI_PROBE_P12_PATH:'relative.p12'
  }),/LOCAL_CONFIGURATION_MISSING/);
});
