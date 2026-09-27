import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { NexOfficePayoutEngineService } from './nexoffice-payout-engine.service';

function clean(v:unknown,max=240){return String(v??'').replace(/\u0000/g,'').trim().slice(0,max)}
function safeEqual(a:string,b:string){if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}

@Controller('internal/nexoffice/payouts')
export class NexOfficePayoutEngineController {
  constructor(private readonly payouts:NexOfficePayoutEngineService){}
  private authorize(key?:string,workspaceId?:string){
    const expected=clean(process.env.NEXOFFICE_SERVICE_KEY,400);
    if(!expected)throw new HttpException({success:false,error:'bridge_not_configured'},HttpStatus.SERVICE_UNAVAILABLE);
    if(!safeEqual(clean(key,400),expected))throw new HttpException({success:false,error:'unauthorized'},HttpStatus.UNAUTHORIZED);
    const workspace=clean(workspaceId,120);if(!workspace)throw new HttpException({success:false,error:'workspace_required'},HttpStatus.BAD_REQUEST);return workspace;
  }
  private actionsEnabled(){return String(process.env.NEXOFFICE_PAYOUT_ACTIONS_ENABLED||process.env.NEXOFFICE_RECEIVING_ACCOUNT_ACTIONS_ENABLED||'false').toLowerCase()==='true'}
  private requireAction(body:any){if(!this.actionsEnabled())throw new HttpException({success:false,error:'payout_actions_disabled'},HttpStatus.CONFLICT);if(body?.humanApproved!==true)throw new HttpException({success:false,error:'human_approval_required'},HttpStatus.CONFLICT)}

  @Get('preview')
  async preview(@Headers('x-nexoffice-key') key?:string,@Headers('x-nexoffice-workspace-id') workspaceId?:string){
    const workspace=this.authorize(key,workspaceId);return this.payouts.preview(workspace);
  }

  @Post('policy')
  async policy(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Body() body:any){
    const workspace=this.authorize(key,workspaceId);this.requireAction(body);
    const policy=clean(body?.policy,20);
    if(!['manual','daily','economic'].includes(policy))throw new HttpException({success:false,error:'invalid_payout_policy'},HttpStatus.BAD_REQUEST);
    const thresholdMinor=body?.freeWithdrawThresholdMinor==null?undefined:Number(body.freeWithdrawThresholdMinor);
    const account=await this.payouts.setPolicy(workspace,policy as any,thresholdMinor);
    if(!account)throw new HttpException({success:false,error:'receiving_account_not_ready'},HttpStatus.CONFLICT);
    return{success:true,policy:account.payout_policy,freeWithdrawThresholdMinor:Number(account.free_withdraw_threshold_minor||0),pixKeyMasked:account.pix_key_masked,externalEffect:false};
  }

  @Post('withdraw-now')
  async withdraw(@Headers('x-nexoffice-key') key:string|undefined,@Headers('x-nexoffice-workspace-id') workspaceId:string|undefined,@Body() body:any){
    const workspace=this.authorize(key,workspaceId);this.requireAction(body);
    const value=body?.valueMinor==null?undefined:Number(body.valueMinor);
    if(value!==undefined&&(!Number.isSafeInteger(value)||value<100))throw new HttpException({success:false,error:'invalid_withdraw_value'},HttpStatus.BAD_REQUEST);
    try{return{success:true,withdrawal:await this.payouts.withdrawNow(workspace,value)}}catch(error:any){throw new HttpException({success:false,error:clean(error?.message||error,120)},HttpStatus.CONFLICT)}
  }
}
