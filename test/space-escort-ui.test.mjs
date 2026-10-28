import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {escortFixture} from './support/space-escort-suite.mjs';
import {createContractUi} from '../web/contracts.mjs';
import {escortPayload,escortReviewPayload,escortFuelPayload,escortFuelConfirm} from '../web/space-escort.mjs';
const ui=createContractUi({button:()=>'',link:()=>''});
test('Escorte UI : offre et contrat natifs, budget distinct, plein et rendu de navigation',async()=>{
 const f=await escortFixture(()=>new MemoryStore(),{accept:true});const s=await f.read('session',{},f.owner),d=await f.read('sessionApplication',{applicationId:f.ep.applicationId},f.owner),html=ui.offer(s,d);assert.match(html,/name="escortShip"/);assert.match(html,/name="escortReturnRoute"/);assert.match(html,/provision carburant/);
 const page=ui.detail(await f.detail());assert.match(page,/100 Cr<\/strong> pour 4 unités/);assert.match(page,/name="fuelOffer"/);assert.match(page,/data-mode="RELEASE"/);assert.match(page,/terminer le plein/);assert.doesNotMatch(page,/SECRET_MJ_ESCORT|SECRET_BRIEFING|lotIds/);
 await f.fuel();await f.launch();await f.escortProof();const admin=ui.detail(await f.detail(f.owner));assert.match(admin,/name="escortOutcome"/);assert.match(admin,/name="protectionConfirmed"/);assert.doesNotMatch(admin,/name="decision"><option value="PAY"/);
});
test('Escorte UI : formulaires et confirmation conservent les choix sans injection HTML',()=>{
 assert.deepEqual(escortPayload({escortTransport:'c',escortShip:'s',escortReturnRoute:'back',escortExpenses:'frais'}),{escort:{transportContractId:'c',shipId:'s',returnRouteId:'back',expenses:'frais'}});
 assert.deepEqual(escortReviewPayload({escortOutcome:'DEFENDED',protectionConfirmed:'on'}),{escortOutcome:'DEFENDED',decision:'PAY',protectionConfirmed:true,faultConfirmed:false});
 const x=escortFuelPayload('REFUEL',{fuelOffer:JSON.stringify({shopId:'counter',offerId:'fuel'}),quantity:'2'},'s','c');assert.deepEqual(x.input,{sessionId:'s',contractId:'c',shopId:'counter',offerId:'fuel',quantity:2});assert.equal(x.command,'startEscortRefuel');const h=escortFuelConfirm({quantity:2,cost:50,confirmation:'<script>'},x.input,x.command);assert.match(h,/present&quot;:true/);assert.doesNotMatch(h,/<script>/);assert.equal(escortFuelPayload('RELEASE',{reason:'Reste'},'s','c',true).command,'releaseEscortFuelAdmin');
});
