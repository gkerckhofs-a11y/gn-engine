import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {shopsFixture} from './space-outlaws-shops-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';

export async function classifyMaster(f,usage='PERSONAL',patch={}){
 let d=await f.central('centralMaster',{workshop:'M1'}),revision=d.draft.revision;
 for(const c of d.changes.filter(c=>c.type==='item'&&c.operation==='UPSERT')){
  const v=c.data,item=Object.fromEntries(['name','description','category','unit','kind','consumable','unitVolume','legality','pillable','gmNotes','laserRecharge','shipModule'].filter(k=>v[k]!==undefined).map(k=>[k,v[k]]));
  await f.cc('saveCentralItem',{itemId:c.entityId,itemRevision:v.revision,draftRevision:revision++,item:{...item,usage:c.entityId==='propellant'?'FUEL':c.entityId==='kit_medical-supplies'?usage:'PERSONAL',...(c.entityId==='kit_medical-supplies'?patch:{})},reason:'Classification explicite de la fixture'});
 }
}
export async function circuitsFixture(makeStore,{usage='PERSONAL',classId='MED',restricted=false,...patch}={}){
 const f=await shopsFixture(makeStore,{release:false,classId,createSupply:classId!=='MED',restricted});
 await classifyMaster(f,usage,patch);assert.deepEqual((await f.releasePreview()).blockers,[]);
 await f.release(await f.releasePreview());await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});
 if(usage==='COMMERCIAL')await f.store.runTransaction(async tx=>{const s=await tx.get(`sessions/${f.sid}`);tx.set(`sessions/${f.sid}`,{...s,transportRules:{homePort:'home'}});});
 const read=f.actionRead,cmd=f.actionCmd,cid=(await read('mySession')).character.id,otherId=(await read('mySession',{},f.other)).character.id;
 await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${f.sid}/accounts/${accountId(cid)}`),b=await tx.get(`sessions/${f.sid}/accounts/${accountId(otherId)}`);tx.set(`sessions/${f.sid}/accounts/${a.id}`,{...a,balance:1000,revision:a.revision+1});tx.set(`sessions/${f.sid}/accounts/${b.id}`,{...b,balance:1000,revision:b.revision+1});});
 await f.provision({quantity:patch.kind==='INDIVIDUAL'?1:8,restricted});await f.stage('EN_JEU');
 const buy=async(quantity=4)=>{const sale=await f.buy({quantity,useProtected:restricted});return sale;};
 const acquire=async(quantity=4)=>{const sale=await buy(quantity);await f.pickup(sale);return (await f.store.get(`sessions/${f.sid}/inventory/${sale.purchasedLotId}`));};
 return {...f,read,cmd,cid,otherId,buy,acquire};
}
export function itemCircuitsSuite(makeStore,prefix='Circuits explicites'){
 test(`${prefix} : boutique personnelle, propriété et réception sans utilisation anticipée`,async()=>{
  const g=await circuitsFixture(makeStore,{classId:'COM',consumable:false});
  const initial=await g.points(),sale=await g.buy(2),before=await g.read('myInventory');assert.equal(before.session.spaceOutlaws.itemCircuitsVersion,1);assert.ok(!before.lots.some(l=>l.id===sale.purchasedLotId));assert.equal(before.ownedElsewhere.find(l=>l.id===sale.purchasedLotId).quantity,2);
  await g.pickup(sale);const lot=(await g.read('myInventory')).lots.find(l=>l.id===sale.purchasedLotId);assert.equal(lot.canSellPersonal,true);assert.equal(lot.canTransferByHand,true);assert.equal(lot.item.consumable,false);assert.deepEqual(await g.points(),initial);assert.equal((await g.read('myWallet')).account.available,940);assert.equal((await g.read('myWallet')).account.protectedCredits,200);
 });
 test(`${prefix} : don partiel, acceptation et conservation de provenance`,async()=>{
  const f=await circuitsFixture(makeStore),lot=await f.acquire(),input={lotId:lot.id,recipientId:f.otherId,quantity:2},q=await f.read('prepareLotTransfer',input),out=await f.cmd('proposeLotTransfer',{...input,confirmation:q.confirmation}),p=await f.read('lotTransferDetail',{transferId:out.id},f.other);
  await f.cmd('acceptLotTransfer',{transferId:out.id,confirmation:p.confirmation,received:true},f.other);
  const all=(await f.store.list(`sessions/${f.sid}/inventory`)).filter(l=>l.id===lot.id||l.origin?.parentLotId===lot.id);assert.equal(all.reduce((n,l)=>n+l.quantity,0),4);assert.equal(all.find(l=>l.ownerId===f.otherId).item.usage,'PERSONAL');assert.equal((await f.read('myWallet')).account.available,880);
 });
 test(`${prefix} : revente partielle, fonds ordinaires et retrait natif idempotent`,async()=>{
  const f=await circuitsFixture(makeStore),lot=await f.acquire(),input={lotId:lot.id,buyerId:f.otherId,quantity:2,amount:50,minutes:10,pickupPlace:'Comptoir',conditions:'Remise réelle'},q=await f.read('prepareLotSale',input),out=await f.cmd('proposeLotSale',{...input,confirmation:q.confirmation});
  const purchase={saleId:out.id,fromAccountId:accountId(f.otherId)},p=await f.read('prepareLotPurchase',purchase,f.other),pay={...purchase,confirmation:p.confirmation,requestId:randomUUID()},r=await f.cmd('buyLot',pay,f.other);assert.deepEqual(await f.cmd('buyLot',pay,f.other),r);
  assert.equal((await f.read('myWallet',{},f.other)).account.available,950);assert.equal((await f.read('myWallet',{},f.other)).account.protectedCredits,200);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${r.purchasedLotId}`)).holderId,f.cid);
  let detail=await f.read('lotSaleDetail',{saleId:out.id});await f.cmd('offerSalePickup',{saleId:out.id,confirmation:detail.pickupConfirmation});detail=await f.read('lotSaleDetail',{saleId:out.id},f.other);
  const receipt={saleId:out.id,confirmation:detail.pickupConfirmation,received:true,requestId:randomUUID()},received=await f.cmd('confirmSalePickup',receipt,f.other);assert.deepEqual(await f.cmd('confirmSalePickup',receipt,f.other),received);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${r.purchasedLotId}`)).location.kind,'CHARACTER');
  const history=await f.read('myLotHistory',{lotId:r.purchasedLotId},f.other);assert.ok(history.events.length);assert.doesNotMatch(JSON.stringify(history),/actorUid|reason|SECRET|origin/);
 });
 test(`${prefix} : restrictions modèle, lot protégé et refus du carburant comme fret`,async()=>{
  for(const patch of [{transferable:false},{resellable:false},{restricted:true}]){
   const f=await circuitsFixture(makeStore,patch),lot=await f.acquire(),input={lotId:lot.id,buyerId:f.otherId,quantity:1,amount:10,minutes:10,pickupPlace:'Port',conditions:'Test'};await assert.rejects(f.read('prepareLotSale',input),{code:'SO_PERSONAL_TRANSFER_RESTRICTED'});
   const bag=await f.read('myInventory');assert.equal(bag.lots.find(l=>l.id===lot.id).canSellPersonal,false);
  }
 });
 test(`${prefix} : marchandise réservée au Courtier principal et stock distinct`,async()=>{
  const f=await circuitsFixture(makeStore,{usage:'COMMERCIAL',classId:'COU'}),sale=await f.buy(3);await f.pickup(sale);
  const bag=await f.read('myInventory');assert.ok(!bag.lots.some(l=>l.id===sale.purchasedLotId));assert.equal(bag.commercial.find(l=>l.id===sale.purchasedLotId).quantity,3);await assert.rejects(f.read('prepareLotTransfer',{lotId:sale.purchasedLotId,recipientId:f.otherId,quantity:1}));
  const ordinary=await circuitsFixture(makeStore,{usage:'COMMERCIAL'});await assert.rejects(ordinary.read('prepareShopPurchase',ordinary.purchaseInput({quantity:1,useProtected:false})),{code:'FORBIDDEN'});await assert.rejects(ordinary.read('market'),{code:'FORBIDDEN'});
  const input={lotId:sale.purchasedLotId,quantity:2,amount:100,minutes:10,pickupPlace:'Port',conditions:'Retrait commercial'},q=await f.read('prepareMarketListing',input);await f.cmd('publishMarketListing',{...input,confirmation:q.confirmation});const market=await f.read('market');assert.equal(market.listings.length,1);assert.doesNotMatch(JSON.stringify(market.stock),/origin|createdAt|actorUid|SECRET/);
 });
 test(`${prefix} : voucher natif, plein partiel, annulation et conservation totale`,async()=>{
  const f=await soVoyagesFixture(makeStore,{restrictedFuel:false,prepareExtra:async f=>classifyMaster(f)}),lot=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant');assert.equal(lot.item.usage,'FUEL');assert.equal((await f.ship()).fuel,0);
  await f.refuel(3);assert.equal((await f.ship()).fuel,3);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,37);
  const input={shipId:'ship',lotId:lot.id,quantity:2},p=await f.read('prepareRefuel',input);await f.cmd('refuelShip',{...input,confirmation:p.confirmation,present:true});await f.cmd('cancelSoNavigation',{shipId:'ship',confirmation:(await f.navigation()).confirmation,reason:'Interruption physique'});assert.equal((await f.ship()).fuel,3);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,37);
  assert.equal((await f.ship()).fuel+(await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,40);
  await assert.rejects(f.read('prepareRefuel',{...input,quantity:14}),{code:'TANK_FULL'});await assert.rejects(f.read('prepareRefuel',input,f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : dons refusés ou annulés sans effet et course sur le dernier exemplaire`,async()=>{
  const f=await circuitsFixture(makeStore),lot=await f.acquire(1),input={lotId:lot.id,recipientId:f.otherId,quantity:1};
  for(const action of ['declineLotTransfer','cancelLotTransfer']){const p=await f.read('prepareLotTransfer',input),q=await f.cmd('proposeLotTransfer',{...input,confirmation:p.confirmation}),actor=action==='cancelLotTransfer'?f.player:f.other,d=await f.read('lotTransferDetail',{transferId:q.id},actor);await f.cmd(action,{transferId:q.id,confirmation:d.confirmation},actor);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,1);}
  const propose=async()=>{const p=await f.read('prepareLotTransfer',input);return f.cmd('proposeLotTransfer',{...input,confirmation:p.confirmation});},a=await propose(),b=await propose(),da=await f.read('lotTransferDetail',{transferId:a.id},f.other),db=await f.read('lotTransferDetail',{transferId:b.id},f.other);
  const result=await Promise.allSettled([f.cmd('acceptLotTransfer',{transferId:a.id,confirmation:da.confirmation,received:true},f.other),f.cmd('acceptLotTransfer',{transferId:b.id,confirmation:db.confirmation,received:true},f.other)]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).ownerId,f.otherId);
 });
 test(`${prefix} : ventes concurrentes, fonds protégés exclus, pause et STOP`,async()=>{
  const f=await circuitsFixture(makeStore),lot=await f.acquire(1),input={lotId:lot.id,buyerId:f.otherId,quantity:1,amount:100,minutes:10,pickupPlace:'Port',conditions:'Physique'};
  const propose=async()=>{const p=await f.read('prepareLotSale',input);return f.cmd('proposeLotSale',{...input,confirmation:p.confirmation});},a=await propose(),b=await propose(),source={fromAccountId:accountId(f.otherId)};
  await f.store.runTransaction(async tx=>{const x=await tx.get(`sessions/${f.sid}/accounts/${accountId(f.otherId)}`);tx.set(`sessions/${f.sid}/accounts/${x.id}`,{...x,balance:0,revision:x.revision+1});});await assert.rejects(f.read('prepareLotPurchase',{...source,saleId:a.id},f.other),{code:'INSUFFICIENT_FUNDS'});
  await f.store.runTransaction(async tx=>{const x=await tx.get(`sessions/${f.sid}/accounts/${accountId(f.otherId)}`);tx.set(`sessions/${f.sid}/accounts/${x.id}`,{...x,balance:1000,revision:x.revision+1});});
  const qa=await f.read('prepareLotPurchase',{...source,saleId:a.id},f.other),qb=await f.read('prepareLotPurchase',{...source,saleId:b.id},f.other),out=await Promise.allSettled([f.cmd('buyLot',{...source,saleId:a.id,confirmation:qa.confirmation},f.other),f.cmd('buyLot',{...source,saleId:b.id,confirmation:qb.confirmation},f.other)]);assert.equal(out.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.read('myWallet',{},f.other)).account.available,900);
  await f.stage('PAUSE');await assert.rejects(f.read('prepareLotSale',input),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Test sécurité'});await assert.rejects(f.read('prepareLotSale',input),{code:'SO_SAFETY_STOP'});
 });
 test(`${prefix} : voucher cessible, incompatible refusé et délai figé en pause`,async()=>{
  const f=await soVoyagesFixture(makeStore,{restrictedFuel:false,prepareExtra:async f=>classifyMaster(f)}),lot=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant'),give={lotId:lot.id,recipientId:f.otherId,quantity:5},q=await f.read('prepareLotTransfer',give),proposal=await f.cmd('proposeLotTransfer',{...give,confirmation:q.confirmation}),detail=await f.read('lotTransferDetail',{transferId:proposal.id},f.other);await f.cmd('acceptLotTransfer',{transferId:proposal.id,confirmation:detail.confirmation,received:true},f.other);
  assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,35);const foreign=(await f.read('myInventory',{},f.other)).lots.find(l=>l.item.id==='propellant');assert.equal(foreign.quantity,5);assert.equal(foreign.item.usage,'FUEL');
  const wrong=(await f.read('myInventory')).lots.find(l=>l.item.id!=='propellant');await assert.rejects(f.read('prepareRefuel',{shipId:'ship',lotId:wrong.id,quantity:1}),{code:'INVALID_FUEL'});
  const input={shipId:'ship',lotId:lot.id,quantity:2},p=await f.read('prepareRefuel',input),request={...input,confirmation:p.confirmation,present:true,requestId:randomUUID()};await f.cmd('refuelShip',request);await f.cmd('refuelShip',request);await f.stage('PAUSE');f.advance(3600000);await assert.rejects(f.navCommand('finishSoRefuel'),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await assert.rejects(f.navCommand('finishSoRefuel'),{code:'VOYAGE_NOT_READY'});f.advance(120000);const n=await f.navigation(),finish={shipId:'ship',confirmation:n.confirmation,present:true,requestId:randomUUID()},done=await f.cmd('finishSoRefuel',finish);assert.deepEqual(await f.cmd('finishSoRefuel',finish),done);assert.equal((await f.ship()).fuel,2);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity+foreign.quantity+(await f.ship()).fuel,40);
 });
 test(`${prefix} : lot inconnu conservé mais nouveaux échanges bloqués, historique privé`,async()=>{
  const f=await circuitsFixture(makeStore),lot=await f.acquire();await f.store.runTransaction(async tx=>{const l=await tx.get(`sessions/${f.sid}/inventory/${lot.id}`),{usage,...item}=l.item;tx.set(`sessions/${f.sid}/inventory/${lot.id}`,{...l,item});});const before=await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`),bag=await f.read('myInventory');assert.equal(bag.lots.find(l=>l.id===lot.id).canSellPersonal,false);assert.ok(bag.unclassified.some(l=>l.id===lot.id));await assert.rejects(f.read('prepareLotTransfer',{lotId:lot.id,quantity:1,recipientId:f.otherId}),{code:'SO_PERSONAL_TRANSFER_RESTRICTED'});await assert.rejects(f.read('myLotHistory',{lotId:lot.id},f.other),{code:'FORBIDDEN'});assert.deepEqual(await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`),before);
 });

 test(`${prefix} : vente commerciale entre Courtiers puis retrait en stock commercial`,async()=>{
  const f=await circuitsFixture(makeStore,{usage:'COMMERCIAL',classId:'COU'});await f.store.runTransaction(async tx=>{const s=await tx.get(`sessions/${f.sid}`);tx.set(`sessions/${f.sid}`,{...s,transportRules:{homePort:'home'}});});const lot=await f.acquire(2),input={lotId:lot.id,quantity:1,amount:50,minutes:10,pickupPlace:'Port',conditions:'Retrait du fret'},q=await f.read('prepareMarketListing',input),p=await f.cmd('publishMarketListing',{...input,confirmation:q.confirmation}),buy={listingId:p.id,fromAccountId:accountId(f.otherId)},quote=await f.read('prepareMarketPurchase',buy,f.other),sale=await f.cmd('buyMarketListing',{...buy,confirmation:quote.confirmation},f.other);
  let d=await f.read('lotSaleDetail',{saleId:sale.id});assert.equal(d.canOfferPickup,true);await f.cmd('offerSalePickup',{saleId:sale.id,confirmation:d.pickupConfirmation});d=await f.read('lotSaleDetail',{saleId:sale.id},f.other);assert.equal(d.canPickup,true);await f.cmd('confirmSalePickup',{saleId:sale.id,confirmation:d.pickupConfirmation,received:true},f.other);const bag=await f.read('myInventory',{},f.other);assert.equal(bag.commercial.find(l=>l.id===sale.purchasedLotId).location.portId,'home');assert.ok(!bag.lots.some(l=>l.id===sale.purchasedLotId));
 });
 test(`${prefix} : stock commercial chargé par le moteur natif, équipement personnel refusé`,async()=>{
  const f=await soVoyagesFixture(makeStore,{restrictedFuel:false,prepareExtra:async f=>classifyMaster(f,'COMMERCIAL')});
  // Isolated fixture: a Courtier with acquired pilot skills and an already authorized ship.
  await f.store.runTransaction(async tx=>{const c=await tx.get(`sessions/${f.sid}/characters/${f.cid}`),a=await tx.get(`sessions/${f.sid}/accounts/${accountId(f.cid)}`);tx.set(`sessions/${f.sid}/characters/${c.id}`,{...c,birth:{...c.birth,classId:'COU'}});tx.set(`sessions/${f.sid}/accounts/${a.id}`,{...a,balance:100,revision:a.revision+1});});
  const supply={shopId:'counter',offerId:'supply',quantity:2,restricted:false,provisionId:randomUUID(),source:'Fixture isolée',reason:'Stock commercial de test'},provision=await f.read('prepareShopProvision',supply,f.owner);await f.cmd('provisionShop',{...supply,confirmation:provision.confirmation},f.owner);const sale=await f.buy({offerId:'supply',quantity:2,useProtected:false});await f.pickup(sale);const lot=(await f.read('myInventory')).commercial.find(l=>l.id===sale.purchasedLotId);assert.equal(lot.location.portId,'home');
  const fuel=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant');await assert.rejects(f.read('prepareCargoTransfer',{lotId:fuel.id,quantity:1,destination:{kind:'HOLD',id:'ship'}}),{code:'SO_PERSONAL_NOT_FREIGHT'});
  const input={lotId:lot.id,quantity:1,destination:{kind:'HOLD',id:'ship'}},p=await f.read('prepareCargoTransfer',input),out=await f.cmd('startCargoTransfer',{...input,confirmation:p.confirmation,present:true});f.advance(180000);const q=await f.read('prepareCargoReceipt',{transferId:out.id});await f.cmd('receiveCargoTransfer',{transferId:out.id,confirmation:q.confirmation,received:true});const hold=await f.read('shipHold',{shipId:'ship'});assert.equal(hold.stock.find(l=>l.item.usage==='COMMERCIAL').quantity,1);assert.equal(hold.stock.find(l=>l.item.usage==='COMMERCIAL').ownerId,f.cid);assert.equal((await f.read('myInventory')).commercial.find(l=>l.id===lot.id).quantity,1);const moved=hold.stock.find(l=>l.item.usage==='COMMERCIAL'),unload={lotId:moved.id,quantity:1,destination:{kind:'COMMERCIAL',id:f.cid,portId:'home'}},up=await f.read('prepareCargoTransfer',unload),uo=await f.cmd('startCargoTransfer',{...unload,confirmation:up.confirmation,present:true});f.advance(180000);const ur=await f.read('prepareCargoReceipt',{transferId:uo.id});await f.cmd('receiveCargoTransfer',{transferId:uo.id,confirmation:ur.confirmation,received:true});assert.equal((await f.read('myInventory')).commercial.reduce((n,l)=>n+l.quantity,0),2);
 });

 test(`${prefix} : voucher revendu, reçu puis consommé sur le vaisseau du nouvel acheteur`,async()=>{
  const f=await soVoyagesFixture(makeStore,{restrictedFuel:false,prepareExtra:async f=>classifyMaster(f)}),lot=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant');await f.store.runTransaction(async tx=>{const a=await tx.get(`sessions/${f.sid}/accounts/${accountId(f.otherId)}`);tx.set(`sessions/${f.sid}/accounts/${a.id}`,{...a,balance:20,revision:a.revision+1});});
  const input={lotId:lot.id,buyerId:f.otherId,quantity:1,amount:10,minutes:10,pickupPlace:'Port',conditions:'Voucher cessible'},p=await f.read('prepareLotSale',input),sale=await f.cmd('proposeLotSale',{...input,confirmation:p.confirmation}),purchase={saleId:sale.id,fromAccountId:accountId(f.otherId)},quote=await f.read('prepareLotPurchase',purchase,f.other),paid=await f.cmd('buyLot',{...purchase,confirmation:quote.confirmation},f.other);let d=await f.read('lotSaleDetail',{saleId:sale.id});await f.cmd('offerSalePickup',{saleId:sale.id,confirmation:d.pickupConfirmation});d=await f.read('lotSaleDetail',{saleId:sale.id},f.other);await f.cmd('confirmSalePickup',{saleId:sale.id,confirmation:d.pickupConfirmation,received:true},f.other);
  await f.provision({shipId:'other-ship',ownerId:f.otherId,pilotId:f.otherId});const fuel={shipId:'other-ship',lotId:paid.purchasedLotId,quantity:1},consent=await f.read('prepareRefuel',fuel,f.other);await f.cmd('refuelShip',{...fuel,confirmation:consent.confirmation,present:true},f.other);f.advance(120000);await f.navCommand('finishSoRefuel',{shipId:'other-ship'},f.other);assert.equal((await f.store.get(`sessions/${f.sid}/ships/other-ship`)).fuel,1);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${paid.purchasedLotId}`)).quantity,0);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,39);assert.equal((await f.read('myWallet',{},f.other)).account.protectedCredits,200);
 });

 test(`${prefix} : équipement individuel non consommable acheté sans modifier un kit initial`,async()=>{
  const f=await circuitsFixture(makeStore,{classId:'COM',consumable:false,kind:'INDIVIDUAL'}),lot=await f.acquire(1),bag=await f.read('myInventory');assert.equal(lot.quantity,1);assert.equal(lot.item.kind,'INDIVIDUAL');assert.equal(lot.item.usage,'PERSONAL');assert.equal(bag.lots.find(l=>l.id===lot.id).canSellPersonal,true);assert.equal(bag.lots.find(l=>l.item.id==='kit_communicator').transferable,false);
 });

}
