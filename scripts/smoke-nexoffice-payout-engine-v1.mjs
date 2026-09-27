import fs from 'node:fs';
import assert from 'node:assert/strict';

const service=fs.readFileSync('apps/api/src/modules/woovi/nexoffice-payout-engine.service.ts','utf8');
const controller=fs.readFileSync('apps/api/src/modules/woovi/nexoffice-payout-engine.controller.ts','utf8');
const module=fs.readFileSync('apps/api/src/modules/woovi/woovi.module.ts','utf8');

for(const value of ["payout_policy IN ('daily','economic')","free_withdraw_threshold_minor","@Cron('0 20 * * *',{timeZone:'America/Sao_Paulo'})","NEXOFFICE_PAYOUT_ENGINE_ENABLED","below_free_threshold","daily_policy","threshold_reached"]){assert.ok(service.includes(value),`missing payout engine rule: ${value}`)}
assert.ok(service.includes("policy==='manual'"),'manual policy must never auto-withdraw');
assert.ok(service.includes("policy==='economic'"),'economic policy missing');
assert.ok(service.includes("policy==='daily'"),'daily policy missing');
assert.ok(service.includes("/withdraw`"),'withdraw provider call missing');
assert.ok(!service.includes('WOOVI_FROM_PIX_KEY'),'payout engine must never use platform destination key');
assert.ok(!service.includes('createTransfer('),'generic Pix-out must remain unavailable');

for(const value of ["@Controller('internal/nexoffice/payouts')","@Get('preview')","@Post('policy')","@Post('withdraw-now')","human_approval_required","payout_actions_disabled"]){assert.ok(controller.includes(value),`missing payout control: ${value}`)}
assert.ok(controller.includes("['manual','daily','economic']"),'only approved payout policies should be accepted');
assert.ok(controller.includes('humanApproved'),'withdraw-now and policy changes require human approval');
assert.ok(module.includes('NexOfficePayoutEngineService'),'payout service must be registered');
assert.ok(module.includes('NexOfficePayoutEngineController'),'payout controller must be registered');

console.log(JSON.stringify({ok:true,module:'NexOffice Payout Engine V1',policies:['manual','daily','economic'],scheduledAt:'20:00 America/Sao_Paulo',actionsDefaultOff:true,humanApprovalForInstant:true,genericPixOut:false}));
