import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {shopsFixture} from './space-outlaws-shops-suite.mjs';
import {moduleItem} from './space-ship-module-catalog-suite.mjs';
import {standardShipModuleQuote} from '../../src/shared/space-ship-modules.mjs';
import {shopStockId,shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function modulePurchaseFixture(makeStore,{release=true,stock=true,code='MOD-01',size=2}={}){
 const f=await shopsFixture(makeStore,{release:false}),read=f.actionRead,cmd=f.actionCmd,calibration={code,size},price=standardShipModuleQuote(calibration).price;
 let revision=(await f.view()).draft.revision;
 const item={...moduleItem,shipModule:calibration};
 const offer={name:'Module calibré',shopId:'counter',itemId:'module',unitPrice:price,buybackPrice:null,conditions:'Remise du module non monté',gmNotes:'SECRET_MODULE_OFFER'};
 await f.cc('saveCentralItem',{itemId:'module',itemRevision:0,draftRevision:revision++,item,reason:'Module standard'});
 await f.cc('saveCentralOffer',{offerId:'module-offer',offerRevision:0,draftRevision:revision++,offer,reason:'Tarif canonique'});
 const edit=(path,change)=>f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}${path?'/'+path:''}`,v=await tx.get(p);tx.set(p,change(v));});
 const provisionInput=(patch={})=>({shopId:'counter',offerId:'module-offer',provisionId:randomUUID(),quantity:1,restricted:false,source:'Exemplaire physique préparé par le scénario',reason:'Approvisionnement module',...patch});
 const provision=async(patch={},actor=f.owner)=>{const input=provisionInput(patch),p=await read('prepareShopProvision',input,actor);return cmd('provisionShop',{...input,confirmation:p.confirmation},actor);};
 const purchaseInput=(patch={})=>({shopId:'counter',offerId:'module-offer',quantity:1,useProtected:false,...patch});
 const quote=(patch={},actor=f.player)=>read('prepareShopPurchase',purchaseInput(patch),actor);
 const buy=async(patch={},actor=f.player)=>{const input=purchaseInput(patch),p=await quote(patch,actor);return cmd('buyShopOffer',{...input,quoteAt:p.quoteAt,confirmation:p.confirmation},actor);};
 let cid,otherId;
 if(release){assert.deepEqual((await f.releasePreview()).blockers,[]);await f.release(await f.releasePreview());await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});
  cid=(await read('mySession')).character.id;otherId=(await read('mySession',{},f.other)).character.id;
  // Ordinary balances are fixture setup only; no gameplay grant is introduced.
  for(const id of [cid,otherId])await edit(`accounts/${accountId(id)}`,a=>({...a,balance:10000,revision:a.revision+1}));
  if(stock)await provision();await f.stage('EN_JEU');
 }
 return {...f,read,cmd,edit,item,offer,price,calibration,cid,otherId,provisionInput,provision,purchaseInput,quote,buy,
  wallet:()=>f.store.get(`sessions/${f.sid}/accounts/${accountId(cid)}`),moduleStock:()=>f.store.get(`sessions/${f.sid}/inventory/${shopStockId('module-offer')}`)};
}
export function modulePurchasesSuite(makeStore,prefix='Achats modules SO'){
 test(`${prefix} : publication sans stock ni attribution, nouveau marqueur et naissance suivante sans duplication`,async()=>{
  const f=await modulePurchaseFixture(makeStore,{release:false});await f.release(await f.releasePreview());await f.birth(await f.birthPreview());
  const s=await f.store.get(`sessions/${f.sid}`);assert.equal(s.spaceOutlaws.modulePurchasesVersion,1);assert.equal(s.spaceOutlaws.shipModulesVersion,undefined);
  assert.equal(await f.moduleStock(),null);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ships`),[]);assert.ok((await f.store.list(`sessions/${f.sid}/inventory`)).every(l=>!l.item.shipModule));
  await f.provision();const stock=await f.moduleStock();await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});assert.deepEqual(await f.moduleStock(),stock);
 });
 test(`${prefix} : paiement ordinaire, double remise et même lot calibré sans PA ni effet spatial`,async()=>{
  const f=await modulePurchaseFixture(makeStore),points=await f.points(),before=await f.wallet(),p=await f.quote();
  assert.equal(p.amount,1500);assert.equal(p.protectedAmount,0);assert.equal(p.ordinaryAmount,1500);assert.equal(p.restricted,false);
  const sale=await f.buy();assert.equal((await f.wallet()).balance,before.balance-1500);assert.equal((await f.wallet()).protectedCredits,200);
  const till=await f.store.get(`sessions/${f.sid}/accounts/${shopAccountId('counter')}`);assert.equal(till.balance,1500);assert.equal((await f.moduleStock()).quantity,0);
  let lot=await f.store.get(`sessions/${f.sid}/inventory/${sale.purchasedLotId}`);assert.equal(lot.ownerId,f.cid);assert.equal(lot.holderId,'counter');assert.deepEqual(lot.item.shipModule,f.calibration);
  assert.ok(!(await f.read('myInventory')).lots.some(l=>l.id===lot.id));await f.pickup(sale);
  lot=(await f.read('myInventory')).lots.find(l=>l.id===sale.purchasedLotId);assert.equal(lot.holderId,f.cid);assert.equal(lot.transferable,true);assert.equal(lot.resellable,true);assert.equal(lot.item.consumable,false);assert.deepEqual(lot.item.shipModule,f.calibration);
  assert.deepEqual(await f.points(),points);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ships`),[]);assert.deepEqual(await f.store.list(`sessions/${f.sid}/shipMaintenance`),[]);
  const ledger=await f.store.list(`sessions/${f.sid}/ledger`);assert.equal(ledger.filter(e=>e.saleId===sale.id).length,1);assert.ok(ledger.filter(e=>e.saleId===sale.id).every(e=>e.createdCurrency===0&&e.removedCurrency===0));
 });
 test(`${prefix} : stocks protégés, quantités multiples et crédits de création refusés`,async()=>{
  const f=await modulePurchaseFixture(makeStore,{stock:false});await assert.rejects(f.provision({restricted:true}),{code:'SO_MODULE_STOCK_RESTRICTED'});await assert.rejects(f.provision({quantity:2}),{code:'INVALID_QUANTITY'});assert.equal(await f.moduleStock(),null);
  await f.provision();await assert.rejects(f.quote({useProtected:true}),{code:'SO_PROTECTED_PURCHASE'});await assert.rejects(f.quote({quantity:2}),{code:'INVALID_QUANTITY'});
  await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:0,revision:a.revision+1}));await assert.rejects(f.buy(),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.wallet()).protectedCredits,200);assert.equal((await f.moduleStock()).quantity,1);
 });
 test(`${prefix} : dernier exemplaire concurrent, une vente et conservation des crédits`,async()=>{
  const f=await modulePurchaseFixture(makeStore),a=await f.quote(),b=await f.quote({},f.other);
  const results=await Promise.allSettled([f.cmd('buyShopOffer',{...f.purchaseInput(),quoteAt:a.quoteAt,confirmation:a.confirmation}),f.cmd('buyShopOffer',{...f.purchaseInput(),quoteAt:b.quoteAt,confirmation:b.confirmation},f.other)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.moduleStock()).quantity,0);assert.equal((await f.store.list(`sessions/${f.sid}/lotSales`)).length,1);
  const accounts=await f.store.list(`sessions/${f.sid}/accounts`);assert.equal(accounts.reduce((n,a)=>n+a.balance,0),20000);assert.equal(accounts.reduce((n,a)=>n+(a.protectedCredits??0),0),400);
 });
 test(`${prefix} : paiement et réception réessayés une seule fois, réapprovisionnement distinct`,async()=>{
  const f=await modulePurchaseFixture(makeStore),p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation,requestId:randomUUID()},sale=await f.cmd('buyShopOffer',input);
  assert.deepEqual(await f.cmd('buyShopOffer',input),sale);await f.pickup(sale);await f.provision();const second=await f.buy();assert.notEqual(second.purchasedLotId,sale.purchasedLotId);assert.equal((await f.wallet()).balance,7000);
  const stock=await f.moduleStock();assert.equal(stock.quantity,0);assert.deepEqual(stock.item.shipModule,f.calibration);assert.equal((await f.store.list(`sessions/${f.sid}/lotSales`)).length,2);
 });
 test(`${prefix} : tarif canonique revérifié et calibration du stock cohérente`,async()=>{
  const f=await modulePurchaseFixture(makeStore),p=await f.quote();await f.edit('shops/counter/offers/module-offer',o=>({...o,unitPrice:1}));
  await assert.rejects(f.cmd('buyShopOffer',{...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation}),{code:'INVALID_SHIP_MODULE_OFFER'});
  await f.edit('shops/counter/offers/module-offer',o=>({...o,unitPrice:f.price}));await f.edit(`inventory/${shopStockId('module-offer')}`,l=>({...l,item:{...l.item,shipModule:{code:'MOD-01',size:1}}}));
  await assert.rejects(f.buy(),{code:'INSUFFICIENT_STOCK'});assert.equal((await f.wallet()).balance,10000);assert.deepEqual(await f.store.list(`sessions/${f.sid}/lotSales`),[]);
 });
 test(`${prefix} : ancien marqueur absent bloque les effets et les anciens reçus sans enrichissement`,async()=>{
  const f=await modulePurchaseFixture(makeStore),p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation,requestId:randomUUID()},sale=await f.cmd('buyShopOffer',input);
  await f.edit('',s=>{const {modulePurchasesVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});
  await assert.rejects(f.cmd('buyShopOffer',input),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.provision(),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.cmd('offerShopPickup',{saleId:sale.id,confirmation:'old'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});
  assert.ok((await f.read('shops')).shops[0].offers.every(o=>!o.item.shipModule));assert.equal((await f.store.get(`sessions/${f.sid}`)).spaceOutlaws.modulePurchasesVersion,undefined);
 });
 test(`${prefix} : publication refuse prix réduit, rachat et module dans le kit initial`,async()=>{
  const f=await modulePurchaseFixture(makeStore,{release:false});
  for(const patch of [{unitPrice:1},{buybackPrice:100}]){const d=await f.central('centralMaster',{workshop:'M5'}),old=d.changes.find(c=>c.type==='offer'&&c.entityId==='module-offer');await f.cc('saveCentralOffer',{offerId:'module-offer',offerRevision:old.data.revision,draftRevision:d.draft.revision,offer:{...f.offer,...patch},reason:'Offre incohérente'});const p=await f.releasePreview();assert.ok(p.blockers.some(b=>b.code==='SO_SHOP_NOT_CONNECTED'));await assert.rejects(f.release(p),{code:'SO_RELEASE_BLOCKED'});}
  let d=await f.central('centralMaster',{workshop:'M5'}),old=d.changes.find(c=>c.type==='offer'&&c.entityId==='module-offer');await f.cc('saveCentralOffer',{offerId:'module-offer',offerRevision:old.data.revision,draftRevision:d.draft.revision,offer:f.offer,reason:'Corriger le prix'});
  d=await f.central('centralMaster',{workshop:'M1'});const kit=d.changes.find(c=>c.type==='classKit');await f.cc('saveCentralClassKit',{classKitId:kit.entityId,classKitRevision:kit.data.revision,draftRevision:d.draft.revision,classKit:{bindings:kit.data.bindings.map((b,i)=>i===0?{...b,itemId:'module'}:b),gmNotes:''},reason:'Substitution interdite'});
  assert.ok((await f.releasePreview()).blockers.some(b=>b.code==='SO_MODULE_INITIAL_KIT'));assert.deepEqual(await f.store.list(`sessions/${f.sid}/inventory`),[]);
 });
 test(`${prefix} : pause, STOP et révocation bloquent l’achat ou son ancien reçu`,async()=>{
  const f=await modulePurchaseFixture(makeStore);await f.stage('PAUSE');await assert.rejects(f.buy(),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.buy(),{code:'SO_SAFETY_STOP'});
  const s=await f.read('session',{},f.owner);await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);const p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation,requestId:randomUUID()};await f.cmd('buyShopOffer',input);
  await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('buyShopOffer',input),{code:'FORBIDDEN'});
 });
 test(`${prefix} : interruption annule solde, caisse, exemplaire et reçu ensemble`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail)throw Error('INTERRUPTION');return result;})};
  const f=await modulePurchaseFixture(()=>store),p=await f.quote(),input={...f.purchaseInput(),quoteAt:p.quoteAt,confirmation:p.confirmation,requestId:randomUUID()},ledger=await f.store.list(`sessions/${f.sid}/ledger`);fail=true;await assert.rejects(f.cmd('buyShopOffer',input),/INTERRUPTION/);fail=false;
  assert.equal((await f.wallet()).balance,10000);assert.equal((await f.moduleStock()).quantity,1);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ledger`),ledger);assert.deepEqual(await f.store.list(`sessions/${f.sid}/lotSales`),[]);await f.cmd('buyShopOffer',input);
 });
 test(`${prefix} : module reçu et compte ordinaire traversent la reprise sans nouvelle attribution`,async()=>{
  const f=await modulePurchaseFixture(makeStore),sale=await f.buy();await f.pickup(sale);const e=await episodeHarness(f),lot=await e.get(`inventory/${sale.purchasedLotId}`),wallet=await f.wallet();
  await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get(`inventory/${lot.id}`),lot);assert.equal((await e.get('')).spaceOutlaws.modulePurchasesVersion,1);assert.equal((await e.get(`accounts/${accountId(f.cid)}`)).balance,wallet.balance+wallet.protectedCredits);
 });
 test(`${prefix} : ancien manifeste sans extension conserve sa naissance et ses consommables`,async()=>{
  const f=await shopsFixture(makeStore,{release:false}),out=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${out.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {moduleWorkVersion,moduleMandatesVersion,modulePurchasesVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});
  await f.birth(await f.birthPreview());assert.equal((await f.store.get(`sessions/${f.sid}`)).spaceOutlaws.modulePurchasesVersion,undefined);assert.equal((await f.actionRead('shops')).shops.length,1);
 });
}
