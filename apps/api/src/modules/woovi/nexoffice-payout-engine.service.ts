import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let ensured: Promise<unknown> | null = null;

function clean(v:unknown,max=240){return String(v??'').replace(/\u0000/g,'').trim().slice(0,max)}
function enabled(name:string){return String(process.env[name]||'false').toLowerCase()==='true'}

async function ensureColumns(){
  if(!ensured)ensured=(async()=>{
    await prisma.$executeRawUnsafe(`ALTER TABLE nexoffice_receiving_accounts ADD COLUMN IF NOT EXISTS free_withdraw_threshold_minor BIGINT NOT NULL DEFAULT 50000`);
    await prisma.$executeRawUnsafe(`ALTER TABLE nexoffice_receiving_accounts ADD COLUMN IF NOT EXISTS last_payout_at TIMESTAMPTZ`);
    await prisma.$executeRawUnsafe(`ALTER TABLE nexoffice_receiving_accounts ADD COLUMN IF NOT EXISTS last_payout_status TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE nexoffice_receiving_accounts ADD COLUMN IF NOT EXISTS last_payout_minor BIGINT`);
  })().catch(e=>{ensured=null;throw e});
  return ensured;
}

@Injectable()
export class NexOfficePayoutEngineService {
  private readonly logger=new Logger(NexOfficePayoutEngineService.name);

  private config(){
    const appId=clean(process.env.WOOVI_APP_ID,1000);
    const base=clean(process.env.WOOVI_API_URL||'https://api.woovi.com',500).replace(/\/$/,'');
    return{appId,base,sandbox:base.includes('woovi-sandbox.com')};
  }
  private async woovi(method:'GET'|'POST',path:string,body?:any){
    const{appId,base}=this.config();
    if(!appId)throw new Error('woovi_not_configured');
    const r=await fetch(`${base}${path}`,{method,headers:{Authorization:appId,'Content-Type':'application/json',Accept:'application/json'},body:method==='POST'?JSON.stringify(body||{}):undefined});
    const text=await r.text();let data:any=text;try{data=JSON.parse(text)}catch{}
    if(!r.ok)throw new Error(`woovi_request_failed:${r.status}`);
    return data;
  }
  private async refresh(row:any){
    const provider=await this.woovi('GET',`/api/v1/subaccount/${encodeURIComponent(row.pix_key)}`);
    const sub=provider?.SubAccount||provider?.subAccount||provider?.subaccount||provider||{};
    const balance=Number(sub.balance||0);
    await prisma.$executeRawUnsafe(`UPDATE nexoffice_receiving_accounts SET last_balance_minor=$2,last_checked_at=NOW(),updated_at=NOW() WHERE workspace_id=$1`,row.workspace_id,balance);
    return balance;
  }
  private decision(row:any,balance:number){
    const policy=String(row.payout_policy||'manual');
    const threshold=Number(row.free_withdraw_threshold_minor||50000);
    if(policy==='manual')return{shouldWithdraw:false,reason:'manual_policy',balanceMinor:balance,thresholdMinor:threshold};
    if(balance<=0)return{shouldWithdraw:false,reason:'no_balance',balanceMinor:balance,thresholdMinor:threshold};
    if(policy==='daily')return{shouldWithdraw:true,reason:'daily_policy',balanceMinor:balance,thresholdMinor:threshold};
    if(policy==='economic')return balance>=threshold?{shouldWithdraw:true,reason:'threshold_reached',balanceMinor:balance,thresholdMinor:threshold}:{shouldWithdraw:false,reason:'below_free_threshold',balanceMinor:balance,thresholdMinor:threshold};
    return{shouldWithdraw:false,reason:'unknown_policy',balanceMinor:balance,thresholdMinor:threshold};
  }
  async preview(workspaceId:string){
    await ensureColumns();
    const row=(await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM nexoffice_receiving_accounts WHERE workspace_id=$1 AND provider_status='ACTIVE' LIMIT 1`,workspaceId))[0];
    if(!row)return{configured:false,externalEffect:false};
    const balance=await this.refresh(row);
    return{configured:true,policy:row.payout_policy,pixKeyMasked:row.pix_key_masked,...this.decision(row,balance),externalEffect:false};
  }
  async setPolicy(workspaceId:string,policy:'manual'|'daily'|'economic',thresholdMinor?:number){
    await ensureColumns();
    const threshold=Number.isSafeInteger(thresholdMinor)&&Number(thresholdMinor)>=100?Number(thresholdMinor):50000;
    const rows=await prisma.$queryRawUnsafe<any[]>(`UPDATE nexoffice_receiving_accounts SET payout_policy=$2,free_withdraw_threshold_minor=$3,updated_at=NOW() WHERE workspace_id=$1 RETURNING workspace_id,pix_key_masked,payout_policy,free_withdraw_threshold_minor`,workspaceId,policy,threshold);
    return rows[0]||null;
  }
  async withdrawNow(workspaceId:string,valueMinor?:number){
    await ensureColumns();
    const row=(await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM nexoffice_receiving_accounts WHERE workspace_id=$1 AND provider_status='ACTIVE' LIMIT 1`,workspaceId))[0];
    if(!row)throw new Error('receiving_account_not_ready');
    const body=valueMinor&&Number.isSafeInteger(valueMinor)&&valueMinor>0?{value:valueMinor}:{};
    const provider=await this.woovi('POST',`/api/v1/subaccount/${encodeURIComponent(row.pix_key)}/withdraw`,body);
    const amount=valueMinor||Number(row.last_balance_minor||0)||null;
    await prisma.$executeRawUnsafe(`UPDATE nexoffice_receiving_accounts SET last_payout_at=NOW(),last_payout_status='requested',last_payout_minor=$2,updated_at=NOW() WHERE workspace_id=$1`,workspaceId,amount);
    return{status:'requested',pixKeyMasked:row.pix_key_masked,valueMinor:amount,providerReceived:Boolean(provider),sandbox:this.config().sandbox,externalEffect:true};
  }
  async runScheduled(){
    if(!enabled('NEXOFFICE_PAYOUT_ENGINE_ENABLED'))return{enabled:false,processed:0,withdrawn:0};
    await ensureColumns();
    const rows=await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM nexoffice_receiving_accounts WHERE provider_status='ACTIVE' AND payout_policy IN ('daily','economic') ORDER BY workspace_id`);
    let withdrawn=0;
    for(const row of rows){
      try{
        const balance=await this.refresh(row);
        const decision=this.decision(row,balance);
        if(!decision.shouldWithdraw)continue;
        await this.withdrawNow(row.workspace_id);
        withdrawn++;
      }catch(error:any){
        this.logger.warn(`Payout skipped workspace=${clean(row.workspace_id,120)} reason=${clean(error?.message||error,180)}`);
      }
    }
    return{enabled:true,processed:rows.length,withdrawn};
  }

  @Cron('0 20 * * *',{timeZone:'America/Sao_Paulo'})
  async dailyRun(){
    try{const result=await this.runScheduled();if(result.enabled)this.logger.log(`Payout Engine processed=${result.processed} withdrawn=${result.withdrawn}`)}catch(error:any){this.logger.error(`Payout Engine failed: ${clean(error?.message||error,200)}`)}
  }
}
