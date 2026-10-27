import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {contractAppealsFixture} from './support/space-contract-appeals-suite.mjs';
import {createContractUi} from '../web/contracts.mjs';
import {appealFinancePanel,appealFinancePayload,appealFinanceConfirmation,appealFinanceErrors} from '../web/space-contract-appeals.mjs';
const ui=createContractUi({button:(l,a)=>`<button data-action="${a}">${l}</button>`,link:(l,p)=>`<a href="#/${p}">${l}</a>`});
test('Recours UI : décision financière MJ explicite, limites du contrat et ancien manifeste fermé',async()=>{
 const f=await contractAppealsFixture(()=>new MemoryStore());await f.file();const d=await f.detail(f.owner),h=ui.detail(d);assert.match(h,/Décision financière du recours/);assert.match(h,/name="basis"/);assert.match(h,/name="adjustedAmount"[^>]*min="0" max="100"/);assert.match(h,/Cette décision ne déplace aucun crédit/);assert.doesNotMatch(appealFinancePanel({...d,appealFinance:undefined}),/soAppealFinance/);assert.doesNotMatch(appealFinancePanel(await f.detail()),/name="adjustedAmount"/);
});
test('Recours UI : restitution consentie et reliquat visible sans commande de prélèvement MJ',async()=>{
 const f=await contractAppealsFixture(()=>new MemoryStore());await f.file();await f.adjust();await f.pay(25);const h=ui.detail(await f.detail()),admin=ui.detail(await f.detail(f.owner));assert.match(h,/Décision financière rendue/);assert.doesNotMatch(h,/FINANCIAL_DECISION/);assert.match(h,/data-kind="PAY"/);assert.match(h,/name="consent" type="checkbox" required/);assert.match(h,/restant dû : <strong>35 Cr/);assert.match(h,/crédits protégés et les réserves existantes sont conservés/);assert.doesNotMatch(admin,/data-kind="PAY_ADMIN"|data-kind="PAY"/);assert.match(admin,/restitution doit être confirmée par le titulaire/);
});
test('Recours UI : complément PNJ et données de formulaire strictement sélectionnées',async()=>{
 const f=await contractAppealsFixture(()=>new MemoryStore(),{paid:40});await f.file();await f.adjust(100);assert.match(appealFinancePanel(await f.detail(f.owner)),/data-kind="PAY_ADMIN"/);assert.doesNotMatch(appealFinancePanel(await f.detail()),/data-kind="PAY"/);
 assert.deepEqual(appealFinancePayload('ADJUST',{basis:'FRAUD',adjustedAmount:'40',reason:'Preuve',sourceAccountId:'x'},'s','c'),{prepare:'prepareContractAppealAdjustment',command:'adjustContractAppeal',input:{sessionId:'s',contractId:'c',reason:'Preuve',basis:'FRAUD',adjustedAmount:40}});
 assert.deepEqual(appealFinancePayload('PAY',{amount:'10',consent:'on',reason:'Restitution',createdCurrency:10},'s','c').input,{sessionId:'s',contractId:'c',reason:'Restitution',amount:10,consent:true});assert.equal(appealFinancePayload('PAY',{amount:'10'},'s','c').input.consent,false);assert.equal('consent' in appealFinancePayload('PAY_ADMIN',{amount:'10',consent:'on'},'s','c').input,false);
});
test('Recours UI : confirmation distingue créance et mouvement réel, textes privés échappés',async()=>{
 const f=await contractAppealsFixture(()=>new MemoryStore());await f.file();let p=f.adjustment(40,{reason:'<script>Erreur</script>'}),d=await f.read('prepareContractAppealAdjustment',p,f.owner),h=appealFinanceConfirmation(d,p,'adjustContractAppeal');assert.match(h,/Aucun crédit déplacé/);assert.match(h,/type="checkbox" required/);assert.doesNotMatch(h,/<script>/);await f.adjust();p=f.payment(10);d=await f.read('prepareContractAppealPayment',p);h=appealFinanceConfirmation(d,p,'payContractAppeal');assert.match(h,/disponible avant paiement : 100 Cr/);assert.match(h,/restant dû après paiement : 50 Cr/);assert.match(h,/data-command="payContractAppeal"/);assert.doesNotMatch(h,/Aucun crédit déplacé/);for(const msg of Object.values(appealFinanceErrors))assert.ok(msg.length>30);
});
