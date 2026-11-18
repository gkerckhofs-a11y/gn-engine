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

import {clinicFixture} from './space-clinic-suite.mjs';
import {healthFixture} from './space-outlaws-health-suite.mjs';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import {intelligenceFixture} from './intelligence-suite.mjs';
import {hiddenCargoFixture} from './space-hidden-cargo-suite.mjs';
const venue=async(f,action,kind='TARGET',who=f.player)=>{
 const call=f.actionCmd??f.cmd,resourceId=kind==='SHOP'?'counter':'scene';
 await call('saveLocalTerminal',{revision:0,terminal:{id:'venue',name:'Service préparé',placeId:'scene',portId:null,active:true,durationSeconds:60,operations:(Array.isArray(action)?action:[action]).map(action=>({action,resourceId,characterIds:[],skillId:null,minLevel:0}))}},f.owner);
 return ()=>call('scanLocalTerminal',{terminalId:'venue'},who);
};
export function terminalQrServicesSuite(makeStore,prefix='Terminaux QR — services'){
 test(`${prefix} TQ-05 : soins programmés au centre, suivi et fin après expiration`,async()=>{
  const f=await clinicFixture(makeStore);await f.damage(2);await enableQr(f);const before=await f.points();await assert.rejects(f.startClinic(),{code:'LOCAL_BINDING_REQUIRED'});assert.deepEqual(await f.points(),before);
  const scan=await venue(f,'clinicCare');await assert.rejects(f.startClinic(),{code:'LOCAL_SCAN_REQUIRED'});await scan();const a=await f.startClinic();f.advance(300000);await f.finishCare(a);assert.equal((await f.health()).hp,3);assert.equal((await f.points()).available,before.available-1);
 });
 test(`${prefix} TQ-05 : urgence sur le terrain sans QR d’hospice`,async()=>{
  const f=await healthFixture(makeStore);await enableQr(f);await f.damage(3);const a=await f.startCare();f.advance(120000);await f.finishCare(a);assert.ok((await f.health()).hp>0);
 });
 test(`${prefix} TQ-05 : contact préparé au lieu, renseignement acquis conservé`,async()=>{
  const f=await actionsFixture(makeStore,{classId:'COU',skillId:'COU-03',targetPatch:{profiles:{ANALYZE:analysisProfile('COU-03',{minLevel:1})},rewards:[{id:'reply',kind:'KNOWLEDGE',knowledgeId:'ordinary',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:false}]}});await f.stage('EN_JEU');await enableQr(f);
  await assert.rejects(f.prepareAction(),{code:'LOCAL_BINDING_REQUIRED'});const scan=await venue(f,'merchantService');await scan();const a=await f.start();f.advance(300000);await f.finish(a);assert.ok((await f.actionRead('myKnowledge')).items.length>0);
 });
 test(`${prefix} TQ-05 : renseignement acheté au comptoir, reçu disponible sans nouveau paiement`,async()=>{
  const f=await intelligenceFixture(makeStore),r=await f.offer();await enableQr(f);const before=await f.wallet();await assert.rejects(f.buy(r),{code:'LOCAL_BINDING_REQUIRED'});assert.deepEqual(await f.wallet(),before);
  const scan=await venue(f,['prepareIntelligencePurchase','buyIntelligence'],'SHOP',f.buyer);await scan();await f.buy(r);const paid=await f.wallet();f.advance(61000);assert.equal((await f.receipt('ordinary')).active,true);assert.equal((await f.offers())[0].status,'PURCHASED');assert.deepEqual(await f.wallet(),paid);
 });
 test(`${prefix} TQ-05 : contrôle habilité au bureau du port, clôture après expiration`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant(2);await enableQr(f);await assert.rejects(f.start(),{code:'LOCAL_BINDING_REQUIRED'});
  const scan=await portTerminal(f,['prepareCustomsInspection','startCustomsInspection'],f.other);await scan();const r=await f.start();f.advance(120000);await f.close(r);assert.notEqual((await f.inspect(r)).inspection.status,'ACTIVE');
 });
}
