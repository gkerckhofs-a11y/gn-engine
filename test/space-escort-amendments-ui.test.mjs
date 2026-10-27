import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {amendmentFixture} from './support/space-escort-amendments-suite.mjs';
import {createContractUi} from '../web/contracts.mjs';
import {amendmentPayload,amendmentConfirm} from '../web/space-escort-amendments.mjs';
import {escortReviewFields,escortReviewPayload} from '../web/space-escort.mjs';
const ui=createContractUi({button:()=>'',link:()=>''});
test('Avenants UI : proposition MJ, consentements personnels et confidentialité du cargo',async()=>{
 const f=await amendmentFixture(()=>new MemoryStore());assert.match(ui.detail(await f.detail(f.owner)),/data-mode="PROPOSE"/);await f.proposeAmendment();
 const cargo=ui.detail(await f.view()),escort=ui.detail(await f.detail()),admin=ui.detail(await f.detail(f.owner));
 assert.match(cargo,/data-escort="false"/);assert.match(escort,/data-escort="true"/);assert.match(escort,/Nouveau salaire : <strong>125 Cr/);assert.doesNotMatch(cargo,/Nouveau salaire|SECRET_ESCORT|SECRET_MJ|carburant supplémentaire distincte/);assert.match(admin,/data-mode="CANCEL"/);assert.doesNotMatch(cargo,/data-mode="PROPOSE"|data-mode="CANCEL"/);
 await f.respondAmendment(false);assert.doesNotMatch(ui.detail(await f.view()),/data-mode="RESPONSE"/);await f.respondAmendment();assert.match(ui.detail(await f.view()),/Itinéraire accepté/);
});
test('Avenants UI : champs autorisés, retrait et référence de règlement sûre',()=>{
 const x=amendmentPayload('PROPOSE',{route0:'one',route1:'two',overCapApproved:'on',approvalReason:'MJ',reason:'Détour',newSalary:1},'s','e');assert.deepEqual(x.input,{sessionId:'s',contractId:'e',reason:'Détour',routeIds:['one','two'],overCapApproved:true,approvalReason:'MJ'});
 assert.equal(amendmentPayload('RESPONSE',{decision:'ACCEPT',reason:'OK'},'s','f',false).command,'respondTransportAmendment');
 const a={routes:[{name:'<script>',fromPort:'a',toPort:'b'}],reason:'<script>',confirmation:'<script>',safeSeparation:true,refusalAward:51};const h=amendmentConfirm(a,{},'respondEscortAmendment');assert.doesNotMatch(h,/<script>/);assert.match(h,/51 Cr, 50 % du salaire initial/);
 assert.match(amendmentConfirm(a,{},'cancelEscortAmendmentAdmin'),/Confirmer le retrait de la proposition/);assert.doesNotMatch(escortReviewFields({award:51}),/value="DELIVERED"|value="DEFENDED"|value="NOT_STARTED"/);assert.equal(escortReviewPayload({escortOutcome:'DETOUR_REFUSED'}).decision,'PAY');
});
