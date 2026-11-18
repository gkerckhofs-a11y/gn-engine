import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {localFixture} from './contextual-access-suite.mjs';
import {circuitsFixture} from './item-circuits-suite.mjs';
import {shopsFixture} from './space-outlaws-shops-suite.mjs';
import {classifyMaster} from './item-circuits-suite.mjs';
import {guardSpaceOutlawsEntry} from '../../src/core/space-outlaws-entry-guard.mjs';
export function contextualDeliverySuite(makeStore,prefix='Remise contextuelle'){
 const setup=async options=>{const f=await localFixture(makeStore,options);await f.scan();return f;};
 const mode=async(f,deliveryMode)=>{const o=(await f.read('shopAdmin',{},f.owner)).shops.find(s=>s.id==='counter').offers.find(o=>o.id==='supply');return f.admin('setShopDelivery',{shopId:'counter',offerId:'supply',offerRevision:o.revision,deliveryMode,reason:'Choix explicite du MJ'});};
 test(`${prefix} ACT-07/10 : livraison numérique immédiate et reçus idempotents`,async()=>{
  const f=await setup({classId:'COM',consumable:false});await mode(f,'DIGITAL');const before=await f.wallet(),input=f.purchaseInput({quantity:2,useProtected:false}),q=await f.read('prepareShopPurchase',input),pay={...input,quoteAt:q.quoteAt,confirmation:q.confirmation,requestId:randomUUID()},out=await f.cmd('buyShopOffer',pay);assert.deepEqual(await f.cmd('buyShopOffer',pay),out);
  assert.equal(out.deliveryMode,'DIGITAL');assert.equal(out.pickupStatus,'RECEIVED');assert.equal((await f.wallet()).balance,before.balance-60);assert.equal((await f.remaining()).quantity,6);
  const bag=await f.read('myInventory'),lot=bag.lots.find(l=>l.id===out.purchasedLotId);assert.equal(lot.quantity,2);assert.equal(lot.location.kind,'CHARACTER');assert.equal(lot.ownerId,f.cid);assert.equal(lot.holderId,f.cid);
  const p=(await f.orders()).find(p=>p.id===out.id);assert.equal(p.canPickup,false);await assert.rejects(f.cmd('confirmShopPickup',{saleId:p.id,confirmation:p.confirmation,received:true}),{code:'SALE_CLOSED'});
 });
 test(`${prefix} ACT-08/09 : retrait physique natif et fin de cycle après expiration locale`,async()=>{
  const f=await setup();await mode(f,'PHYSICAL');const sale=await f.buy(1);assert.equal(sale.pickupStatus,'WAITING');assert.ok(!(await f.read('myInventory')).lots.some(l=>l.id===sale.purchasedLotId));f.advance(61000);
  await f.pickup(sale);assert.ok((await f.read('myInventory')).lots.some(l=>l.id===sale.purchasedLotId));assert.equal((await f.orders()).find(p=>p.id===sale.id).pickupStatus,'RECEIVED');
 });
 test(`${prefix} ACT-11/12 : ancienne offre et commandes passées gardent leur mode`,async()=>{
  const f=await setup(),old=await f.buy(1);assert.equal(old.deliveryMode,undefined);await mode(f,'DIGITAL');assert.ok(!(await f.read('myInventory')).lots.some(l=>l.id===old.purchasedLotId));await f.pickup(old);
  const digital=await f.buy(1);await mode(f,'PHYSICAL');assert.equal((await f.orders()).find(p=>p.id===digital.id).deliveryMode,'DIGITAL');assert.ok((await f.read('myInventory')).lots.some(l=>l.id===digital.purchasedLotId));
  const physical=await f.buy(1);await mode(f,'DIGITAL');assert.equal((await f.orders()).find(p=>p.id===physical.id).deliveryMode,'PHYSICAL');assert.ok(!(await f.read('myInventory')).lots.some(l=>l.id===physical.purchasedLotId));
 });
 test(`${prefix} ACT-15 : devis périmé par changement de mode, droits et données invalides`,async()=>{
  const f=await setup(),input=f.purchaseInput({useProtected:false}),q=await f.read('prepareShopPurchase',input),before=await f.wallet();await mode(f,'DIGITAL');await assert.rejects(f.cmd('buyShopOffer',{...input,quoteAt:q.quoteAt,confirmation:q.confirmation}),{code:'STALE_REVISION'});assert.deepEqual(await f.wallet(),before);assert.equal((await f.remaining()).quantity,8);
  const body={shopId:'counter',offerId:'supply',offerRevision:2,deliveryMode:'DIGITAL',reason:'Tentative'};await assert.rejects(f.cmd('setShopDelivery',body),{code:'FORBIDDEN'});await assert.rejects(f.admin('setShopDelivery',{...body,deliveryMode:'INVENTED'}),{code:'INVALID_SHOP_DELIVERY'});
 });
 test(`${prefix} ACT-16 : dernière unité, deux acheteurs, un seul débit et lot`,async()=>{
  const f=await setup();await mode(f,'DIGITAL');await f.buy(7);await f.scan(f.other);
  const input=f.purchaseInput({useProtected:false}),qa=await f.read('prepareShopPurchase',input),qb=await f.read('prepareShopPurchase',input,f.other),before=[await f.wallet(),(await f.read('myWallet',{},f.other)).account];
  const out=await Promise.allSettled([f.cmd('buyShopOffer',{...input,quoteAt:qa.quoteAt,confirmation:qa.confirmation}),f.cmd('buyShopOffer',{...input,quoteAt:qb.quoteAt,confirmation:qb.confirmation},f.other)]);assert.equal(out.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.remaining()).quantity,0);
  const after=[await f.wallet(),(await f.read('myWallet',{},f.other)).account];assert.equal(before.reduce((n,a)=>n+a.balance,0)-after.reduce((n,a)=>n+a.balance,0),30);
 });
 test(`${prefix} : interruption après écritures annule stock, paiement et livraison`,async()=>{
  const f=await setup();await mode(f,'DIGITAL');const input=f.purchaseInput({quantity:2,useProtected:false}),q=await f.read('prepareShopPurchase',input),pay={...input,quoteAt:q.quoteAt,confirmation:q.confirmation,requestId:randomUUID()},before=await f.wallet(),run=f.store.runTransaction.bind(f.store);
  f.store.runTransaction=cb=>run(async tx=>{await cb(tx);throw Error('INTERRUPTION');});await assert.rejects(f.cmd('buyShopOffer',pay),/INTERRUPTION/);f.store.runTransaction=run;assert.deepEqual(await f.wallet(),before);assert.equal((await f.remaining()).quantity,8);const r=await f.cmd('buyShopOffer',pay);assert.equal((await f.read('myInventory')).lots.find(l=>l.id===r.purchasedLotId).quantity,2);
 });
 test(`${prefix} : circuit commercial conservé, aucun fret dans le sac ni droit de courtier implicite`,async()=>{
  const f=await setup({usage:'COMMERCIAL',classId:'COU'});await mode(f,'DIGITAL');const out=await f.buy(1),lot=await f.store.get(`sessions/${f.sid}/inventory/${out.purchasedLotId}`);assert.equal(lot.item.usage,'COMMERCIAL');assert.deepEqual(lot.location,{kind:'COMMERCIAL',id:f.cid,portId:'home'});assert.ok(!(await f.read('myInventory')).lots.some(l=>l.id===lot.id));
  const ordinary=await setup({usage:'COMMERCIAL'});await mode(ordinary,'DIGITAL');await assert.rejects(ordinary.read('prepareShopPurchase',ordinary.purchaseInput({useProtected:false})),{code:'FORBIDDEN'});
 });
 test(`${prefix} : mode M5 publié puis reçu par la nouvelle session, sans stock implicite`,async()=>{
  const f=await shopsFixture(makeStore,{release:false,offerPatch:{deliveryMode:'DIGITAL'},restricted:false});await classifyMaster(f);assert.deepEqual((await f.releasePreview()).blockers,[]);await f.release(await f.releasePreview());await f.birth(await f.birthPreview());
  const d=await f.actionRead('shopAdmin',{},f.owner);assert.equal(d.shops[0].offers[0].deliveryMode,'DIGITAL');assert.equal(d.shops[0].offers[0].deliverySchemaVersion,1);assert.equal(d.shops[0].offers[0].stock,0);
  const s=await f.store.get(`sessions/${f.sid}`);assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/${f.sid}/accounts/anything`,{}]]),false,new Set(['SHOP_DELIVERY'])),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
}
