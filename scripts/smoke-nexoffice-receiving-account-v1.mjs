import fs from 'node:fs';
import assert from 'node:assert/strict';

const controller=fs.readFileSync('apps/api/src/modules/woovi/nexoffice-receiving-account.controller.ts','utf8');
const charge=fs.readFileSync('apps/api/src/modules/woovi/nexoffice-subaccount-charge.controller.ts','utf8');
const module=fs.readFileSync('apps/api/src/modules/woovi/woovi.module.ts','utf8');

for(const value of ["@Controller('internal/nexoffice/receiving-account')","@Post('setup')","@Post('refresh')","@Post('test-charge')","@Post('withdraw')","SPLIT_SUB_ACCOUNT","human_approval_required","NEXOFFICE_RECEIVING_ACCOUNT_ACTIONS_ENABLED"]){
  assert.ok(controller.includes(value),`missing receiving account contract: ${value}`);
}
assert.ok(controller.includes("process.env.NEXOFFICE_FINANCIAL_ACTIONS_ENABLED||'false'"),'actions must default off through financial gate fallback');
assert.ok(controller.includes("pixKeyMasked"),'Pix key must be masked in safe responses');
assert.ok(controller.includes("destinationPixKeyMasked"),'split destination must be masked in test response');
assert.ok(controller.includes("/api/v1/subaccount/${encodeURIComponent(row.pix_key)}/withdraw"),'withdrawal must use the registered subaccount key');
assert.ok(controller.includes("splits:[{pixKey:row.pix_key,value,splitType:'SPLIT_SUB_ACCOUNT'}]"),'test charge must split to registered subaccount');
assert.ok(controller.includes("payoutPolicy=body.payoutPolicy==='daily'?'daily':'manual'"),'daily/manual payout policy must be explicit');
assert.ok(controller.includes("test_amount_must_be_100_to_5000"),'test amount must be tightly bounded');
assert.ok(!controller.includes('WOOVI_FROM_PIX_KEY'),'receiving account flow must not fall back to platform Pix key');
assert.ok(!controller.includes('createTransfer('),'generic Pix-out must not be exposed');

assert.ok(charge.includes("@Controller('internal/nexoffice/receiving-account/charges')"),'workspace subaccount charge bridge missing');
assert.ok(charge.includes("provider_status='ACTIVE'"),'normal charge must require an active receiving account');
assert.ok(charge.includes("splits:[{pixKey:account.pix_key,value:amount,splitType:'SPLIT_SUB_ACCOUNT'}]"),'normal charge must route 100% through registered workspace subaccount');
assert.ok(charge.includes('PRIMARY KEY(workspace_id,correlation_id)'),'workspace charge idempotency missing');
assert.ok(charge.includes("previous_attempt_uncertain_manual_reconciliation_required"),'uncertain result must block retry');
assert.ok(charge.includes("@Post(':correlationId/reconcile')"),'subaccount reconciliation route missing');
assert.ok(charge.includes('destinationPixKeyMasked:account.pix_key_masked'),'normal charge response must expose only masked destination');
assert.ok(!charge.includes('WOOVI_FROM_PIX_KEY')&&!charge.includes('WOOVI_NEXTGEN_PIX_KEY'),'normal workspace charge must never fall back to platform Pix key');
assert.ok(!charge.includes('createTransfer('),'subaccount charge bridge must not expose generic Pix-out');

assert.ok(module.includes('NexOfficeReceivingAccountController'),'receiving account controller must be registered');
assert.ok(module.includes('NexOfficeSubaccountChargeController'),'subaccount charge controller must be registered');

console.log(JSON.stringify({ok:true,module:'NexOffice Receiving Account V1',subaccount:true,normalWorkspaceChargesUseRegisteredSubaccount:true,splitType:'SPLIT_SUB_ACCOUNT',actionsDefaultOff:true,humanApproval:true,pixKeyMasked:true,testAmountMaxMinor:5000,dailyPayoutPolicyStored:true,idempotentCharges:true,uncertainRetryBlocked:true,genericPixOut:false,platformPixFallback:false}));
