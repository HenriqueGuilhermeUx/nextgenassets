import { EfiPixIncomingReadService } from './efi-pix-incoming-read.service';
const vars=[
  'NEXTGEN_EFI_PIX_READ_ENABLED','NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED',
  'NEXTGEN_DISABLE_BACKGROUND_WORKERS','NEXTGEN_EFI_AUTOMATIC_ENABLED',
  'NEXTGEN_CENTRALIZED_D1_ENABLED','EFI_PIX_READ_API_URL','EFI_PIX_READ_CLIENT_ID',
  'EFI_PIX_READ_CLIENT_SECRET','EFI_PIX_READ_CERTIFICATE_BASE64'
];
const initial=Object.fromEntries(vars.map(k=>[k,process.env[k]]));
const id='E090893562024101648554e991d24ccb';
const setEnv=()=>{
  process.env.NEXTGEN_EFI_PIX_READ_ENABLED='true';
  process.env.NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED='true';
  process.env.NEXTGEN_DISABLE_BACKGROUND_WORKERS='true';
  process.env.EFI_PIX_READ_API_URL='https://pix.api.efipay.com.br';
  process.env.EFI_PIX_READ_CLIENT_ID='test-only';
  process.env.EFI_PIX_READ_CLIENT_SECRET='test-only';
  process.env.EFI_PIX_READ_CERTIFICATE_BASE64='X'.repeat(280);
};
describe('Efí Pix bank-only GET adapter - no live network',()=>{
  beforeEach(()=>{for(const k of vars)delete process.env[k];jest.restoreAllMocks();});
  afterAll(()=>{for(const k of vars){if(initial[k]===undefined)delete process.env[k];else process.env[k]=initial[k];}});
  it('blocks all bank calls by default',async()=>{
    const client=new EfiPixIncomingReadService();
    await expect(client.getReceivedPix(id)).rejects.toThrow('EFI_PIX_BANK_READ_DISABLED');
  });
  it('blocks when workers are enabled or recipient host is spoofed',async()=>{
    setEnv();
    delete process.env.NEXTGEN_DISABLE_BACKGROUND_WORKERS;
    await expect(new EfiPixIncomingReadService().getReceivedPix(id)).rejects.toThrow('EFI_PIX_BANK_READ_DISABLED');
    setEnv();
    process.env.EFI_PIX_READ_API_URL='https://pix.api.efipay.com.br.attacker.invalid';
    await expect(new EfiPixIncomingReadService().getReceivedPix(id)).rejects.toThrow('EFI_PIX_BANK_READ_HOST_INVALID');
  });
  it('requires dedicated Pix read credentials and canonical reference',async()=>{
    setEnv();delete process.env.EFI_PIX_READ_CLIENT_SECRET;
    await expect(new EfiPixIncomingReadService().getReceivedPix(id)).rejects.toThrow('EFI_PIX_BANK_READ_CREDENTIALS_MISSING');
    setEnv();
    await expect(new EfiPixIncomingReadService().getReceivedPix('bad')).rejects.toThrow('EFI_PIX_BANK_E2E_INVALID');
  });
  it('sends only OAuth POST and bank GET with exact E2E',async()=>{
    setEnv();
    const client=new EfiPixIncomingReadService() as any;
    const request=jest.spyOn(client,'request')
      .mockResolvedValueOnce({status:200,payload:{access_token:'mocked-private-oauth'}})
      .mockResolvedValueOnce({status:200,payload:{endToEndId:id,valor:'100.00'}});
    expect(await client.getReceivedPix(id)).toMatchObject({endToEndId:id});
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0]).toBe('POST');
    expect(request.mock.calls[0][1]).toBe('/oauth/token');
    expect(request.mock.calls[0][2]['Content-Type']).toBe('application/json');
    expect(JSON.parse(request.mock.calls[0][3])).toEqual({
      grant_type:'client_credentials'
    });
    expect(request.mock.calls[1][0]).toBe('GET');
    expect(request.mock.calls[1][1]).toBe('/v2/pix/'+id);
    expect(JSON.stringify(request.mock.calls[1])).not.toContain('test-only');
  });
  it('refuses a missing OAuth token without sending bank GET',async()=>{
    setEnv();
    const client=new EfiPixIncomingReadService() as any;
    const request=jest.spyOn(client,'request').mockResolvedValueOnce({status:200,payload:{}});
    await expect(client.getReceivedPix(id)).rejects.toThrow('EFI_PIX_BANK_OAUTH_INVALID');
    expect(request).toHaveBeenCalledTimes(1);
  });
});
