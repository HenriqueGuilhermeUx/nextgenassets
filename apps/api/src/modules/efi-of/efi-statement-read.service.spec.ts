import { GUARDS_METADATA } from '@nestjs/common/constants';
import { EfiStatementReadController } from './efi-statement-read.controller';
import { EfiStatementReadService } from './efi-statement-read.service';
import { EfiOperationsGuard } from './efi-operations.guard';

const keys=['NEXTGEN_EFI_STATEMENT_READ_ENABLED','NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED',
  'NEXTGEN_EFI_MTLS_PROBE_ENABLED',
  'NEXTGEN_DISABLE_BACKGROUND_WORKERS','NEXTGEN_CENTRALIZED_D1_ENABLED',
  'NEXTGEN_EFI_AUTOMATIC_ENABLED','NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS',
  'NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS',
  'EFI_PIX_READ_API_URL','EFI_PIX_READ_CLIENT_ID','EFI_PIX_READ_CLIENT_SECRET',
  'EFI_PIX_READ_CERTIFICATE_BASE64','EFI_STATEMENT_BANK_CODE',
  'EFI_STATEMENT_AGENCY','EFI_STATEMENT_ACCOUNT'] as const;
const original=Object.fromEntries(keys.map(x=>[x,process.env[x]]));
const id='abc12345-1234-4abc-8abc-123456789abc';
function enable(){
  Object.assign(process.env,{
    NEXTGEN_EFI_STATEMENT_READ_ENABLED:'true',
    NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED:'true',
    NEXTGEN_DISABLE_BACKGROUND_WORKERS:'true',
    EFI_PIX_READ_API_URL:'https://pix.api.efipay.com.br',
    EFI_PIX_READ_CLIENT_ID:'mock-id',
    EFI_PIX_READ_CLIENT_SECRET:'mock-secret',
    EFI_PIX_READ_CERTIFICATE_BASE64:'X'.repeat(270),
    EFI_STATEMENT_BANK_CODE:'364',EFI_STATEMENT_AGENCY:'1',EFI_STATEMENT_ACCOUNT:'517613'
  });
}
describe('Efí production reconciliation report: bank mock only',()=>{
  let service:any;
  beforeEach(()=>{for(const k of keys)delete process.env[k];service=new EfiStatementReadService() as any;});
  afterAll(()=>{for(const k of keys){if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];}});
  it('requires operator authentication on all report routes',()=>{
    expect(Reflect.getMetadata(GUARDS_METADATA,EfiStatementReadController)).toContain(EfiOperationsGuard);
  });
  it('exposes offline readiness booleans only, without keys, names or secrets',()=>{
    const fn=jest.spyOn(service,'request');
    process.env.EFI_PIX_READ_CLIENT_SECRET='Private-Secret-Do-Not-Log-123';
    process.env.EFI_STATEMENT_ACCOUNT='000012345678';
    const snapshot=service.configurationPreflight();
    expect(snapshot).toMatchObject({bankingCredentialsTested:false,
      bankConnectionVerified:false,paymentInitiated:false,payoutAuthorized:false});
    expect(snapshot.configuredOnly).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain('Private-Secret-Do-Not-Log-123');
    expect(JSON.stringify(snapshot)).not.toContain('000012345678');
    expect(fn).not.toHaveBeenCalled();
  });
  it('reports all offline config checks but never asserts bank connectivity',()=>{
    enable();
    const cfg=service.configurationPreflight();
    expect(cfg).toMatchObject({configuredOnly:true,flagsEnabled:true,
      workersDisabled:true,paymentsDisabled:true,hostVerified:true,
      credentialsPresent:true,accountConfigured:true,bankConnectionVerified:false});
    process.env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_REQUESTS='true';
    expect(service.configurationPreflight()).toMatchObject({
      paymentsDisabled:false,configuredOnly:false});
  });
  it('is disabled by default before even calling OAuth',async()=>{
    const fn=jest.spyOn(service,'request');
    await expect(service.requestStatement('2026-10-18')).rejects.toThrow('EFI_STATEMENT_READER_DISABLED');
    expect(fn).not.toHaveBeenCalled();
  });
  it('blocks host spoofing and background workers',async()=>{
    enable();process.env.EFI_PIX_READ_API_URL='https://pix.api.efipay.com.br.evil.invalid';
    await expect(service.requestStatement('2026-10-18')).rejects.toThrow('EFI_STATEMENT_HOST_INVALID');
    enable();process.env.NEXTGEN_DISABLE_BACKGROUND_WORKERS='false';
    await expect(service.requestStatement('2026-10-18')).rejects.toThrow('EFI_STATEMENT_READER_DISABLED');
  });
  it('validates movement dates before bank calls',async()=>{
    enable();const fn=jest.spyOn(service,'request');
    await expect(service.requestStatement('2026-02-30')).rejects.toThrow('EFI_STATEMENT_MOVEMENT_DATE_INVALID');
    expect(fn).not.toHaveBeenCalled();
  });
  it('uses Efí JSON client_credentials format and mTLS-only OAuth path',async()=>{
    enable();
    const fn=jest.spyOn(service,'request').mockResolvedValue({
      status:200,data:Buffer.from(JSON.stringify({
        access_token:'SECRET_OAUTH_PRIVATE',
        scope:'pix.read gn.reports.read gn.reports.write'
      }))
    });
    const token=await service.oauth();
    expect(token).toBe('SECRET_OAUTH_PRIVATE');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toBe('POST');
    expect(fn.mock.calls[0][1]).toBe('/oauth/token');
    expect(fn.mock.calls[0][2]['Content-Type']).toBe('application/json');
    expect(JSON.parse(String(fn.mock.calls[0][3])))
      .toEqual({grant_type:'client_credentials'});
  });
  it('denies the OAuth scope probe unless independently enabled',async()=>{
    enable();
    const request=jest.spyOn(service,'request');
    await expect(service.probeOAuthScopes())
      .rejects.toThrow('EFI_MTLS_PROBE_DISABLED');
    expect(request).not.toHaveBeenCalled();
  });
  it('returns only permission flags from mocked OAuth and no bank token',async()=>{
    enable();
    process.env.NEXTGEN_EFI_MTLS_PROBE_ENABLED='true';
    const request=jest.spyOn(service,'request').mockResolvedValueOnce({
      status:200,data:Buffer.from(JSON.stringify({
        access_token:'SECRET_OAUTH_PRIVATE',
        scope:'pix.read gn.reports.read gn.reports.write pix.send'
      }))
    });
    const result=await service.probeOAuthScopes();
    expect(result).toMatchObject({
      oauthMtlsSucceeded:true,reportAccessReady:true,
      grantedRequiredScopes:{
        pixRead:true,reportsRead:true,reportsWrite:true
      },
      bankAccountOwnershipVerified:false,bankingDataFetched:false,
      bankPaymentIssued:false,reportRequested:false,payoutAuthorized:false
    });
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]).toBe('/oauth/token');
    expect(JSON.stringify(result)).not.toContain('SECRET_OAUTH_PRIVATE');
    expect(JSON.stringify(result)).not.toContain('pix.send');
  });
  it('reports missing access and suppresses malformed or unscoped bank tokens',async()=>{
    enable();
    process.env.NEXTGEN_EFI_MTLS_PROBE_ENABLED='true';
    const fn=jest.spyOn(service,'request').mockResolvedValueOnce({
      status:200,data:Buffer.from(JSON.stringify({
        access_token:'PRIVATE_TOKEN',scope:'pix.read gn.reports.read'
      }))
    });
    expect((await service.probeOAuthScopes()).reportAccessReady).toBe(false);
    fn.mockReset().mockResolvedValueOnce({
      status:200,data:Buffer.from(JSON.stringify({access_token:'PRIVATE_TOKEN'}))
    });
    await expect(service.probeOAuthScopes()).rejects
      .toThrow('EFI_MTLS_SCOPE_PROBE_REQUIRES_REVIEW');
  });
  it('refuses OAuth scope checks while background workers or financial flags run',async()=>{
    enable();
    process.env.NEXTGEN_EFI_MTLS_PROBE_ENABLED='true';
    process.env.NEXTGEN_CENTRALIZED_D1_ENABLED='true';
    const fn=jest.spyOn(service,'request');
    await expect(service.probeOAuthScopes()).rejects
      .toThrow('EFI_STATEMENT_READER_DISABLED');
    expect(fn).not.toHaveBeenCalled();
  });
  it('requests only an Efí report, never a Pix or payout',async()=>{
    enable();
    const req=jest.spyOn(service,'request')
      .mockResolvedValueOnce({status:200,data:Buffer.from(JSON.stringify({access_token:'TOKEN_PRIVATE'}))})
      .mockResolvedValueOnce({status:202,data:Buffer.from(JSON.stringify({id,status:'AGUARDANDO_PROCESSAMENTO'}))});
    const result=await service.requestStatement('2026-10-18');
    expect(result).toEqual({id,status:'AGUARDANDO_PROCESSAMENTO',payoutAuthorized:false,reportOnly:true});
    expect(req).toHaveBeenCalledTimes(2);
    expect(req.mock.calls[0][1]).toBe('/oauth/token');
    expect(req.mock.calls[1][1]).toBe('/v2/gn/relatorios/extrato-conciliacao');
    const body=JSON.parse(String(req.mock.calls[1][3]));
    expect(body.dataMovimento).toBe('2026-10-18');
    expect(body.tipoRegistros.tarifaPixRecebido).toBe(true);
    expect(body.tipoRegistros.estornoTarifaPixRecebido).toBe(true);
    expect(body.tipoRegistros.pixEnviadoDadosBancarios).toBe(true);
    expect(body.tipoRegistros.transferenciaEnviada).toBe(true);
    expect(body.tipoRegistros.saldoDiaAnterior).toBe(true);
    expect(Object.keys(body.tipoRegistros)).toHaveLength(18);
    expect(JSON.stringify(result)).not.toContain('TOKEN_PRIVATE');
  });
  it('refuses an unconfigured or caller-overridden receiving bank account without OAuth',async()=>{
    enable();
    const get=jest.spyOn(service,'oauth');
    const input={date:'2026-10-18',endToEndId:'E'+'0'.repeat(31),amountCents:10000};
    delete process.env.EFI_STATEMENT_ACCOUNT;
    await expect(service.previewStatement(id,input))
      .rejects.toThrow('EFI_STATEMENT_RECEIVING_ACCOUNT_UNCONFIGURED');
    enable();
    await expect(service.previewStatement(id,{...input,account:'999999'}))
      .rejects.toThrow('EFI_STATEMENT_ACCOUNT_OVERRIDE_FORBIDDEN');
    expect(get).not.toHaveBeenCalled();
  });
  it('accepts 202 as pending, not CSV completed',async()=>{
    enable();jest.spyOn(service,'oauth').mockResolvedValue('DUMMY_TOKEN');
    jest.spyOn(service,'request').mockResolvedValue({
      status:202,data:Buffer.from(JSON.stringify({id,status:'EM_PROCESSAMENTO'}))
    });
    const result=await service.previewStatement(id,{date:'2026-10-18',
      endToEndId:'E'+'0'.repeat(31),amountCents:10000});
    expect(result).toEqual({id,status:'EM_PROCESSAMENTO',ready:false,payoutAuthorized:false});
  });
  it('never returns raw CSV or sensitive names even when CSV is valid',async()=>{
    enable();jest.spyOn(service,'oauth').mockResolvedValue('DUMMY_TOKEN');
    const e2e='E090893562024101648554e991d24ccb';
    const csv=[
      'CA;Efí;364;1;517613;CLIENTE DOCUMENTO 123;2026-10-19;2026-10-18;Extrato de Conciliação API Pix;1.0',
      'PR;1;'+e2e+';txid;100.00;12345678908;;;2026-10-18T14:00:00.000Z;',
      'TPR;2;'+e2e+';1.00;2026-10-18T15:00:00.000Z','T;2;1;0;0;0;1;0;0;0;0;0;0'
    ].join('\n');
    jest.spyOn(service,'request').mockResolvedValue({status:200,data:Buffer.from(csv)});
    const x=await service.previewStatement(id,{date:'2026-10-18',
      endToEndId:e2e,amountCents:10000});
    expect(x.proof.tentativeNetCents).toBe(9900);
    expect(x.payoutAuthorized).toBe(false);
    expect(x.complianceReleased).toBe(false);
    expect(JSON.stringify(x)).not.toContain('CLIENTE DOCUMENTO');
  });
});
