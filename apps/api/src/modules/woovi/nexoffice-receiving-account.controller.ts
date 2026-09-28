import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomUUID, timingSafeEqual } from 'crypto';

const prisma = new PrismaClient();
let ensured: Promise<unknown> | null = null;

type PixKeyType = 'CPF'|'CNPJ'|'EMAIL'|'PHONE'|'EVP';
type SetupBody = {
  humanApproved?: boolean;
  legalName?: string;
  taxId?: string;
  pixKey?: string;
  pixKeyType?: PixKeyType;
  payoutPolicy?: 'manual'|'daily';
};

function clean(v:unknown,max=240){return String(v??'').replace(/\u0000/g,'').trim().slice(0,max)}
function safeEqual(a:string,b:string){if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function masked(value:string){const v=clean(value,240);if(v.length<=6)return '******';return `${v.slice(0,3)}***${v.slice(-3)}`}
function normalizeTaxId(value:string){return clean(value,32).replace(/\D/g,'')}
function sanitizeProviderText(value:unknown){return clean(value,320).replace(/[\w.+-]+@[\w.-]+/g,'***@***').replace(/\b\d{7,}\b/g,'***')}
function providerReason(data:any){
  const raw=data?.error?.description||data?.error?.message||data?.error||data?.message||data?.errorCode||data?.code||'';
  return sanitizeProviderText(typeof raw==='string'?raw:JSON.stringify(raw));
}
function validatePixKey(type:PixKeyType,key:string,taxId:string){
  const value=clean(key,240);const doc=normalizeTaxId(taxId);
  if(!value)return 'pix_key_required';
  if(type==='CPF'&&value.replace(/\D/g,'').length!==11)return 'invalid_cpf_pix_key';
  if(type==='CNPJ'&&value.replace(/\D/g,'').length!==14)return 'invalid_cnpj_pix_key';
  if(type==='EMAIL'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value))return 'invalid_email_pix_key';
  if(type==='PHONE'&&!/^\+?\d{10,15}$/.test(value.replace(/[\s()-]/g,'')))return 'invalid_phone_pix_key';
  if(type==='EVP'&&value.length<20)return 'invalid_evp_pix_key';
  if(type==='CPF'&&doc&&doc!==value.replace(/\D/g,''))return 'pix_key_owner_document_mismatch';
  if(type==='CNPJ'&&doc&&doc!==value.replace(/\D/g,''))return 'pix_key_owner_document_mismatch';
  return null;
}

async function ensureTable(){
  if(!ensured)ensured=(async()=>{
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS nexoffice_receiving_accounts (
      workspace_id TEXT PRIMARY KEY,
      legal_name TEXT NOT NULL,
      tax_id TEXT,
      pix_key TEXT NOT NULL,
      pix_key_masked TEXT NOT NULL,
      pix_key_type TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'woovi',
      provider_status TEXT NOT NULL DEFAULT 'PENDING',
      payout_policy TEXT NOT NULL DEFAULT 'manual',
      provider_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_balance_minor BIGINT,
      last_checked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  })().catch(e=>{ensured=null;throw e});
  return ensured;
}

@Controller('internal/nexoffice/receiving-account')
export class NexOfficeReceivingAccountController {
  private authorize(key?:string,workspaceId?:string){
    const expected=clean(process.env.NEXOFFICE_SERVICE_KEY,400);
    if(!expected)throw new HttpException({success:false,error:'bridge_not_configured'},HttpStatus.SERVICE_UNAVAILABLE);
    if(!safeEqual(clean(key,400),expected))throw new HttpException({success:false,error:'unauthorized'},HttpStatus.UNAUTHORIZED);
    const workspace=clean(workspaceId,120);if(!workspace)throw new HttpException({success:false,error:'workspace_required'},HttpStatus.BAD_REQUEST);return workspace;
  }
  private actionsEnabled(){return String(process.env.NEXOFFICE_RECEIVING_ACCOUNT_ACTIONS_ENABLED||process.env.NEXOFFICE_FINANCIAL_ACTIONS_ENABLED||'false').toLowerCase()==='true'}
  private requireAction(body:any){if(!this.actionsEnabled())throw new HttpException({success:false,error:'receiving_account_actions_disabled'},HttpStatus.CONFLICT);if(body?.humanApproved!==true)throw new HttpException({success:false,error:'human_approval_required'},HttpStatus.CONFLICT)}
  private config(){const appId=clean(process.env.WOOVI_APP_ID,1000);const base=clean(process.env.WOOVI_API_URL||'https://api.woovi.com',500).replace(/\/$/,'');return{appId,base,sandbox:base.includes('woovi-sandbox.com')}}
  private async woovi(method:'GET'|'POST'|'DELETE',path:string,body?:any){
    const{appId,base}=this.config();
    if(!appId)throw new HttpException({success:false,error:'woovi_not_configured'},HttpStatus.SERVICE_UNAVAILABLE);
    const r=await fetch(`${base}${path}`,{method,headers:{Authorization:appId,'Content-Type':'application/json',Accept:'application/json'},body:method==='POST'?JSON.stringify(body||{}):undefined});
    const text=await r.text();let data:any=text;try{data=JSON.parse(text)}catch{}
    if(!r.ok){
      const reason=providerReason(data);
      console.error('[NexOfficeReceivingAccount][Woovi]',JSON.stringify({method,path,status:r.status,reason:reason||'provider_rejected_request'}));
      throw new HttpException({success:false,error:'woovi_request_failed',providerStatus:r.status,providerReason:reason||null},r.status>=500?HttpStatus.BAD_GATEWAY:HttpStatus.CONFLICT);
    }
    return data;
  }
  private safe(row:any){if(!row)return null;return{workspaceId:row.workspace_id,legalName:row.legal_name,taxIdMasked:row.tax_id?`${String(row.tax_id).slice(0,3)}***${String(row.tax_id).slice(-3)}`:null,pixKeyMasked:row.pix_key_masked,pixKeyType:row.pix_key_type,providerStatus:row.provider_status,payoutPolicy:row.payout_policy,balanceMinor:row.last_balance_minor==null?null:Number(row.last_balance_minor),lastCheckedAt:row.last_checked_at,configured:true}}
  private async row(workspace:string){await ensureTable();return (await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM nexoffice_receiving_accounts WHERE workspace_id=$1 LIMIT 1`,workspace))[0]||null}

  @Get()
  async get(@Headers('x-nexoffice-key') key?:string,@Headers('x-nexoffice-workspace-id') workspaceId?:string){const workspace=this.authorize(key,workspaceId);const row=await this.row(workspace);const cfg=this.config();return{success:true,account:this.safe(row),actionsEnabled:this.actionsEnabled(),providerConfigured:Boolean(cfg.appId),sandbox:cfg.sandbox,externalEffect:false}}

  @Post('setup')
  async setup(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Body() body:SetupBody){
    const workspace=this.authorize(key,workspaceId);this.requireAction(body);await ensureTable();
    const legalName=clean(body.legalName,180),taxId=normalizeTaxId(body.taxId||''),pixKey=clean(body.pixKey,240),pixKeyType=clean(body.pixKeyType,20) as PixKeyType,payoutPolicy=body.payoutPolicy==='daily'?'daily':'manual';
    if(!legalName)throw new HttpException({success:false,error:'legal_name_required'},HttpStatus.BAD_REQUEST);
    if(!['CPF','CNPJ','EMAIL','PHONE','EVP'].includes(pixKeyType))throw new HttpException({success:false,error:'invalid_pix_key_type'},HttpStatus.BAD_REQUEST);
    const error=validatePixKey(pixKeyType,pixKey,taxId);if(error)throw new HttpException({success:false,error},HttpStatus.UNPROCESSABLE_ENTITY);
    const provider=await this.woovi('POST','/api/v1/subaccount',{name:legalName,pixKey});
    const snapshot=provider?.SubAccount||provider?.subAccount||provider?.subaccount||provider||{};
    const rows=await prisma.$queryRawUnsafe<any[]>(`INSERT INTO nexoffice_receiving_accounts(workspace_id,legal_name,tax_id,pix_key,pix_key_masked,pix_key_type,provider_status,payout_policy,provider_snapshot,last_checked_at) VALUES($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8::jsonb,NOW()) ON CONFLICT(workspace_id) DO UPDATE SET legal_name=EXCLUDED.legal_name,tax_id=EXCLUDED.tax_id,pix_key=EXCLUDED.pix_key,pix_key_masked=EXCLUDED.pix_key_masked,pix_key_type=EXCLUDED.pix_key_type,provider_status='ACTIVE',payout_policy=EXCLUDED.payout_policy,provider_snapshot=EXCLUDED.provider_snapshot,last_checked_at=NOW(),updated_at=NOW() RETURNING *`,workspace,legalName,taxId||null,pixKey,masked(pixKey),pixKeyType,payoutPolicy,JSON.stringify({name:snapshot.name||legalName,pixKeyMasked:masked(pixKey),createdOrRetrieved:true}));
    return{success:true,account:this.safe(rows[0]),providerStatus:'ACTIVE',payoutPolicy,externalEffect:true};
  }

  @Post('refresh')
  async refresh(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined){
    const workspace=this.authorize(key,workspaceId);const row=await this.row(workspace);if(!row)throw new HttpException({success:false,error:'receiving_account_not_found'},HttpStatus.NOT_FOUND);
    const provider=await this.woovi('GET',`/api/v1/subaccount/${encodeURIComponent(row.pix_key)}`);const sub=provider?.SubAccount||provider?.subAccount||provider?.subaccount||provider||{};const balance=Number(sub.balance||0);
    const updated=await prisma.$queryRawUnsafe<any[]>(`UPDATE nexoffice_receiving_accounts SET provider_status='ACTIVE',last_balance_minor=$2,provider_snapshot=$3::jsonb,last_checked_at=NOW(),updated_at=NOW() WHERE workspace_id=$1 RETURNING *`,workspace,balance,JSON.stringify({name:sub.name||row.legal_name,pixKeyMasked:masked(row.pix_key),balance}));
    return{success:true,account:this.safe(updated[0]),externalEffect:false};
  }

  @Post('change-key')
  async changeKey(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Body() body:SetupBody){
    const workspace=this.authorize(key,workspaceId);this.requireAction(body);const current=await this.row(workspace);if(!current)throw new HttpException({success:false,error:'receiving_account_not_found'},HttpStatus.NOT_FOUND);
    const legalName=clean(body.legalName||current.legal_name,180),taxId=normalizeTaxId(body.taxId||current.tax_id||''),pixKey=clean(body.pixKey,240),pixKeyType=clean(body.pixKeyType,20) as PixKeyType,payoutPolicy=body.payoutPolicy==='manual'?'manual':current.payout_policy==='manual'?'manual':'daily';
    if(!['CPF','CNPJ','EMAIL','PHONE','EVP'].includes(pixKeyType))throw new HttpException({success:false,error:'invalid_pix_key_type'},HttpStatus.BAD_REQUEST);
    const error=validatePixKey(pixKeyType,pixKey,taxId);if(error)throw new HttpException({success:false,error},HttpStatus.UNPROCESSABLE_ENTITY);
    if(pixKey===current.pix_key)return{success:true,account:this.safe(current),changed:false,externalEffect:false};
    const oldProvider=await this.woovi('GET',`/api/v1/subaccount/${encodeURIComponent(current.pix_key)}`);const oldSub=oldProvider?.SubAccount||oldProvider?.subAccount||oldProvider?.subaccount||oldProvider||{};const oldBalance=Number(oldSub.balance||0);
    if(!Number.isFinite(oldBalance)||oldBalance>0)throw new HttpException({success:false,error:'receiving_account_balance_must_be_zero_before_pix_key_change',balanceMinor:Number.isFinite(oldBalance)?oldBalance:null},HttpStatus.CONFLICT);
    const newProvider=await this.woovi('POST','/api/v1/subaccount',{name:legalName,pixKey});const nextSub=newProvider?.SubAccount||newProvider?.subAccount||newProvider||{};
    let oldSubaccountCleanupPending=false;
    try{await this.woovi('DELETE',`/api/v1/subaccount/${encodeURIComponent(current.pix_key)}`)}catch{oldSubaccountCleanupPending=true}
    const rows=await prisma.$queryRawUnsafe<any[]>(`UPDATE nexoffice_receiving_accounts SET legal_name=$2,tax_id=$3,pix_key=$4,pix_key_masked=$5,pix_key_type=$6,provider_status='ACTIVE',payout_policy=$7,provider_snapshot=$8::jsonb,last_balance_minor=0,last_checked_at=NOW(),updated_at=NOW() WHERE workspace_id=$1 RETURNING *`,workspace,legalName,taxId||null,pixKey,masked(pixKey),pixKeyType,payoutPolicy,JSON.stringify({name:nextSub.name||legalName,pixKeyMasked:masked(pixKey),changedFromMasked:current.pix_key_masked,oldSubaccountCleanupPending}));
    return{success:true,account:this.safe(rows[0]),changed:true,oldSubaccountCleanupPending,externalEffect:true};
  }

  @Post('test-charge')
  async testCharge(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Body() body:any){
    const workspace=this.authorize(key,workspaceId);this.requireAction(body);const row=await this.row(workspace);if(!row)throw new HttpException({success:false,error:'receiving_account_not_found'},HttpStatus.NOT_FOUND);
    const value=Number(body?.amountMinor||100);if(!Number.isSafeInteger(value)||value<100||value>5000)throw new HttpException({success:false,error:'test_amount_must_be_100_to_5000'},HttpStatus.BAD_REQUEST);
    const correlationID=clean(body?.correlationId||`nexoffice-test-${workspace}-${randomUUID()}`,220);
    const provider=await this.woovi('POST','/api/v1/charge',{value,correlationID,comment:'NexOffice receiving account validation',subaccount:row.pix_key,expiresIn:3600});
    const charge=provider?.charge||provider||{};
    return{success:true,correlationId:correlationID,charge:{id:clean(charge.id||charge.identifier,180),status:clean(charge.status,40),value:Number(charge.value||value),brCode:typeof charge.brCode==='string'?charge.brCode:null,paymentLinkUrl:typeof charge.paymentLinkUrl==='string'?charge.paymentLinkUrl:null},split:{type:'SPLIT_SUB_ACCOUNT',destinationPixKeyMasked:row.pix_key_masked,valueMinor:value,providerMode:'SUBACCOUNT'},sandbox:this.config().sandbox,externalEffect:true};
  }

  @Post('withdraw')
  async withdraw(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Body() body:any){
    const workspace=this.authorize(key,workspaceId);this.requireAction(body);const row=await this.row(workspace);if(!row)throw new HttpException({success:false,error:'receiving_account_not_found'},HttpStatus.NOT_FOUND);
    const provider=await this.woovi('POST',`/api/v1/subaccount/${encodeURIComponent(row.pix_key)}/withdraw`,body?.valueMinor?{value:Number(body.valueMinor)}:{});
    return{success:true,withdrawal:{status:'requested',pixKeyMasked:row.pix_key_masked,valueMinor:body?.valueMinor?Number(body.valueMinor):null},providerReceived:Boolean(provider),sandbox:this.config().sandbox,externalEffect:true};
  }
}
