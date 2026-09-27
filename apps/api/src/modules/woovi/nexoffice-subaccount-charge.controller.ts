import { Body, Controller, Headers, HttpException, HttpStatus, Param, Post } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { timingSafeEqual } from 'crypto';

const prisma = new PrismaClient();
let ensured: Promise<unknown> | null = null;

function clean(v:unknown,max=240){return String(v??'').replace(/\u0000/g,'').trim().slice(0,max)}
function safeEqual(a:string,b:string){if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function normalizeStatus(v:any){const s=clean(v,40).toUpperCase();if(['PAID','COMPLETED'].includes(s))return'PAID';if(s==='EXPIRED')return'EXPIRED';if(['CANCELED','CANCELLED'].includes(s))return'CANCELED';if(['FAILED','ERROR'].includes(s))return'FAILED';return'CREATED'}
function safeCharge(provider:any,fallbackValue=0){const c=provider?.charge||provider||{};return{id:clean(c.id||c.identifier,180),identifier:clean(c.identifier||c.id,180),correlationID:clean(c.correlationID,220),status:normalizeStatus(c.status),value:Number(c.value||fallbackValue),brCode:typeof c.brCode==='string'?c.brCode:null,qrCodeImage:typeof c.qrCodeImage==='string'?c.qrCodeImage:null,paymentLinkUrl:typeof c.paymentLinkUrl==='string'?c.paymentLinkUrl:null,createdAt:c.createdAt||null,paidAt:c.paidAt||null}}

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
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS nexoffice_subaccount_charge_receipts (
      workspace_id TEXT NOT NULL,
      correlation_id TEXT NOT NULL,
      command_action_id TEXT,
      approval_id TEXT,
      amount_minor BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'CREATING',
      provider_charge_id TEXT,
      receipt JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(workspace_id,correlation_id)
    )`);
  })().catch(e=>{ensured=null;throw e});
  return ensured;
}

@Controller('internal/nexoffice/receiving-account/charges')
export class NexOfficeSubaccountChargeController {
  private authorize(key?:string,workspaceId?:string){const expected=clean(process.env.NEXOFFICE_SERVICE_KEY,400);if(!expected)throw new HttpException({success:false,error:'bridge_not_configured'},HttpStatus.SERVICE_UNAVAILABLE);if(!safeEqual(clean(key,400),expected))throw new HttpException({success:false,error:'unauthorized'},HttpStatus.UNAUTHORIZED);const workspace=clean(workspaceId,120);if(!workspace)throw new HttpException({success:false,error:'workspace_required'},HttpStatus.BAD_REQUEST);return workspace}
  private requireAction(body:any){const enabled=String(process.env.NEXOFFICE_RECEIVING_ACCOUNT_ACTIONS_ENABLED||process.env.NEXOFFICE_FINANCIAL_ACTIONS_ENABLED||'false').toLowerCase()==='true';if(!enabled)throw new HttpException({success:false,error:'receiving_account_actions_disabled'},HttpStatus.CONFLICT);if(body?.humanApproved!==true)throw new HttpException({success:false,error:'human_approval_required'},HttpStatus.CONFLICT)}
  private async account(workspace:string){await ensureTable();const rows=await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM nexoffice_receiving_accounts WHERE workspace_id=$1 AND provider_status='ACTIVE' LIMIT 1`,workspace);if(!rows[0])throw new HttpException({success:false,error:'receiving_account_not_ready'},HttpStatus.CONFLICT);return rows[0]}
  private async woovi(method:'GET'|'POST',path:string,body?:any){const appId=clean(process.env.WOOVI_APP_ID,1000),base=clean(process.env.WOOVI_API_URL||'https://api.woovi.com',500).replace(/\/$/,'');if(!appId)throw new HttpException({success:false,error:'woovi_not_configured'},HttpStatus.SERVICE_UNAVAILABLE);const r=await fetch(`${base}${path}`,{method,headers:{Authorization:appId,'Content-Type':'application/json',Accept:'application/json'},body:method==='POST'?JSON.stringify(body||{}):undefined});const text=await r.text();let data:any=text;try{data=JSON.parse(text)}catch{}if(!r.ok)throw new HttpException({success:false,error:'woovi_request_failed',providerStatus:r.status},r.status>=500?HttpStatus.BAD_GATEWAY:HttpStatus.CONFLICT);return data}

  @Post()
  async create(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Headers('idempotency-key') idem:string|undefined,@Body() body:any){
    const workspace=this.authorize(key,workspaceId);this.requireAction(body);const account=await this.account(workspace);const correlationId=clean(idem||body?.correlationId,220),commandActionId=clean(body?.commandActionId,120),approvalId=clean(body?.approvalId,120)||null,amount=Number(body?.amountMinor||0);if(!correlationId||!commandActionId)throw new HttpException({success:false,error:'correlation_and_action_required'},HttpStatus.BAD_REQUEST);if(!Number.isSafeInteger(amount)||amount<100||amount>100_000_000)throw new HttpException({success:false,error:'invalid_amount_minor'},HttpStatus.BAD_REQUEST);
    await ensureTable();const inserted=await prisma.$queryRawUnsafe<any[]>(`INSERT INTO nexoffice_subaccount_charge_receipts(workspace_id,correlation_id,command_action_id,approval_id,amount_minor,status) VALUES($1,$2,$3,$4,$5,'CREATING') ON CONFLICT(workspace_id,correlation_id) DO NOTHING RETURNING *`,workspace,correlationId,commandActionId,approvalId,amount);
    if(!inserted.length){const existing=(await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM nexoffice_subaccount_charge_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`,workspace,correlationId))[0];if(existing&&['CREATED','PAID','EXPIRED','CANCELED'].includes(existing.status))return{success:true,duplicate:true,correlationId,status:existing.status,charge:existing.receipt,split:{type:'SPLIT_SUB_ACCOUNT',destinationPixKeyMasked:account.pix_key_masked},externalEffect:false};throw new HttpException({success:false,error:'previous_attempt_uncertain_manual_reconciliation_required'},HttpStatus.CONFLICT)}
    try{const provider=await this.woovi('POST','/api/v1/charge',{value:amount,correlationID:correlationId,comment:clean(body?.description||'Cobrança NexOffice',240),customer:body?.customer||undefined,splits:[{pixKey:account.pix_key,value:amount,splitType:'SPLIT_SUB_ACCOUNT'}],expiresIn:3600});const charge=safeCharge(provider,amount);await prisma.$executeRawUnsafe(`UPDATE nexoffice_subaccount_charge_receipts SET status='CREATED',provider_charge_id=$3,receipt=$4::jsonb,last_error=NULL,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2`,workspace,correlationId,charge.id||charge.identifier,JSON.stringify(charge));return{success:true,duplicate:false,correlationId,status:'CREATED',charge,split:{type:'SPLIT_SUB_ACCOUNT',destinationPixKeyMasked:account.pix_key_masked,valueMinor:amount},externalEffect:true}}catch(e:any){await prisma.$executeRawUnsafe(`UPDATE nexoffice_subaccount_charge_receipts SET status='UNCERTAIN',last_error=$3,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2`,workspace,correlationId,clean(e?.message||e,2000));throw e}
  }

  @Post(':correlationId/reconcile')
  async reconcile(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Param('correlationId') raw:string){const workspace=this.authorize(key,workspaceId);await ensureTable();const correlationId=clean(raw,220);const receipt=(await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM nexoffice_subaccount_charge_receipts WHERE workspace_id=$1 AND correlation_id=$2 LIMIT 1`,workspace,correlationId))[0];if(!receipt)throw new HttpException({success:false,error:'charge_not_found'},HttpStatus.NOT_FOUND);if(!receipt.provider_charge_id)throw new HttpException({success:false,error:'provider_charge_missing'},HttpStatus.CONFLICT);const provider=await this.woovi('GET',`/api/v1/charge/${encodeURIComponent(receipt.provider_charge_id)}`);const charge=safeCharge(provider,Number(receipt.amount_minor)),status=charge.status;await prisma.$executeRawUnsafe(`UPDATE nexoffice_subaccount_charge_receipts SET status=$3,receipt=$4::jsonb,last_error=NULL,updated_at=NOW() WHERE workspace_id=$1 AND correlation_id=$2`,workspace,correlationId,status,JSON.stringify(charge));return{success:true,correlationId,status,charge,externalEffect:false}}
}
