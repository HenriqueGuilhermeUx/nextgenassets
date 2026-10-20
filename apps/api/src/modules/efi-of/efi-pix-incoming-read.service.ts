import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as https from 'https';

/**
 * Dedicated Efí Pix READ client. Never imports legacy EfiPixAdapter:
 * its helper can disable certificate validation and follow arbitrary redirects.
 * Only OAuth client_credentials POST and bank Pix GET are permitted.
 */
@Injectable()
export class EfiPixIncomingReadService {
  private assertReady() {
    const env=process.env;
    if (env.NEXTGEN_EFI_PIX_READ_ENABLED!=='true' ||
        env.NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED!=='true' ||
        env.NEXTGEN_DISABLE_BACKGROUND_WORKERS!=='true' ||
        env.NEXTGEN_EFI_AUTOMATIC_ENABLED==='true' ||
        env.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS==='true' ||
        env.NEXTGEN_CENTRALIZED_D1_ENABLED==='true')
      throw new ServiceUnavailableException('EFI_PIX_BANK_READ_DISABLED');
    if (env.EFI_PIX_READ_API_URL!=='https://pix.api.efipay.com.br')
      throw new ServiceUnavailableException('EFI_PIX_BANK_READ_HOST_INVALID');
    if (!env.EFI_PIX_READ_CLIENT_ID || !env.EFI_PIX_READ_CLIENT_SECRET ||
        !env.EFI_PIX_READ_CERTIFICATE_BASE64 || env.EFI_PIX_READ_CERTIFICATE_BASE64.length<256)
      throw new ServiceUnavailableException('EFI_PIX_BANK_READ_CREDENTIALS_MISSING');
  }

  private request(method:'GET'|'POST', path:string, headers:Record<string,string>,
                  body=''):Promise<{status:number;payload:any}> {
    // This method is private and accepts only routes created below, no user URLs.
    const url=new URL('https://pix.api.efipay.com.br'+path);
    return new Promise((resolve,reject)=>{
      const req=https.request(url,{
        method,headers,
        pfx:Buffer.from(process.env.EFI_PIX_READ_CERTIFICATE_BASE64!,'base64'),
        passphrase:process.env.EFI_PIX_READ_CERT_PASSPHRASE||'',
        rejectUnauthorized:true,
        timeout:15000
      },res=>{
        const buffers:Buffer[]=[];
        let size=0;
        res.on('data',(chunk:Buffer)=>{
          size+=chunk.length;
          if(size>256000){req.destroy(new Error('EFI_PIX_RESPONSE_LIMIT'));return;}
          buffers.push(chunk);
        });
        res.on('end',()=>{
          const status=res.statusCode||0;
          // Redirects must not forward OAuth tokens to any other origin.
          if(status<200||status>=300){reject(new Error('EFI_PIX_BANK_HTTP_ERROR'));return;}
          try { resolve({status,payload:JSON.parse(Buffer.concat(buffers).toString('utf8'))}); }
          catch{reject(new Error('EFI_PIX_BANK_INVALID_JSON'));}
        });
      });
      req.on('timeout',()=>req.destroy(new Error('EFI_PIX_BANK_TIMEOUT')));
      req.on('error',()=>reject(new Error('EFI_PIX_BANK_CONNECTION_FAILED')));
      req.end(body);
    });
  }

  async getReceivedPix(endToEndId:string):Promise<unknown> {
    this.assertReady();
    if(!/^[A-Za-z0-9]{32}$/.test(endToEndId))
      throw new Error('EFI_PIX_BANK_E2E_INVALID');
    const id=process.env.EFI_PIX_READ_CLIENT_ID!;
    const secret=process.env.EFI_PIX_READ_CLIENT_SECRET!;
    const basic=Buffer.from(id+':'+secret).toString('base64');
    // OAuth token exchange is the ONLY bank POST used by this client.
    const tokenReply=await this.request('POST','/oauth/token',{
      Authorization:'Basic '+basic,
      'Content-Type':'application/x-www-form-urlencoded'
    },'grant_type=client_credentials');
    const token=tokenReply.payload?.access_token;
    if(typeof token!=='string'||!token)
      throw new Error('EFI_PIX_BANK_OAUTH_INVALID');
    const pix=await this.request('GET','/v2/pix/'+endToEndId,{
      Authorization:'Bearer '+token,
      Accept:'application/json'
    });
    return pix.payload;
  }
}
