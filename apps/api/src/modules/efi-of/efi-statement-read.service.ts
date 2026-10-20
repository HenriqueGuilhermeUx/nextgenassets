import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import * as https from 'https';
import { EfiStatementPreview, parseEfiPixStatementV5 } from './efi-statement-v5-parser';

/**
 * Opt-in Efí Pix report reader, no money-changing API operations.
 * POST requests a REPORT FILE, not a Pix. GET downloads report status / CSV.
 * Production credentials are never copied to CI or homologation by this code.
 */
@Injectable()
export class EfiStatementReadService {
  private preflight() {
    const e=process.env;
    if(e.NEXTGEN_EFI_STATEMENT_READ_ENABLED!=='true' ||
       e.NEXTGEN_EFI_PRODUCTION_READ_ONLY_ENABLED!=='true' ||
       e.NEXTGEN_DISABLE_BACKGROUND_WORKERS!=='true' ||
       e.NEXTGEN_CENTRALIZED_D1_ENABLED==='true' ||
       e.NEXTGEN_EFI_AUTOMATIC_ENABLED==='true' ||
       e.NEXTGEN_EFI_AUTOMATIC_SANDBOX_PAYMENTS==='true')
      throw new ServiceUnavailableException('EFI_STATEMENT_READER_DISABLED');
    if(e.EFI_PIX_READ_API_URL!=='https://pix.api.efipay.com.br')
      throw new ServiceUnavailableException('EFI_STATEMENT_HOST_INVALID');
    if(!e.EFI_PIX_READ_CLIENT_ID || !e.EFI_PIX_READ_CLIENT_SECRET ||
       !e.EFI_PIX_READ_CERTIFICATE_BASE64 ||
       e.EFI_PIX_READ_CERTIFICATE_BASE64.length<256)
      throw new ServiceUnavailableException('EFI_STATEMENT_MTLS_CREDENTIALS_MISSING');
  }

  private async request(method:'GET'|'POST',path:string,
      headers:Record<string,string>, body=''):Promise<{status:number;data:Buffer}>{
    const url=new URL('https://pix.api.efipay.com.br'+path);
    return new Promise((resolve,reject)=>{
      const req=https.request(url,{
        method,headers,timeout:15000,rejectUnauthorized:true,
        pfx:Buffer.from(process.env.EFI_PIX_READ_CERTIFICATE_BASE64!,'base64'),
        passphrase:process.env.EFI_PIX_READ_CERT_PASSPHRASE||''
      },res=>{
        const chunks:Buffer[]=[];let bytes=0;
        res.on('data',(part:Buffer)=>{
          bytes+=part.length;
          if(bytes>1_000_000){req.destroy(new Error('EFI_STATEMENT_TOO_LARGE'));return;}
          chunks.push(part);
        });
        res.on('end',()=>{
          const status=res.statusCode||0;
          // 202 is not CSV ready. A redirect must NEVER forward a token.
          if(status!==200 && status!==201 && status!==202){
            reject(new Error('EFI_STATEMENT_HTTP_REJECTED'));return;
          }
          resolve({status,data:Buffer.concat(chunks)});
        });
      });
      req.on('timeout',()=>req.destroy(new Error('EFI_STATEMENT_TIMEOUT')));
      req.on('error',()=>reject(new Error('EFI_STATEMENT_CONNECTION_FAILED')));
      req.end(body);
    });
  }

  private async oauth():Promise<string>{
    const id=process.env.EFI_PIX_READ_CLIENT_ID!;
    const secret=process.env.EFI_PIX_READ_CLIENT_SECRET!;
    const auth=Buffer.from(id+':'+secret).toString('base64');
    const response=await this.request('POST','/oauth/token',{
      Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'
    },'grant_type=client_credentials');
    let data:any;
    try{data=JSON.parse(response.data.toString('utf8'));}catch{
      throw new Error('EFI_STATEMENT_OAUTH_INVALID');
    }
    if(response.status!==200 || typeof data.access_token!=='string' || !data.access_token)
      throw new Error('EFI_STATEMENT_OAUTH_INVALID');
    return data.access_token;
  }
  private validDate(value:unknown):value is string {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    const check=new Date(value+'T12:00:00.000Z');
    return Number.isFinite(check.getTime()) &&
       check.toISOString().slice(0,10)===value && value<new Date().toISOString().slice(0,10);
  }
  private receivingAccount():{bankCode:string;agency:string;account:string} {
    // The CSV must identify the ONE bank account configured by the operator.
    // Never trust an account number supplied in the incoming HTTP request.
    const {EFI_STATEMENT_BANK_CODE:bankCode,
      EFI_STATEMENT_AGENCY:agency,
      EFI_STATEMENT_ACCOUNT:account}=process.env;
    if(typeof bankCode!=='string'||!/^[0-9]{1,4}$/.test(bankCode) ||
       typeof agency!=='string'||!/^[0-9]{1,4}$/.test(agency) ||
       typeof account!=='string'||!/^[0-9]{2,20}$/.test(account)) {
      throw new ServiceUnavailableException('EFI_STATEMENT_RECEIVING_ACCOUNT_UNCONFIGURED');
    }
    return {bankCode,agency,account};
  }

  private validReportId(value:unknown):value is string{
    return typeof value==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  }

  private safeResponse(report:unknown):{id:string;status:string}{
    if(!report || typeof report!=='object' || Array.isArray(report))
      throw new Error('EFI_STATEMENT_STATE_UNRECOGNIZED');
    const x=report as Record<string,unknown>;
    if(!this.validReportId(x.id) ||
       !['AGUARDANDO_PROCESSAMENTO','EM_PROCESSAMENTO','CONCLUIDO'].includes(String(x.status)))
      throw new Error('EFI_STATEMENT_STATE_UNRECOGNIZED');
    return {id:x.id,status:String(x.status)};
  }

  async requestStatement(date:unknown){
    this.preflight();
    if(!this.validDate(date))throw new BadRequestException('EFI_STATEMENT_MOVEMENT_DATE_INVALID');
    try{
      const token=await this.oauth();
      // Only these record families are requested. Never ask the bank to
      // issue Pix or payments; POST creates a CSV report job exclusively.
      const response=await this.request('POST','/v2/gn/relatorios/extrato-conciliacao',{
        Authorization:'Bearer '+token,'Content-Type':'application/json'
      },JSON.stringify({dataMovimento:date,tipoRegistros:{
        pixRecebido:true,pixDevolucaoEnviada:true,pixDevolucaoRecebida:true,
        tarifaPixRecebido:true,estornoTarifaPixRecebido:true,
        splitPixDevolucaoEnviada:true
      }}));
      if(response.status!==202)throw new Error('EFI_STATEMENT_EXPECTED_202');
      const summary=this.safeResponse(JSON.parse(response.data.toString('utf8')));
      return {...summary,payoutAuthorized:false,reportOnly:true};
    }catch(_error:unknown){
      throw new ServiceUnavailableException('EFI_STATEMENT_REQUEST_REQUIRES_REVIEW');
    }
  }

  async previewStatement(reportId:unknown,body:any){
    this.preflight();
    if(!this.validReportId(reportId) || !this.validDate(body?.date) ||
       typeof body?.endToEndId!=='string'||!(/^[A-Za-z0-9]{32}$/.test(body.endToEndId))||
       !Number.isSafeInteger(body?.amountCents) || body.amountCents<=0)
      throw new BadRequestException('EFI_STATEMENT_PREVIEW_INVALID_INPUT');
    const receivingAccount=this.receivingAccount();
    if((body.bankCode!==undefined&&body.bankCode!==receivingAccount.bankCode)||
       (body.agency!==undefined&&body.agency!==receivingAccount.agency)||
       (body.account!==undefined&&body.account!==receivingAccount.account))
      throw new BadRequestException('EFI_STATEMENT_ACCOUNT_OVERRIDE_FORBIDDEN');
    try{
      const token=await this.oauth();
      const response=await this.request('GET','/v2/gn/relatorios/'+reportId,{
        Authorization:'Bearer '+token,Accept:'text/csv,application/json'
      });
      if(response.status===202){
        return {...this.safeResponse(JSON.parse(response.data.toString('utf8'))),
          ready:false,payoutAuthorized:false};
      }
      if(response.status!==200)throw new Error('EFI_STATEMENT_DOWNLOAD_NOT_READY');
      const csv=new TextDecoder('utf-8',{fatal:true}).decode(response.data);
      const proof:EfiStatementPreview=parseEfiPixStatementV5(csv,{
        date:body.date,...receivingAccount,endToEndId:body.endToEndId,
        amountCents:body.amountCents
      });
      // Even parsed CSV is not enough to lift compliance hold: the report
      // owner, bank account and tariff policy need independent verification.
      return {ready:true,reportId,proof,payoutAuthorized:false,
        ledgerUpdated:false,complianceReleased:false};
    }catch(_error:unknown){
      throw new ServiceUnavailableException('EFI_STATEMENT_PREVIEW_REQUIRES_REVIEW');
    }
  }
}
