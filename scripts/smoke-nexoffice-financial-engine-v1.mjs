import fs from 'node:fs';
import assert from 'node:assert/strict';

const controller=fs.readFileSync('apps/api/src/modules/woovi/nexoffice-charge.controller.ts','utf8');
const adapter=fs.readFileSync('apps/api/src/modules/woovi/woovi-pix-adapter.ts','utf8');
const moduleFile=fs.readFileSync('apps/api/src/modules/woovi/woovi.module.ts','utf8');

for(const endpoint of ["@Get('health')","@Post('charges')","@Get('charges/:correlationId')","@Post('charges/:correlationId/reconcile')","@Post('subscriptions')","@Get('subscriptions/:correlationId')","@Post('subscriptions/:correlationId/cancel')"]){
  assert.ok(controller.includes(endpoint),`missing endpoint ${endpoint}`);
}
for(const capability of ['pix.charge.create.approved','pix.charge.status.read','pix.charge.reconcile.read','pix.recurring.create.approved','pix.recurring.status.read','pix.recurring.cancel.approved'])assert.ok(controller.includes(capability),`missing capability ${capability}`);
assert.ok(controller.includes("NEXOFFICE_FINANCIAL_ACTIONS_ENABLED || 'false'"),'financial external actions must default OFF');
assert.ok(controller.includes('human_approval_required'),'human approval guard missing');
assert.ok(controller.includes('financial_actions_disabled'),'environment action gate missing');
assert.ok(controller.includes('block_retry_until_reconciled'),'ambiguous result policy missing');
assert.ok(controller.includes("status='UNCERTAIN'"),'uncertain provider result persistence missing');
assert.ok(controller.includes('provider_result_uncertain_manual_reconciliation_required'),'uncertain provider result must block automatic retry');
assert.ok(controller.includes('UNIQUE(workspace_id, correlation_id)'),'workspace/idempotency uniqueness missing');
assert.ok(controller.includes('externalEffect: false'),'read-only operations must declare no external effect');
assert.ok(controller.includes('externalEffect: true'),'financial mutations must declare external effect');
assert.ok(controller.includes('safeChargeReceipt'),'charge response sanitizer missing');
assert.ok(controller.includes('safeSubscriptionReceipt'),'subscription response sanitizer missing');
assert.ok(controller.includes('openFinanceRead: false'),'Open Finance read must remain explicitly out of V1');
assert.ok(adapter.includes('async createCharge('),'Woovi charge adapter missing');
assert.ok(adapter.includes('async getCharge('),'Woovi charge reconciliation read missing');
assert.ok(adapter.includes('async createSubscription('),'Woovi recurring Pix adapter missing');
assert.ok(adapter.includes('async cancelSubscription('),'Woovi recurring cancellation missing');
assert.ok(moduleFile.includes('NexOfficeChargeController'),'NexOffice financial bridge not registered');
assert.ok(!controller.includes('createTransfer('),'NexOffice V1 must not expose Pix-out/transfer');
assert.ok(!controller.includes('USDC')&&!controller.includes('PAXG')&&!controller.includes('USDY'),'NexOffice Financial Engine V1 must not expose investment/crypto automation');

console.log(JSON.stringify({ok:true,module:'NextGen Financial Engine V1',capabilities:['pix_charge','charge_status','charge_reconciliation','pix_recurring','recurring_status','recurring_cancel'],actionsDefaultOff:true,humanApprovalRequired:true,investmentAutomation:false,pixOut:false,openFinanceRead:false}));
