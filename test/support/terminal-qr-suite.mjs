import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {planetMarketsFixture} from './planet-markets-suite.mjs';
export async function terminalQrFixture(makeStore,options={}){
 const f=await planetMarketsFixture(makeStore,options);
 const operations=['commodityMarket','galacticMarkets','preparePlanetSale','sellToPlanetMarket'].map(action=>({action,resourceId:f.sid,characterIds:[],skillId:null,minLevel:0}));
 const terminal={id:'bourse',name:'Comptoir des marchandises',placeId:'scene',portId:null,active:true,durationSeconds:60,operations};
 const save=(patch={},revision=0)=>f.cmd('saveLocalTerminal',{terminal:{...terminal,...patch},revision},f.owner);
 const scan=()=>f.cmd('scanLocalTerminal',{terminalId:terminal.id});
 const adopt=async()=>{await f.stage('PAUSE');const s=await f.store.get(`sessions/${f.sid}`);await f.cmd('setTerminalQrMode',{version:1,revision:s.revision},f.owner);await f.stage('EN_JEU');};
 return {...f,terminal,save,scan,adopt};
}
export function terminalQrSuite(makeStore,prefix='Terminaux QR'){
 test(`${prefix} TQ-01 : opt-in explicite, héritage intact, absence de raccordement fermée`,async()=>{
  const f=await terminalQrFixture(makeStore);await f.read('commodityMarket');await f.read('galacticMarkets');
  const s=await f.store.get(`sessions/${f.sid}`);await assert.rejects(f.cmd('setTerminalQrMode',{version:1,revision:s.revision},f.player),{code:'FORBIDDEN'});
  await assert.rejects(f.cmd('setTerminalQrMode',{version:1,revision:s.revision},f.owner),{code:'SESSION_NOT_PAUSED'});
  await f.adopt();await assert.rejects(f.read('commodityMarket'),{code:'LOCAL_BINDING_REQUIRED'});await assert.rejects(f.read('galacticMarkets'),{code:'LOCAL_BINDING_REQUIRED'});
 });
 test(`${prefix} TQ-01 : Courtier, comptoir courant, expiration et fermeture sans effet économique`,async()=>{
  const f=await terminalQrFixture(makeStore);await f.save();await f.adopt();const before=await f.wallet();
  for(const a of ['commodityMarket','galacticMarkets'])await assert.rejects(f.read(a),{code:'LOCAL_SCAN_REQUIRED'});
  await f.scan();await f.read('commodityMarket');await f.read('galacticMarkets');await f.move('away');await f.read('galacticMarkets');
  f.advance(61000);for(const a of ['commodityMarket','galacticMarkets'])await assert.rejects(f.read(a),{code:'LOCAL_SCAN_REQUIRED'});
  assert.deepEqual(await f.wallet(),before);await f.save({active:false},1);await assert.rejects(f.read('commodityMarket'),{code:'LOCAL_TERMINAL_CLOSED'});
 });
 test(`${prefix} TQ-01 : catalogues sans cours à distance, achat distant au comptoir et reçu acquis durable`,async()=>{
  const f=await terminalQrFixture(makeStore);await f.configure();await f.save({operations:[...f.terminal.operations,...['shop','prepareShopPurchase','buyShopOffer'].map(action=>({action,resourceId:'counter',characterIds:[],skillId:null,minLevel:0}))]});await f.adopt();
  assert.ok((await f.read('shops')).shops.every(s=>s.offers.length===0));await f.scan();const sale=await f.buy(1);assert.equal((await f.wallet()).balance,960);
  f.advance(61000);const d=await f.read('shops');assert.ok(d.shops.every(s=>s.offers.length===0));assert.equal(d.orders[0].id,sale.id);
  await f.move('away');await f.pickup(sale);assert.equal((await f.store.get(`${f.base}/inventory/${sale.purchasedLotId}`)).location.kind,'COMMERCIAL');
 });
 test(`${prefix} TQ-01 : non-Courtier consulte les cours publics sans recevoir les prix professionnels`,async()=>{
  const f=await terminalQrFixture(makeStore,{classId:'MED',usage:'PERSONAL'});await f.save();await f.adopt();
  await assert.rejects(f.read('commodityMarket'),{code:'LOCAL_SCAN_REQUIRED'});await f.scan();const d=await f.read('commodityMarket');assert.ok(Array.isArray(d.prices));
  await assert.rejects(f.read('galacticMarkets'),{code:'FORBIDDEN'});assert.doesNotMatch(JSON.stringify(d),/assignedUid|gmNotes|SECRET/);
 });
}

import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {moduleWorkFixture} from './space-module-work-suite.mjs';
const enableQr=async f=>f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}`,s=await tx.get(p);tx.set(p,{...s,spaceOutlaws:{...s.spaceOutlaws,terminalQrVersion:1}});});
const portTerminal=async(f,actions,actor=f.player)=>{
 const ship=await f.ship(),terminal={id:'port-qr',name:'Spatioport et atelier',placeId:'scene',portId:ship.portId,active:true,durationSeconds:60,operations:actions.map(action=>({action,resourceId:ship.portId,characterIds:[],skillId:null,minLevel:0}))};
 await f.cmd('saveLocalTerminal',{terminal,revision:0},f.owner);return ()=>f.cmd('scanLocalTerminal',{terminalId:terminal.id},actor);
};
export function terminalQrPortSuite(makeStore,prefix='Terminaux QR — quai'){
 test(`${prefix} TQ-04 : pilotage natif, nouveaux départs fermés et opérations engagées terminables`,async()=>{
  const f=await soVoyagesFixture(makeStore);await enableQr(f);const before=await f.ship(),pa=await f.points();
  await assert.rejects(f.refuel(2),{code:'LOCAL_BINDING_REQUIRED'});assert.deepEqual(await f.ship(),before);assert.deepEqual(await f.points(),pa);
  const scan=await portTerminal(f,['prepareRefuel','refuelShip','prepareVoyage','departShip']);await assert.rejects(f.refuel(2),{code:'LOCAL_SCAN_REQUIRED'});await scan();await f.refuel(2);
  assert.equal((await f.ship()).fuel,2);await f.navigation();await assert.rejects(f.startFlight(),{code:'LOCAL_SCAN_REQUIRED'});await scan();await f.startFlight();f.advance(180000);await f.navCommand('finishSoPreparation');
  assert.ok((await f.ship()).journey);assert.equal((await f.points()).available,pa.available-1);await f.navigation();
 });
 test(`${prefix} TQ-04 : le scan n’accorde pas le mandat de pilote`,async()=>{
  const f=await soVoyagesFixture(makeStore);await enableQr(f);const scan=await portTerminal(f,['prepareVoyage','departShip'],f.other);await scan();await assert.rejects(f.startFlight({},f.other),{code:'FORBIDDEN'});assert.equal((await f.ship()).operation,null);
 });
 test(`${prefix} TQ-04 : atelier, PA natif et annulation du travail après expiration`,async()=>{
  const f=await moduleWorkFixture(makeStore);await enableQr(f);const before=await f.points(f.other);await assert.rejects(f.preview(),{code:'LOCAL_BINDING_REQUIRED'});assert.deepEqual(await f.points(f.other),before);
  const scan=await portTerminal(f,['prepareModuleWorkStart','startModuleWork'],f.other);await assert.rejects(f.preview(),{code:'LOCAL_SCAN_REQUIRED'});await scan();await f.start();assert.equal((await f.points(f.other)).reserved,1);
  f.advance(61000);await f.work();await f.cancel();assert.equal((await f.points(f.other)).reserved,0);
 });
}
