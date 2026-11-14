import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {circuitsFixture} from './item-circuits-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {readSoEpisode} from '../../src/core/space-outlaws-episodes.mjs';
import {spaceCommodities,planetMarketStates} from '../../src/shared/space-outlaws-commodities.mjs';
import {planetMarketQuote} from '../../src/core/planet-market-state.mjs';

export async function planetMarketsFixture(makeStore){
 const f=await circuitsFixture(makeStore,{usage:'COMMERCIAL',classId:'COU',legality:'LEGAL'}),base=`sessions/${f.sid}`,session=await f.store.get(base);
 await f.store.runTransaction(async tx=>{for(const id of ['home','away','secret'])tx.set(`${base}/ports/${id}`,{id,name:id==='secret'?'SECRET_PLANET':id,versionId:session.versionId,navigationCode:'SECRET_NAV',customsRules:[{itemId:'kit_medical-supplies',status:'FREE'}]});});
 const admin=(a,p={})=>f.read(a,p,f.owner),adminCmd=(a,p={})=>f.cmd(a,p,f.owner);
 const configure=async(patch={})=>{const rows=(await admin('galacticEconomyAdmin')).markets,old=rows.find(x=>x.portId===(patch.portId??'away')),p={portId:'away',itemId:'kit_medical-supplies',commodityCode:'WATER',marketState:'NORMAL',shopId:'counter',offerId:'supply',demand:20,enabled:true,recordRevision:old?.revision??0,reason:'SECRET_ADMIN_REASON',...patch},q=await admin('preparePlanetMarket',p);return adminCmd('savePlanetMarket',{...p,confirmation:q.confirmation});};
 const move=async port=>f.store.runTransaction(async tx=>{const c=await tx.get(`${base}/characters/${f.cid}`);tx.set(`${base}/characters/${f.cid}`,{...c,spacePortId:port});});
 const sellInput=async(lotId,quantity=1)=>({marketId:(await f.read('galacticMarkets')).markets[0].id,lotId,quantity});
 const sell=async(lotId,quantity=1)=>{const i=await sellInput(lotId,quantity),q=await f.read('preparePlanetSale',i);return f.cmd('sellToPlanetMarket',{...i,confirmation:q.confirmation});};
 return {...f,base,session,admin,adminCmd,configure,move,sell,sellInput,wallet:()=>f.store.get(`${base}/accounts/${accountId(f.cid)}`)};
}
export function planetMarketsSuite(makeStore,prefix='Marchés planétaires'){
 test(`${prefix} : douze références V0.7, quatre états et arrondi du moteur existant`,()=>{
  assert.equal(spaceCommodities.length,12);assert.deepEqual(Object.values(planetMarketStates).map(s=>s.percent),[-15,0,15,30]);
  const item={id:'x',name:'Eau',usage:'COMMERCIAL',unit:'lot',kind:'STACKABLE'};
  assert.equal(planetMarketQuote({id:'m',enabled:true,revision:1,commodityCode:'WATER',marketState:'SHORTAGE'},item).unitPrice,52);
  assert.equal(planetMarketQuote({id:'m',enabled:true,revision:1,commodityCode:'PARTS',marketState:'SURPLUS'},item).unitPrice,43);
 });
 test(`${prefix} : configuration sans création, confidentialité et refus joueur ordinaire`,async()=>{
  const f=await planetMarketsFixture(makeStore),before=await f.remaining(),wallet=await f.wallet();await f.configure();
  assert.deepEqual(await f.remaining(),before);assert.deepEqual(await f.wallet(),wallet);
  const d=await f.read('galacticMarkets');assert.equal(d.markets.length,1);assert.equal(d.markets[0].quote.unitPrice,40);assert.equal(d.markets[0].stock,8);assert.doesNotMatch(JSON.stringify(d),/SECRET|actorUid|reason|navigationCode|budget.*reserved/);
  await assert.rejects(f.read('galacticEconomyAdmin'),{code:'FORBIDDEN'});
  const ordinary=await circuitsFixture(makeStore,{usage:'COMMERCIAL',classId:'MED'});await assert.rejects(ordinary.read('galacticMarkets'),{code:'FORBIDDEN'});
 });
 test(`${prefix} : achat distant sans téléportation et retrait refusé au mauvais port`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure({marketState:'SURPLUS'});const sale=await f.buy(2),lot=await f.store.get(`${f.base}/inventory/${sale.purchasedLotId}`);
  assert.equal((await f.wallet()).balance,932);assert.equal((await f.remaining()).quantity,6);assert.equal((await f.till()).balance,68);assert.equal(lot.ownerId,f.cid);assert.deepEqual(lot.location,{kind:'SHOP',id:'counter'});
  const paid=await f.store.get(`${f.base}/lotSales/${sale.id}`);assert.equal(paid.stockPortId,'away');await assert.rejects(f.pickup(sale));assert.equal((await f.store.get(`${f.base}/inventory/${lot.id}`)).location.kind,'SHOP');
  await f.move('away');await f.pickup(sale);assert.deepEqual((await f.store.get(`${f.base}/inventory/${lot.id}`)).location,{kind:'COMMERCIAL',id:f.cid,portId:'away'});
 });
 test(`${prefix} : cours changé invalide le devis, prix payé conservé et historique public borné`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure();const p=f.purchaseInput({quantity:1,useProtected:false}),q=await f.read('prepareShopPurchase',p);await f.configure({marketState:'SHORTAGE'});
  await assert.rejects(f.cmd('buyShopOffer',{...p,quoteAt:q.quoteAt,confirmation:q.confirmation}),{code:'STALE_REVISION'});assert.equal((await f.wallet()).balance,1000);
  const sale=await f.buy(1);await f.configure({marketState:'SURPLUS'});assert.equal((await f.store.get(`${f.base}/lotSales/${sale.id}`)).amount,52);
  const rows=(await f.read('galacticMarkets')).markets[0];assert.deepEqual(rows.history.map(p=>p.unitPrice),[40,52,34]);assert.equal(rows.previousPrice,52);
  await f.configure({enabled:false});assert.equal((await f.read('galacticMarkets')).markets.length,0);await assert.rejects(f.buy(1),{code:'TRADE_SUSPENDED'});
 });
 test(`${prefix} : rachat local à 85 %, demande et conservation stocks/crédits`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure();const sale=await f.buy(3);await f.move('away');await f.pickup(sale);const lotId=sale.purchasedLotId,before=await f.wallet(),stock=await f.remaining(),till=await f.till(),r=await f.sell(lotId,2);
  assert.equal(r.amount,68);assert.equal((await f.wallet()).balance,before.balance+68);assert.equal((await f.till()).balance,till.balance-68);assert.equal((await f.remaining()).quantity,stock.quantity+2);assert.equal((await f.store.get(`${f.base}/inventory/${lotId}`)).quantity,1);assert.equal((await f.read('galacticMarkets')).markets[0].demand,18);
  assert.equal((await f.wallet()).balance+(await f.till()).balance,1000);assert.equal((await f.remaining()).quantity+(await f.store.get(`${f.base}/inventory/${lotId}`)).quantity,8);
 });
 test(`${prefix} : fonds, demande, tiers, soute et mauvaise escale refusés`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure({demand:1});const sale=await f.buy(3);await f.move('away');await f.pickup(sale);const i=await f.sellInput(sale.purchasedLotId,2);
  await assert.rejects(f.read('preparePlanetSale',i),{code:'PLANET_DEMAND_EXCEEDED'});await f.move('home');await assert.rejects(f.read('preparePlanetSale',{...i,quantity:1}),{code:'SHIP_NOT_LOCAL'});await f.move('away');
  await f.store.runTransaction(async tx=>{const l=await tx.get(`${f.base}/inventory/${sale.purchasedLotId}`);tx.set(`${f.base}/inventory/${l.id}`,{...l,location:{kind:'HOLD',id:'ship'}});});await assert.rejects(f.read('preparePlanetSale',{...i,quantity:1}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : réessais et concurrence sans double dépense, pause et continuité`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure();const p=f.purchaseInput({quantity:2,useProtected:false}),q=await f.read('prepareShopPurchase',p),input={...p,quoteAt:q.quoteAt,confirmation:q.confirmation,requestId:randomUUID()},sale=await f.cmd('buyShopOffer',input);assert.deepEqual(await f.cmd('buyShopOffer',input),sale);await f.move('away');await f.pickup(sale);
  const i=await f.sellInput(sale.purchasedLotId),preview=await f.read('preparePlanetSale',i),one={...i,confirmation:preview.confirmation,requestId:randomUUID()},two={...one,requestId:randomUUID()},out=await Promise.allSettled([f.cmd('sellToPlanetMarket',one),f.cmd('sellToPlanetMarket',two)]);assert.equal(out.filter(r=>r.status==='fulfilled').length,1);assert.equal(out.find(r=>r.status==='rejected').reason.code,'STALE_REVISION');const winner=out.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('sellToPlanetMarket',winner===0?one:two),out[winner].value);
  await f.stage('PAUSE');await assert.rejects(f.sell(sale.purchasedLotId),{code:'SESSION_NOT_RUNNING'});
  const snapshot=await f.store.runTransaction(async tx=>readSoEpisode(tx,await tx.get(f.base)));assert.ok(snapshot.entries.some(e=>e.path.startsWith('planetMarkets/')));assert.ok(snapshot.entries.some(e=>e.path.startsWith('planetPriceHistory/')));
 });
 test(`${prefix} : deux planètes indépendantes, caisse finie et politique douanière inconnue`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure();
  await f.store.runTransaction(async tx=>{const offer=await tx.get(`${f.base}/shops/counter/offers/supply`),shop=await tx.get(`${f.base}/shops/counter`);tx.set(`${f.base}/shops/second`,{...shop,id:'second'});tx.set(`${f.base}/shops/second/offers/second-offer`,{...offer,id:'second-offer',shopId:'second'});});
  await f.configure({portId:'home',shopId:'second',offerId:'second-offer',marketState:'SHORTAGE'});let board=await f.read('galacticMarkets');assert.deepEqual(board.markets.map(m=>m.quote.unitPrice).sort((a,b)=>a-b),[40,52]);
  const sale=await f.buy(1);await f.move('away');await f.pickup(sale);await f.configure({marketState:'SHORTAGE'});await assert.rejects(f.sell(sale.purchasedLotId),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.till()).balance,40);
  await f.store.runTransaction(async tx=>{const port=await tx.get(`${f.base}/ports/away`);tx.set(`${f.base}/ports/away`,{...port,customsRules:[]});});board=await f.read('galacticMarkets');assert.equal(board.markets.find(m=>m.portId==='away').canBuy,false);await assert.rejects(f.buy(1),{code:'PLANET_TRADE_RESTRICTED'});
 });
 test(`${prefix} : dernier stock concurrent, accès révoqué et aucun droit conféré par un identifiant`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure();const p=f.purchaseInput({quantity:8,useProtected:false}),q=await f.read('prepareShopPurchase',p),i={...p,quoteAt:q.quoteAt,confirmation:q.confirmation},out=await Promise.allSettled([f.cmd('buyShopOffer',{...i,requestId:randomUUID()}),f.cmd('buyShopOffer',{...i,requestId:randomUUID()})]);assert.equal(out.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.remaining()).quantity,0);assert.equal((await f.wallet()).balance,680);
  const registration=(await f.store.list(`${f.base}/registrations`)).find(r=>r.characterId===f.cid);await f.store.runTransaction(async tx=>tx.set(`${f.base}/registrations/${registration.id}`,{...registration,accessActive:false}));await assert.rejects(f.read('galacticMarkets'),{code:'FORBIDDEN'});
 });

 test(`${prefix} : marchandise importée ou provenance inconnue sans dédouanement jamais rachetée`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure({portId:'home'});const sale=await f.buy(2);await f.pickup(sale);const wallet=await f.wallet();
  await f.store.runTransaction(async tx=>{const offer=await tx.get(`${f.base}/shops/counter/offers/supply`),shop=await tx.get(`${f.base}/shops/counter`),lot=await tx.get(`${f.base}/inventory/${sale.purchasedLotId}`);tx.set(`${f.base}/shops/destination`,{...shop,id:'destination'});tx.set(`${f.base}/shops/destination/offers/destination-offer`,{...offer,id:'destination-offer',shopId:'destination'});tx.set(`${f.base}/inventory/${lot.id}`,{...lot,location:{kind:'COMMERCIAL',id:f.cid,portId:'away'}});});
  await f.configure({portId:'away',shopId:'destination',offerId:'destination-offer'});await f.move('away');let market=(await f.read('galacticMarkets')).markets.find(m=>m.portId==='away');await assert.rejects(f.read('preparePlanetSale',{marketId:market.id,lotId:sale.purchasedLotId,quantity:1}),{code:'PLANET_IMPORT_REQUIRED'});
  await f.move('home');await f.store.runTransaction(async tx=>{const lot=await tx.get(`${f.base}/inventory/${sale.purchasedLotId}`);tx.set(`${f.base}/inventory/${lot.id}`,{...lot,location:{kind:'COMMERCIAL',id:f.cid,portId:'home'},origin:{kind:'UNKNOWN'}});});market=(await f.read('galacticMarkets')).markets.find(m=>m.portId==='home');await assert.rejects(f.read('preparePlanetSale',{marketId:market.id,lotId:sale.purchasedLotId,quantity:1}),{code:'PLANET_IMPORT_REQUIRED'});assert.deepEqual(await f.wallet(),wallet);
 });

 test(`${prefix} : une modification MJ concurrente invalide le formulaire et sa confirmation`,async()=>{
  const f=await planetMarketsFixture(makeStore);await f.configure();const before=(await f.admin('galacticEconomyAdmin')).markets[0],input={portId:before.portId,itemId:before.itemId,commodityCode:before.commodityCode,marketState:'SURPLUS',shopId:before.shopId,offerId:before.offerId,demand:before.demand,enabled:true,recordRevision:before.revision,reason:'Formulaire ouvert avant une autre décision'},q=await f.admin('preparePlanetMarket',input);await f.configure({marketState:'TENSION'});
  await assert.rejects(f.admin('preparePlanetMarket',input),{code:'STALE_REVISION'});await assert.rejects(f.adminCmd('savePlanetMarket',{...input,confirmation:q.confirmation}),{code:'STALE_REVISION'});assert.equal((await f.admin('galacticEconomyAdmin')).markets[0].quote.unitPrice,46);
 });

}
