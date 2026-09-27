import fs from 'node:fs';
import assert from 'node:assert/strict';

const controller=fs.readFileSync('apps/api/src/modules/woovi/nexoffice-receiving-account.controller.ts','utf8');
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
assert.ok(module.includes('NexOfficeReceivingAccountController'),'controller must be registered');

console.log(JSON.stringify({ok:true,module:'NexOffice Receiving Account V1',subaccount:true,splitType:'SPLIT_SUB_ACCOUNT',actionsDefaultOff:true,humanApproval:true,pixKeyMasked:true,testAmountMaxMinor:5000,dailyPayoutPolicyStored:true,genericPixOut:false}));
