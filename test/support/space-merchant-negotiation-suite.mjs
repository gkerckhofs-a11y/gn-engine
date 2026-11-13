import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {shopsFixture} from './space-outlaws-shops-suite.mjs';
import {negotiationTargetId,discountedTotal} from '../../src/core/space-merchant-negotiation.mjs';
import {shopsHtml} from '../../web/shops.mjs';
import {fieldResultHtml,fieldTargetHtml} from '../../web/field-actions.mjs';
export function merchantNegotiationSuite(makeStore){
async function fixture(options={}){
 const f=await shopsFixture(makeStore,{classId:'COU',createSupply:true,offerPatch:{negotiationLevel:1},...options}),targetId=negotiationTargetId('supply');
 const start=(quantity=1)=>f.start({targetId,tradeQuantity:quantity});
 return {...f,targetId,startNegotiation:start};
}
test('COU-02 : lot négocié au D6, remise de dix pour cent, paiement et stock natifs une seule fois',async()=>{
 const f=await fixture();f.setDie(4);const scan=await f.actionRead('fieldTarget',{targetId:f.targetId});assert.match(fieldTargetHtml(scan),/tradeQuantity/);const a=await f.startNegotiation(3);assert.equal(a.durationSeconds,120);f.advance(120000);const r=await f.finish(a);assert.equal(r.result.discount.amount,81);assert.equal(r.result.discount.quantity,3);assert.match(fieldResultHtml(r),/Utiliser la remise/);assert.match(shopsHtml(await f.actionRead('shops')),/discountActionId/);
 const input={shopId:'counter',offerId:'supply',quantity:3,useProtected:true,discountActionId:a.id},p=await f.actionRead('prepareShopPurchase',input);assert.equal(p.amount,81);const requestId=randomUUID(),payload={...input,quoteAt:p.quoteAt,confirmation:p.confirmation,requestId},sale=await f.actionCmd('buyShopOffer',payload);assert.deepEqual(await f.actionCmd('buyShopOffer',payload),sale);assert.equal((await f.remaining()).quantity,1);assert.equal((await f.till()).balance,81);await assert.rejects(f.actionRead('prepareShopPurchase',{...input,quantity:1}),{code:'NEGOTIATION_UNAVAILABLE'});assert.equal((await f.points()).available,4);
});
test('COU-02 : arrondi du total au supérieur et minimum un crédit, jamais addition de remises',()=>{
 for(const [total,expected] of [[1,1],[2,2],[11,10],[30,27],[91,82],[999,900]])assert.equal(discountedTotal(total),expected);
});
test('COU-02 : échec coûte un PA, pas de réduction, aucune relance de la même offre',async()=>{
 const f=await fixture(),a=await f.startNegotiation();f.advance(120000);const r=await f.finish(a);assert.equal(r.result.success,false);assert.equal(r.result.discount,undefined);assert.equal((await f.points()).available,4);await assert.rejects(f.actionRead('prepareShopPurchase',{shopId:'counter',offerId:'supply',quantity:1,useProtected:true,discountActionId:a.id}),{code:'NEGOTIATION_UNAVAILABLE'});f.advance(600000);await assert.rejects(f.startNegotiation(),{code:'FIELD_ANALYSIS_DONE'});
});
test('COU-02 : cinq minutes réelles, quantité, révision du lot et personnage contrôlés au paiement',async()=>{
 for(const changed of ['expiry','quantity','stock','person']){
  const f=await fixture();f.setDie(4);const a=await f.startNegotiation();f.advance(120000);await f.finish(a);const i={shopId:'counter',offerId:'supply',quantity:1,useProtected:true,discountActionId:a.id};
  if(changed==='expiry')f.advance(300000);if(changed==='quantity')i.quantity=2;if(changed==='stock')await f.provision({quantity:1});
  await assert.rejects(f.actionRead('prepareShopPurchase',i,changed==='person'?f.other:f.player),{code:'NEGOTIATION_UNAVAILABLE'});assert.equal((await f.till()).balance,0);
 }
});
test('COU-02 : cible non négociable, niveau insuffisant, modification pendant la durée et annulation',async()=>{
 const f=await fixture({offerPatch:{}});await assert.rejects(f.startNegotiation(),{code:'FIELD_UNAVAILABLE'});
 const g=await fixture({offerPatch:{negotiationLevel:3}});await assert.rejects(g.startNegotiation(),{code:'FIELD_SKILL_REQUIRED'});
 const h=await fixture();const a=await h.startNegotiation();await h.provision({quantity:1});h.advance(120000);await assert.rejects(h.finish(a),{code:'FIELD_STATE_CHANGED'});await h.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Offre changée'});assert.equal((await h.points()).available,5);
});
test('COU-02 : reprise du paiement après erreur transactionnelle sans remise perdue ni débit partiel',async()=>{
 const f=await fixture();f.setDie(4);const a=await f.startNegotiation();f.advance(120000);await f.finish(a);const input={shopId:'counter',offerId:'supply',quantity:1,useProtected:true,discountActionId:a.id},p=await f.actionRead('prepareShopPurchase',input),payload={...input,quoteAt:p.quoteAt,confirmation:p.confirmation,requestId:randomUUID()},run=f.store.runTransaction.bind(f.store);
 f.store.runTransaction=cb=>run(async tx=>{await cb(tx);throw Error('NETWORK');});await assert.rejects(f.actionCmd('buyShopOffer',payload),/NETWORK/);f.store.runTransaction=run;assert.equal((await f.till()).balance,0);assert.equal((await f.remaining()).quantity,4);await f.actionCmd('buyShopOffer',payload);assert.equal((await f.till()).balance,27);assert.equal((await f.remaining()).quantity,3);
});

}
