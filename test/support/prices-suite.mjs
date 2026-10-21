import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {inventoryFixture} from './inventory-suite.mjs';
import {fieldFixture} from './field-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {priceCommands} from '../../src/core/prices.mjs';

function attach(f,sid,itemId){
 const read=(a,i={},who=f.owner)=>f.read(a,who,{sessionId:sid(),...i});
 const cmd=(a,i={},who=f.owner)=>f.cmd(a,who,{sessionId:sid(),...i});
 const admin=()=>read('priceAdmin');
 const prepare=async(kind,patch={})=>{
  const d=await admin(),old=kind==='CommodityPrice'?d.prices.find(p=>p.id===(patch.itemId??itemId)):d.events.find(e=>e.id===patch.eventId);
  const input={revision:d.session.revision,recordRevision:old?.revision??0,itemId,enabled:true,reason:'SECRET_PRIX_MJ',...(kind==='CommodityPrice'?{baseUnitPrice:10}:{title:'Pénurie fictive',description:'Texte public',percent:50,trigger:'MANUAL'}),...old,...patch};
  input.recordRevision=old?.revision??0;input.revision=d.session.revision;
  return {...input,confirmation:(await read(`prepare${kind}`,input)).confirmation};
 };
 const price=async(patch={})=>cmd('saveCommodityPrice',await prepare('CommodityPrice',patch));
 const event=async(patch={})=>cmd('savePriceEvent',await prepare('PriceEvent',patch));
 const board=(who=f.alice)=>read('commodityMarket',{},who);
 return {read,cmd,admin,prepare,price,event,board};
}
export function pricesSuite(makeStore,prefix='Cours'){
 async function fixture(){
  const f=await inventoryFixture(makeStore,3),p=attach(f,()=>f.sessionId,f.items[0]);
  await f.cmd('saveSessionEconomy',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,rules:{enabled:true,name:'Monnaie de test',unit:'crédit'},reason:'Test'});
  for(const characterId of f.characters.slice(1)){const i={sessionId:f.sessionId,revision:(await f.session()).revision,characterId,amount:100,mode:'CREDIT',memo:'Fonds de test',reason:'Test'},q=await f.read('prepareCreditAdjustment',f.owner,i);await f.cmd('applyCreditAdjustment',f.owner,{...i,confirmation:q.confirmation});}
  const listingInput=async(patch={})=>({lotId:(await f.lot()).id,quantity:3,pricing:'INDEXED',minutes:30,pickupPlace:'Quai test',conditions:'Retrait physique',...patch});
  const publish=async(patch={})=>{const i=await listingInput(patch),q=await p.read('prepareMarketListing',i,f.alice);return p.cmd('publishMarketListing',{...i,confirmation:q.confirmation},f.alice);};
  const purchase=async(id,who=f.bob)=>{const i={listingId:id,fromAccountId:accountId(who.uid===f.bob.uid?f.characters[1]:f.characters[2])},q=await p.read('prepareMarketPurchase',i,who);return {...i,confirmation:q.confirmation};};
  const balance=async who=>(await p.read('myWallet',{},who)).account.balance;
  return {...f,p,publish,purchase,balance,listingInput};
 }
 test(`${prefix} : suspension commerciale sans cours, ventes fixes et privées, reprise et retraits payés`,async()=>{
  const f=await fixture(),{p}=f;
  const fixed=await f.publish({quantity:1,pricing:'FIXED',amount:7}),ready=await f.purchase(fixed.id);
  const lot=await f.lot(),offer={lotId:lot.id,quantity:1,amount:9,buyerId:f.characters[1],minutes:30,conditions:'Retrait',pickupPlace:'Quai'};
  const pre=await p.read('prepareLotSale',offer,f.alice),sale=await p.cmd('proposeLotSale',{...offer,confirmation:pre.confirmation},f.alice);
  const buy={saleId:sale.id,fromAccountId:accountId(f.characters[1])},before=await p.read('prepareLotPurchase',buy,f.bob);
  const e=await p.event({percent:0,tradeBlocked:true});
  assert.equal((await p.board()).restrictions[0].item.id,f.items[0]);assert.equal((await p.board()).prices.length,0);
  assert.equal((await p.read('marketListing',{listingId:fixed.id},f.bob)).trade.blocked,true);
  assert.equal((await p.read('lotSaleDetail',{saleId:sale.id},f.bob)).canBuy,false);
  await assert.rejects(p.cmd('buyMarketListing',ready,f.bob),{code:'TRADE_SUSPENDED'});
  await assert.rejects(p.cmd('buyLot',{...buy,confirmation:before.confirmation},f.bob),{code:'TRADE_SUSPENDED'});
  await assert.rejects(f.publish({quantity:1,pricing:'FIXED',amount:1}),{code:'TRADE_SUSPENDED'});
  await assert.rejects(p.read('prepareLotSale',offer,f.alice),{code:'TRADE_SUSPENDED'});
  assert.equal(await f.balance(f.bob),100);assert.equal((await f.lot()).quantity,2);
  await p.event({eventId:e.id,enabled:false});
  await assert.rejects(p.cmd('buyMarketListing',ready,f.bob),{code:'STALE_REVISION'});
  const paid=await p.cmd('buyMarketListing',await f.purchase(fixed.id),f.bob);
  await p.event({eventId:e.id,enabled:true});
  let detail=await p.read('lotSaleDetail',{saleId:paid.id},f.alice);assert.equal(detail.canOfferPickup,true);
  await p.cmd('offerSalePickup',{saleId:paid.id,confirmation:detail.pickupConfirmation},f.alice);
  detail=await p.read('lotSaleDetail',{saleId:paid.id},f.bob);await p.cmd('confirmSalePickup',{saleId:paid.id,confirmation:detail.pickupConfirmation,received:true},f.bob);
  assert.equal(await f.balance(f.bob),93);assert.ok((await f.bag(f.bob)).lots.some(l=>l.id===paid.purchasedLotId));
  const pending=await p.read('lotSaleDetail',{saleId:sale.id},f.alice);await p.cmd('cancelLotSale',{saleId:sale.id,confirmation:pending.confirmation},f.alice);
 });
 test(`${prefix} : configuration explicite, projection publique, cumul arrondi et minimum`,async()=>{
  const f=await fixture(),{p}=f;assert.deepEqual((await p.board()).prices,[]);
  const input=await p.prepare('CommodityPrice',{baseUnitPrice:11});assert.equal((await p.admin()).prices.length,0);
  const requestId=randomUUID(),saved=await p.cmd('saveCommodityPrice',{...input,requestId});assert.deepEqual(await p.cmd('saveCommodityPrice',{...input,requestId}),saved);
  const event=await p.event({percent:50});assert.equal((await p.board()).prices[0].unitPrice,17);
  await p.event({percent:-25});assert.equal((await p.board()).prices[0].unitPrice,14);
  await p.event({eventId:event.id,percent:-100});await p.event({percent:-100});assert.equal((await p.board()).prices[0].unitPrice,1);
  const publicData=JSON.stringify(await p.board());assert.equal(publicData.includes('SECRET_PRIX_MJ'),false);assert.equal(publicData.includes('ORIGINE_SECRETE_MJ'),false);assert.equal(publicData.includes('actorUid'),false);
  assert.equal((await f.lot()).quantity,3);assert.equal(await f.balance(f.bob),100);
  await assert.rejects(p.price({baseUnitPrice:0}),{code:'INVALID_PRICE'});await assert.rejects(p.event({percent:1001}),{code:'INVALID_PRICE_EVENT'});await assert.rejects(p.event({trigger:'INSTALLATION_OFFLINE',targetId:'missing'}),{code:'INVALID_PRICE_EVENT'});
 });
 test(`${prefix} : prix indexé, confirmation périmée sans débit, paiement unique et montant figé`,async()=>{
  const f=await fixture(),{p}=f;await p.price();const listing=await f.publish({amount:1}),old=await f.purchase(listing.id);
  const e=await p.event();assert.equal((await p.read('marketListing',{listingId:listing.id},f.bob)).amount,45);
  await assert.rejects(p.cmd('buyMarketListing',old,f.bob),{code:'STALE_REVISION'});assert.equal(await f.balance(f.bob),100);
  const ready={...await f.purchase(listing.id),requestId:randomUUID()},sale=await p.cmd('buyMarketListing',ready,f.bob);assert.equal(sale.amount,45);
  assert.deepEqual(await p.cmd('buyMarketListing',ready,f.bob),sale);assert.equal(await f.balance(f.bob),55);assert.equal(await f.balance(f.alice),45);
  await p.event({eventId:e.id,enabled:false});const paid=await p.read('lotSaleDetail',{saleId:sale.id},f.bob);assert.equal(paid.amount,45);assert.equal(paid.priceQuote.unitPrice,15);
  assert.equal((await p.read('marketListing',{listingId:listing.id},f.alice)).amount,45);
  let detail=await p.read('lotSaleDetail',{saleId:sale.id},f.alice);await p.cmd('offerSalePickup',{saleId:sale.id,confirmation:detail.pickupConfirmation},f.alice);detail=await p.read('lotSaleDetail',{saleId:sale.id},f.bob);await p.cmd('confirmSalePickup',{saleId:sale.id,confirmation:detail.pickupConfirmation,received:true},f.bob);
  assert.equal(await f.balance(f.bob),55);assert.ok((await f.bag(f.bob)).lots.some(l=>l.id===sale.purchasedLotId&&l.quantity===3));
 });
 test(`${prefix} : prix fixes indépendants, cours suspendu et retrait de stock indexé`,async()=>{
  const f=await fixture(),{p}=f;await p.price();const fixed=await f.publish({quantity:1,pricing:'FIXED',amount:7}),ready=await f.purchase(fixed.id);await p.event({percent:100});
  assert.equal((await p.cmd('buyMarketListing',ready,f.bob)).amount,7);
  const indexed=await f.publish({quantity:2});await p.price({enabled:false});const d=await p.read('marketListing',{listingId:indexed.id},f.alice);assert.equal(d.canBuy,false);assert.equal(d.priceAvailable,false);assert.equal(d.amount,null);
  await assert.rejects(f.purchase(indexed.id),{code:'PRICE_UNAVAILABLE'});await p.cmd('withdrawMarketListing',{listingId:indexed.id,confirmation:d.confirmation},f.alice);
  assert.equal((await f.lot()).status,'AVAILABLE');assert.equal((await f.lot()).quantity,2);assert.equal(await f.balance(f.bob),93);
 });
 test(`${prefix} : achats concurrents et transaction interrompue ne doublent ni argent ni propriété`,async()=>{
  const f=await fixture(),{p}=f;await p.price();const listing=await f.publish(),b=await f.purchase(listing.id),e=await f.purchase(listing.id,f.eve);
  const run=f.store.runTransaction.bind(f.store);f.store.runTransaction=cb=>run(async tx=>{await cb(tx);throw new Error('ROLLBACK_PRICE');});await assert.rejects(p.cmd('buyMarketListing',b,f.bob),/ROLLBACK_PRICE/);f.store.runTransaction=run;
  assert.equal(await f.balance(f.alice),0);assert.equal((await f.lot()).status,'RESERVED');
  const results=await Promise.allSettled([p.cmd('buyMarketListing',b,f.bob),p.cmd('buyMarketListing',e,f.eve)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await f.balance(f.alice),30);assert.equal(await f.balance(f.bob)+await f.balance(f.eve),170);
 });
 test(`${prefix} : accès privés, MJ délégué, révocation avant réessai et archive fermée`,async()=>{
  const f=await fixture(),{p}=f;for(const action of priceCommands)await assert.rejects(p.read(action,{},null),{code:'LOGIN_REQUIRED'});
  await assert.rejects(p.read('priceAdmin',{},f.alice),{code:'FORBIDDEN'});await assert.rejects(p.cmd('saveCommodityPrice',{role:'OWNER'},f.bob),{code:'FORBIDDEN'});
  await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Accueil'});await assert.rejects(p.read('priceAdmin',{},f.staff),{code:'FORBIDDEN'});
  await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:true,reason:'MJ'});
  const input={...await p.prepare('CommodityPrice'),requestId:randomUUID()};await p.cmd('saveCommodityPrice',input,f.staff);
  await f.cmd('setStaff',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,email:f.staff.email,role:'MJ',active:false,reason:'Révocation'});await assert.rejects(p.cmd('saveCommodityPrice',input,f.staff),{code:'FORBIDDEN'});
  await f.cmd('revokeAccess',f.owner,{sessionId:f.sessionId,revision:(await f.session()).revision,uid:f.bob.uid,reason:'Fin'});await assert.rejects(p.board(f.bob),{code:'FORBIDDEN'});
  await f.stage('FINISHED');await f.stage('ARCHIVED');await assert.rejects(p.admin(),{code:'SESSION_CLOSED'});
 });
 test(`${prefix} : changement de cours avant publication, fonds insuffisants et incohérence d’unité`,async()=>{
  const f=await fixture(),{p}=f;await p.price();const i=await f.listingInput(),q=await p.read('prepareMarketListing',i,f.alice);await p.price({baseUnitPrice:40});await assert.rejects(p.cmd('publishMarketListing',{...i,confirmation:q.confirmation},f.alice),{code:'STALE_REVISION'});
  const listing=await f.publish();await assert.rejects(f.purchase(listing.id),{code:'INSUFFICIENT_FUNDS'});assert.equal(await f.balance(f.bob),100);
  const d=await f.session(),item=d.items.find(x=>x.id===f.items[0]);await f.cmd('saveSessionItem',f.owner,{...item,sessionId:f.sessionId,revision:d.revision,unit:'caisse',reason:'Nouvelle unité'});
  assert.equal((await p.board()).prices.length,0);await assert.rejects(f.purchase(listing.id),{code:'PRICE_UNAVAILABLE'});await p.price({baseUnitPrice:10});await assert.rejects(f.purchase(listing.id),{code:'PRICE_UNAVAILABLE'});
 });
 test(`${prefix} : sabotage, réparation, expiration suspendue et continuité de campagne`,async()=>{
  const f=await fieldFixture(makeStore),item=await f.item(true),p=attach(f,()=>f.sid,item.id);await p.price();
  const t=await f.installation({title:'INSTALLATION_SECRETE',offlineSeconds:60}),e=await p.event({trigger:'INSTALLATION_OFFLINE',targetId:t.id,tradeBlocked:true});assert.equal((await p.board()).prices[0].unitPrice,10);
  const route=await p.cmd('saveRoute',{revision:(await p.admin()).session.revision,name:'Route test',fromPort:'local',toPort:'distant',durationSeconds:60,fuelCost:3,enabled:true,reason:'Test'});
  await p.event({targetKind:'ROUTE',itemId:null,routeId:route.id,percent:0,fuelPercent:50,durationPercent:50,trigger:'INSTALLATION_OFFLINE',targetId:t.id});
  let a=await f.start(t.id,'SABOTAGE');f.advance(30000);await f.finish(a);assert.equal((await p.board()).prices[0].unitPrice,15);assert.equal(JSON.stringify(await p.board()).includes('INSTALLATION_SECRETE'),false);assert.equal(JSON.stringify(await p.board()).includes(t.id),false);
  assert.equal((await p.board()).restrictions.length,1);
  assert.equal((await p.admin()).routes[0].fuelCost,5);assert.equal((await p.admin()).routes[0].durationSeconds,90);
  a=await f.start(t.id,'REPAIR',{},f.bob);f.advance(30000);await f.finish(a,{},f.bob);assert.equal((await p.board()).prices[0].unitPrice,10);assert.equal((await p.board()).restrictions.length,0);
  assert.equal((await p.admin()).routes[0].fuelCost,3);
  f.advance(60000);a=await f.start(t.id,'SABOTAGE',{},f.eve);f.advance(30000);await f.finish(a,{},f.eve);await f.stage('PAUSE');f.advance(600000);assert.equal((await p.board()).prices[0].unitPrice,15);await f.stage('EN_JEU');f.advance(60000);assert.equal((await p.board()).prices[0].unitPrice,10);
  await p.event({eventId:e.id,trigger:'MANUAL',targetId:null});const oldSid=f.sid;await f.close();await f.resume(await f.begin());const d=await p.admin();assert.equal(d.prices[0].baseUnitPrice,10);assert.equal(d.events.find(x=>x.id===e.id).percent,50);assert.equal(d.board[0].unitPrice,15);assert.equal(d.events.some(e=>e.routeId===route.id),true);
  await assert.rejects(f.cmd('saveCommodityPrice',f.owner,{sessionId:oldSid,...await p.prepare('CommodityPrice')}));
 });
}
