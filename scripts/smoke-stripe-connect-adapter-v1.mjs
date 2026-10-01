import fs from 'node:fs';
import assert from 'node:assert/strict';

const adapter=fs.readFileSync('apps/api/src/modules/payments/stripe-connect.adapter.ts','utf8');
const controller=fs.readFileSync('apps/api/src/modules/payments/payments.controller.ts','utf8');
const module=fs.readFileSync('apps/api/src/modules/payments/payments.module.ts','utf8');
const app=fs.readFileSync('apps/api/src/app.module.ts','utf8');

for(const value of ['STRIPE_CONNECT_ENABLED','STRIPE_SECRET_KEY','https://api.stripe.com',"methods:['CARD']",'subscriptions:true','connectedAccounts:true','splitOrApplicationFee:true','instantPayouts:true']){assert.ok(adapter.includes(value),`missing Stripe capability contract: ${value}`)}
assert.ok(adapter.includes('/v1/account'),'readiness must verify the configured Stripe account');
assert.ok(!adapter.includes('/v1/payment_intents')&&!adapter.includes('/v1/charges')&&!adapter.includes('/v1/payouts'),'V1 readiness adapter must not create financial effects');
assert.ok(controller.includes("@Controller('internal/nexoffice/payment-providers')"),'provider readiness endpoint missing');
assert.ok(controller.includes('externalEffect:false'),'provider discovery must be read-only');
assert.ok(module.includes('StripeConnectAdapter'),'Stripe adapter must be registered');
assert.ok(app.includes('PaymentsModule'),'payments module must be mounted');

console.log(JSON.stringify({ok:true,module:'Stripe Connect Adapter V1',readinessOnly:true,financialEffects:false,card:true,subscriptions:true,connectedAccounts:true}));
