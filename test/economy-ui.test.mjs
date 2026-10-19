import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomyUi} from '../web/economy.mjs';
import {createHealthUi} from '../web/health.mjs';
const helpers={button:(l,a,x='')=>`<button data-action="${a}" ${x}>${l}</button>`,link:(l,u)=>`<a href="#/${u}">${l}</a>`};
const ui=createEconomyUi(helpers),evil='<img src=x onerror="bad()">',currency={name:evil,unit:'crédit'},before={balance:100,reserved:30,available:70,revision:1},after={balance:60,reserved:30,available:30,revision:2};
const d={session:{id:'session',stage:'EN_JEU'},character:{id:'alice',name:evil},currency,account:before,canPay:true,entries:[{id:'event',at:100000,kind:'GM_ADJUSTMENT',memo:evil,delta:100,before:{balance:0},after:before}]};
test('crédits UI : portefeuille personnel échappé, soldes distincts et aperçu sans action',()=>{
  const html=ui.page(d);assert.match(html,/Solde total/);assert.match(html,/Réservé/);assert.match(html,/Disponible/);assert.match(html,/paymentForm/);assert.doesNotMatch(html,/<img|actorUid|reason/);assert.doesNotMatch(ui.page({...d,preview:true}),/<button|<a /);assert.match(ui.page({...d,canPay:false}),/data-action="paymentForm"[^>]*disabled/);
});
test('crédits UI : badge et récapitulatif obligatoire, conséquences du paiement explicites',()=>{
  const form=ui.payment(d);assert.match(form,/name="badgeUrl" type="url" required/);assert.match(form,/name="amount"[^>]*max="70"/);assert.match(form,/Motif visible par les deux personnages/);assert.doesNotMatch(form,/<img/);
  const html=ui.paymentConfirm({source:d.character,recipient:{name:evil},currency,amount:40,memo:evil,before,after,confirmation:'proof'},{sessionId:'session'});assert.match(html,/100 → 60/);assert.match(html,/70 → 30/);assert.match(html,/ne transfère aucun objet/);assert.match(html,/payCredits/);assert.doesNotMatch(html,/<img/);
});
test('crédits UI : dotation et correction séparées, motif privé identifié',()=>{
  const c={id:'s',revision:1,economyRules:currency,characters:[{id:'alice',public:{displayName:evil}}]};assert.match(ui.seed(c,c.characters[0]),/min="0"/);assert.match(ui.seed(c,c.characters[0]),/sessions existantes seront conservés/);
  const form=ui.adjustment(c,'alice');assert.match(form,/Motif réservé au MJ/);assert.match(form,/Libellé visible dans le journal du joueur/);assert.doesNotMatch(form,/<img/);
  const html=ui.adjustmentConfirm({character:d.character,currency,delta:-40,memo:evil,before,after,confirmation:'proof'},{reason:evil});assert.match(html,/applyCreditAdjustment/);assert.match(html,/70 → 30/);assert.doesNotMatch(html,/<img/);
});
test('crédits UI : unité de session figée et paiement hors combat désactivé par défaut',()=>{
  assert.match(ui.rules({id:'s',revision:1,economyRules:currency},'session'),/name="unit"[^>]*readonly/);assert.doesNotMatch(ui.rules({id:'s',revision:1},'scenario'),/readonly/);
  const health=createHealthUi(helpers);assert.match(health.rules({id:'s',revision:1},'scenario'),/name="pay"/);assert.doesNotMatch(health.rules({id:'s',revision:1},'scenario'),/name="pay" checked/);
});
