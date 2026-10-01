import { Injectable } from '@nestjs/common';
import type {PaymentProviderAdapter,ProviderCapabilities} from './payment-provider.types';

function clean(value:unknown,max=500){return String(value??'').replace(/\u0000/g,'').trim().slice(0,max)}
function enabled(){return String(process.env.STRIPE_CONNECT_ENABLED||'false').toLowerCase()==='true'}

@Injectable()
export class StripeConnectAdapter implements PaymentProviderAdapter {
  readonly provider='stripe_connect';
  private secret(){return clean(process.env.STRIPE_SECRET_KEY,1000)}
  private apiBase(){return clean(process.env.STRIPE_API_URL||'https://api.stripe.com',500).replace(/\/$/,'')}

  capabilities():ProviderCapabilities{
    return{
      provider:this.provider,
      configured:Boolean(this.secret()),
      enabled:enabled(),
      methods:['CARD'],
      subscriptions:true,
      connectedAccounts:true,
      splitOrApplicationFee:true,
      instantPayouts:true,
      refunds:true,
      disputes:true
    };
  }

  async health(){
    const secret=this.secret();
    if(!secret)return{ok:false,provider:this.provider,configured:false,enabled:enabled(),accountId:null};
    const response=await fetch(`${this.apiBase()}/v1/account`,{headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(10_000)});
    const payload=await response.json().catch(()=>({})) as any;
    if(!response.ok)return{ok:false,provider:this.provider,configured:true,enabled:enabled(),accountId:null};
    return{ok:true,provider:this.provider,configured:true,enabled:enabled(),livemode:Boolean(payload?.livemode),accountId:clean(payload?.id,120)||null};
  }
}
