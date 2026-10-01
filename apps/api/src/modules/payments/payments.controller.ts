import { Controller, Get, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { StripeConnectAdapter } from './stripe-connect.adapter';

function clean(value:unknown,max=500){return String(value??'').replace(/\u0000/g,'').trim().slice(0,max)}
function safeEqual(a:string,b:string){if(!a||!b)return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}

@Controller('internal/nexoffice/payment-providers')
export class PaymentsController {
  constructor(private readonly stripe:StripeConnectAdapter){}
  private authorize(key?:string){const expected=clean(process.env.NEXOFFICE_SERVICE_KEY,400);if(!expected)throw new HttpException({success:false,error:'bridge_not_configured'},HttpStatus.SERVICE_UNAVAILABLE);if(!safeEqual(clean(key,400),expected))throw new HttpException({success:false,error:'unauthorized'},HttpStatus.UNAUTHORIZED)}

  @Get()
  async providers(@Headers('x-nexoffice-key') key?:string){
    this.authorize(key);
    const stripeCapabilities=this.stripe.capabilities();
    const stripeHealth=await this.stripe.health().catch(()=>({ok:false,provider:'stripe_connect',configured:stripeCapabilities.configured,enabled:stripeCapabilities.enabled,accountId:null}));
    return{success:true,providers:[{...stripeCapabilities,health:stripeHealth}],externalEffect:false};
  }
}
