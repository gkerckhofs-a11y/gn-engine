import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {shopAccountId,shopStockId} from '../../src/core/space-outlaws-shop-state.mjs';

export async function shopsFixture(makeStore,{release=true,stock=4,restricted=true,...options}={}){
 const f=await actionsFixture(makeStore,{classId:'MED',helper:true,release:false,...options});let revision=(await f.view()).draft.revision;
 await f.cc('saveCentralCharacter',{characterId:'merchant',characterRevision:0,draftRevision:revision++,character:{...centralTestCharacter,displayName:'Comptoir PNJ',relations:[],objectives:[]},reason:'Vendeur narratif PNJ'});
 await f.cc('saveCentralShop',{shopId:'counter',shopRevision:0,draftRevision:revision++,shop:{name:'Dispensaire',description:'Fournitures de terrain',sellerCharacterId:'merchant',locationTargetId:'scene',gmNotes:'SECRET_SHOP'},reason:'Comptoir préparé'});
 await f.cc('saveCentralOffer',{offerId:'supply',offerRevision:0,draftRevision:revision++,offer:{name:'Trousse de soin',shopId:'counter',itemId:'kit_medical-supplies',unitPrice:30,buybackPrice:null,conditions:'Retrait au comptoir',gmNotes:'SECRET_OFFER'},reason:'Offre préparée'});
 const read=f.actionRead,cmd=f.actionCmd;
 const provisionInput=(patch={})=>({shopId:'counter',offerId:'supply',provisionId:randomUUID(),quantity:stock,restricted,source:'Dotation de scénario autorisée : réserve du dispensaire',reason:'Stock physique préparé',...patch});
 const provision=async(patch={},actor=f.owner)=>{const input=provisionInput(patch),p=await read('prepareShopProvision',input,actor);return cmd('provisionShop',{...input,confirmation:p.confirmation},actor);};
 const purchaseInput=(patch={})=>({shopId:'counter',offerId:'supply',quantity:1,useProtected:true,...patch});
 const quote=(patch={},actor=f.player)=>read('prepareShopPurchase',purchaseInput(patch),actor);
 const buy=async(patch={},actor=f.player)=>{const input=purchaseInput(patch),p=await read('prepareShopPurchase',input,actor);return cmd('buyShopOffer',{...input,quoteAt:p.quoteAt,confirmation:p.confirmation},actor);};
 const orders=async(actor=f.player)=>(await read(actor===f.owner?'shopAdmin':'shops',{},actor)).orders;
 const pickup=async(sale,actor=f.player)=>{const p=(await orders(f.owner)).find(p=>p.id===sale.id);await cmd('offerShopPickup',{saleId:p.id,confirmation:p.confirmation},f.owner);const q=(await orders(actor)).find(p=>p.id===sale.id);return cmd('confirmShopPickup',{saleId:q.id,confirmation:q.confirmation,received:true},actor);};
 if(release){const p=await f.releasePreview();assert.deepEqual(p.blockers,[]);await f.release(p);await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});if(stock)await provision({provisionId:'initial'});await f.stage('EN_JEU');}
 const cid=release?(await read('mySession')).character.id:null;
 const wallet=()=>f.store.get(`sessions/${f.sid}/accounts/${accountId(cid)}`),till=()=>f.store.get(`sessions/${f.sid}/accounts/${shopAccountId('counter')}`),remaining=()=>f.store.get(`sessions/${f.sid}/inventory/${shopStockId('supply')}`);
 return {...f,cid,provisionInput,provision,purchaseInput,quote,buy,orders,pickup,wallet,till,remaining};
}
export function spaceOutlawsShopsSuite(makeStore,prefix='Boutiques SPACE OUTLAWS'){
 test(`${prefix} : publication sans stock, activation sans fonds et provision MJ distincte`,async()=>{
  const f=await shopsFixture(makeStore,{stock:0});assert.equal(await f.till(),null);assert.equal(await f.remaining(),null);assert.equal((await f.actionRead('shops')).shops[0].offers[0].stock,0);await assert.rejects(f.buy(),{code:'INSUFFICIENT_STOCK'});
  await f.provision({quantity:4});assert.equal((await f.till()).balance,0);assert.equal((await f.remaining()).quantity,4);assert.equal((await f.wallet()).protectedCredits,200);assert.equal(await f.store.get(`sessions/${f.sid}/characters/merchant`),null);
  const d=await f.actionRead('shops');assert.doesNotMatch(JSON.stringify(d),/SECRET_|gmNotes|playerSecrets|biography|actorUid|Dotation de scénario/);await assert.rejects(f.actionRead('shopAdmin'),{code:'FORBIDDEN'});
 });
 test(`${prefix} : débit protégé, caisse créditée, lot à retirer puis soin avec stock acheté`,async()=>{
  const f=await shopsFixture(makeStore);const p=await f.quote();assert.equal(p.protectedAmount,30);assert.equal(p.ordinaryAmount,0);assert.equal(p.after.protectedCredits,170);
  const sale=await f.buy();assert.equal((await f.wallet()).protectedCredits,170);assert.equal((await f.till()).balance,30);assert.equal((await f.remaining()).quantity,3);
  let bag=await f.actionRead('myInventory');assert.equal(bag.ownedElsewhere.length,1);assert.ok(!bag.lots.some(l=>l.id===sale.purchasedLotId));await f.pickup(sale);bag=await f.actionRead('myInventory');const lot=bag.lots.find(l=>l.id===sale.purchasedLotId);assert.equal(lot.transferable,false);assert.equal(lot.resellable,false);assert.equal(lot.pillable,false);
  const d=await f.actionRead('prepareDamage',{amount:1,damageKind:'ORDINARY',counted:true});await f.actionCmd('applyDamage',{amount:1,damageKind:'ORDINARY',counted:true,reportedAt:d.reportedAt,confirmation:d.confirmation});
  const input={profileId:'SO-MED-02',targetId:f.cid,supplyLots:{'kit_medical-supplies':lot.id}},c=await f.actionRead('preparePersonAction',input);const a=await f.actionCmd('startPersonAction',{...input,present:true,confirmation:c.confirmation});f.advance(105000);await f.actionCmd('finishPersonAction',{actionId:a.id,present:true});assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,0);assert.equal((await f.points()).available,4);
  const w=await f.actionRead('myWallet'),entry=w.entries.find(e=>e.saleId===sale.id);assert.equal(entry.protectedDelta,-30);assert.equal(entry.delta,0);assert.equal(entry.counterparty.name,'Dispensaire');
 });
 test(`${prefix} : réessai de paiement et retrait sans double débit ni double lot`,async()=>{
  const f=await shopsFixture(makeStore),p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation,requestId:randomUUID()},a=await f.actionCmd('buyShopOffer',input);assert.deepEqual(await f.actionCmd('buyShopOffer',input),a);assert.equal((await f.remaining()).quantity,3);assert.equal((await f.till()).balance,30);
  const o=(await f.orders(f.owner))[0];await f.actionCmd('offerShopPickup',{saleId:a.id,confirmation:o.confirmation},f.owner);const q=(await f.orders())[0],pickup={saleId:a.id,confirmation:q.confirmation,received:true,requestId:randomUUID()},r=await f.actionCmd('confirmShopPickup',pickup);assert.deepEqual(await f.actionCmd('confirmShopPickup',pickup),r);assert.equal((await f.wallet()).protectedCredits,170);
 });
 test(`${prefix} : identifiant d’approvisionnement stable et restrictions immuables`,async()=>{
  const f=await shopsFixture(makeStore,{stock:0}),input=f.provisionInput({quantity:3}),p=await f.actionRead('prepareShopProvision',input,f.owner),r=await f.actionCmd('provisionShop',{...input,confirmation:p.confirmation},f.owner);assert.deepEqual(await f.actionCmd('provisionShop',{...input,confirmation:p.confirmation},f.owner),r);assert.equal((await f.remaining()).quantity,3);
  await assert.rejects(f.provision({...input,quantity:4}),{code:'SHOP_PROVISION_REUSED'});await assert.rejects(f.provision({quantity:1,restricted:false}),{code:'SHOP_RESTRICTIONS_LOCKED'});
 });
 test(`${prefix} : dernier stock concurrent, un seul achat et conservation comptable`,async()=>{
  const f=await shopsFixture(makeStore,{stock:1}),p=await f.quote(),q=await f.quote({},f.other),results=await Promise.allSettled([f.actionCmd('buyShopOffer',{...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation}),f.actionCmd('buyShopOffer',{...f.purchaseInput(),quoteAt:q.quoteAt,confirmation:q.confirmation},f.other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.remaining()).quantity,0);assert.equal((await f.till()).balance,30);assert.equal((await f.store.list(`sessions/${f.sid}/lotSales`)).length,1);await f.provision({quantity:2});assert.equal((await f.remaining()).quantity,2);
 });
 test(`${prefix} : fonds protégés refusés sur lot transmissible, solde ordinaire distinct`,async()=>{
  const f=await shopsFixture(makeStore,{restricted:false});await assert.rejects(f.quote(),{code:'SO_PROTECTED_PURCHASE'});await assert.rejects(f.buy({useProtected:false}),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.wallet()).protectedCredits,200);
  await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${f.sid}/accounts/${accountId(f.cid)}`);tx.set(`sessions/${f.sid}/accounts/${a.id}`,{...a,balance:50,revision:a.revision+1});});
  const sale=await f.buy({useProtected:false});await f.pickup(sale);assert.equal((await f.wallet()).balance,20);assert.equal((await f.wallet()).protectedCredits,200);assert.equal((await f.actionRead('myInventory')).lots.find(l=>l.id===sale.purchasedLotId).transferable,true);
 });
 test(`${prefix} : paiement mixte explicite, fonds ordinaires réservés indisponibles`,async()=>{
  const f=await shopsFixture(makeStore,{stock:10});await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${f.sid}/accounts/${accountId(f.cid)}`);tx.set(`sessions/${f.sid}/accounts/${a.id}`,{...a,balance:50,reserved:20,revision:a.revision+1});});
  await assert.rejects(f.quote({quantity:8}),{code:'INSUFFICIENT_FUNDS'});const p=await f.quote({quantity:7});assert.equal(p.protectedAmount,200);assert.equal(p.ordinaryAmount,10);await f.buy({quantity:7});assert.equal((await f.wallet()).balance,40);assert.equal((await f.wallet()).protectedCredits,0);assert.equal((await f.till()).balance,210);
 });
 test(`${prefix} : devis périmé, stock et portefeuille modifiés exigent un nouvel accord`,async()=>{
  const f=await shopsFixture(makeStore),p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation};f.advance(300001);await assert.rejects(f.actionCmd('buyShopOffer',input),{code:'SHOP_QUOTE_EXPIRED'});const q=await f.quote();await f.provision({quantity:1});await assert.rejects(f.actionCmd('buyShopOffer',{...input,quoteAt:q.quoteAt,confirmation:q.confirmation}),{code:'STALE_REVISION'});assert.equal((await f.wallet()).protectedCredits,200);
 });
 test(`${prefix} : réception et joueurs sans autorité sur stock, révocation avant réessai MJ`,async()=>{
  const f=await shopsFixture(makeStore);await f.role(true,'RECEPTION');for(const actor of [f.player,f.mj])await assert.rejects(f.provision({quantity:1},actor),{code:'FORBIDDEN'});await f.role();const input=f.provisionInput({quantity:1}),p=await f.actionRead('prepareShopProvision',input,f.mj),request={...input,confirmation:p.confirmation,requestId:randomUUID()};await f.actionCmd('provisionShop',request,f.mj);const s=await f.actionRead('session',{},f.owner);await f.actionCmd('setStaff',{email:f.mj.email,role:'MJ',active:false,revision:s.revision,reason:'Révocation'},f.owner);await assert.rejects(f.actionCmd('provisionShop',request,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : achat révoqué et retrait non proposé ou non reçu bloqués`,async()=>{
  const f=await shopsFixture(makeStore),p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation,requestId:randomUUID()},sale=await f.actionCmd('buyShopOffer',input),o=(await f.orders())[0];await assert.rejects(f.actionCmd('confirmShopPickup',{saleId:sale.id,confirmation:o.confirmation,received:true}),{code:'STALE_PICKUP'});await assert.rejects(f.actionCmd('offerShopPickup',{saleId:sale.id,confirmation:o.confirmation}),{code:'FORBIDDEN'});await f.actionCmd('offerShopPickup',{saleId:sale.id,confirmation:o.confirmation},f.owner);const q=(await f.orders())[0];await assert.rejects(f.actionCmd('confirmShopPickup',{saleId:sale.id,confirmation:q.confirmation,received:false}),{code:'HANDOVER_REQUIRED'});await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.actionCmd('buyShopOffer',input),{code:'FORBIDDEN'});assert.equal((await f.orders(f.owner))[0].canOfferPickup,false);
 });
 test(`${prefix} : pause, STOP et hors combat empêchent les achats`,async()=>{
  const f=await shopsFixture(makeStore);await f.stage('PAUSE');await assert.rejects(f.buy(),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.actionCmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.buy(),{code:'SO_SAFETY_STOP'});const s=await f.actionRead('session',{},f.owner);await f.actionCmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);const p=await f.actionRead('prepareDamage',{amount:3,damageKind:'ORDINARY',counted:true,secondsSinceDown:0});await f.actionCmd('applyDamage',{amount:3,damageKind:'ORDINARY',counted:true,secondsSinceDown:0,reportedAt:p.reportedAt,confirmation:p.confirmation});await assert.rejects(f.buy(),{code:'OUT_OF_COMBAT'});
 });
 test(`${prefix} : paiement joueur limité aux crédits ordinaires, aucun accès à la caisse PNJ`,async()=>{
  const f=await shopsFixture(makeStore),other=(await f.actionRead('mySession',{},f.other)).character.id;await assert.rejects(f.actionRead('preparePayment',{recipientId:other,amount:1,memo:'Don'}),{code:'INSUFFICIENT_FUNDS'});await assert.rejects(f.actionRead('readAccount',{accountId:shopAccountId('counter')}),{code:'FORBIDDEN'});
  await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${f.sid}/accounts/${accountId(f.cid)}`);tx.set(`sessions/${f.sid}/accounts/${a.id}`,{...a,balance:10,revision:a.revision+1});});const input={recipientId:other,amount:7,memo:'Partage du gain'},p=await f.actionRead('preparePayment',input);await f.actionCmd('payCredits',{...input,confirmation:p.confirmation});assert.equal((await f.wallet()).balance,3);assert.equal((await f.wallet()).protectedCredits,200);assert.equal((await f.store.get(`sessions/${f.sid}/accounts/${accountId(other)}`)).balance,7);
 });
 test(`${prefix} : échec transactionnel annule débit, vente et transfert de stock`,async()=>{
  const raw=makeStore();let fail=false;const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};const f=await shopsFixture(()=>wrapped),p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation};fail=true;await assert.rejects(f.actionCmd('buyShopOffer',input),/INTERRUPTION/);fail=false;assert.equal((await f.wallet()).protectedCredits,200);assert.equal((await f.remaining()).quantity,4);assert.equal((await f.till()).balance,0);assert.deepEqual(await f.store.list(`sessions/${f.sid}/lotSales`),[]);await f.buy();
 });
 test(`${prefix} : naissance suivante conserve les stocks approvisionnés pendant le briefing`,async()=>{
  const f=await shopsFixture(makeStore,{release:false});await f.release(await f.releasePreview());await f.birth(await f.birthPreview());await f.provision({quantity:3});const before=await f.remaining(),till=await f.till();await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});assert.deepEqual(await f.remaining(),before);assert.deepEqual(await f.till(),till);assert.equal((await f.actionRead('shops')).shops.length,1);
 });
 test(`${prefix} : voies historiques ne vendent ni ne transfèrent les lots protégés`,async()=>{
  const f=await shopsFixture(makeStore),sale=await f.buy();await f.pickup(sale);const other=(await f.actionRead('mySession',{},f.other)).character.id;
  for(const lotId of [sale.purchasedLotId,(await f.actionRead('myInventory')).lots.find(l=>l.item.id==='kit_communicator').id]){
   const transfer={lotId,recipientId:other,quantity:1},p=await f.actionRead('prepareLotTransfer',transfer);await assert.rejects(f.actionCmd('proposeLotTransfer',{...transfer,confirmation:p.confirmation}),{code:'SO_GAMEPLAY_NOT_OPEN'});
   const offer={lotId,buyerId:other,quantity:1,amount:10,minutes:10,pickupPlace:'Port',conditions:'Tentative'},q=await f.actionRead('prepareLotSale',offer);await assert.rejects(f.actionCmd('proposeLotSale',{...offer,confirmation:q.confirmation}),{code:'SO_GAMEPLAY_NOT_OPEN'});
  }
  assert.equal((await f.wallet()).protectedCredits,170);assert.equal((await f.remaining()).quantity,3);
 });
 test(`${prefix} : version historique sans boutiques jamais enrichie implicitement`,async()=>{
  const f=await shopsFixture(makeStore,{release:false}),release=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${release.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {maintenancePnjVersion,shopsVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());assert.deepEqual(await f.store.list(`sessions/${f.sid}/shops`),[]);await assert.rejects(f.actionRead('shops'),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : pas de publication d’un comptoir joueur ou d’un rachat non raccordé`,async()=>{
  const f=await shopsFixture(makeStore,{release:false}),d=await f.view();await f.cc('saveCentralOffer',{offerId:'supply',offerRevision:1,draftRevision:d.draft.revision,offer:{name:'Rachat',shopId:'counter',itemId:'kit_medical-supplies',unitPrice:30,buybackPrice:15,conditions:'',gmNotes:''},reason:'Test'});const p=await f.releasePreview();assert.ok(p.blockers.some(b=>b.code==='SO_SHOP_NOT_CONNECTED'));await assert.rejects(f.release(p),{code:'SO_RELEASE_BLOCKED'});
 });
}
