import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {moduleInstallationFixture} from './space-module-installation-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {encountersFixture} from './space-encounters-suite.mjs';
import {installedShipProfile} from '../../src/shared/space-ship-modules.mjs';
import {flightShip} from '../../src/core/space-module-flight.mjs';
import {maintenancePlan} from '../../src/core/space-maintenance.mjs';

export async function moduleFlightFixture(makeStore,options={}){
 const f=await moduleInstallationFixture(makeStore,{riskId:'DANGEROUS',...options});f.ready();await f.finish();await f.refuel(6);
 const launch=async(dice=[1,5,1,1])=>{await f.startFlight();f.advance(180000);f.setDice(dice);return f.navCommand('finishSoPreparation');};
 return {...f,launch};
}
async function equippedConvoy(makeStore){
 const f=await moduleFlightFixture(makeStore);await f.provision({shipId:'escort',name:'Escorte',ownerId:f.otherId,pilotId:f.otherId});
 const stock={shopId:'counter',offerId:'fuel',quantity:6,provisionId:randomUUID(),restricted:true,source:'Stock réel PNJ',reason:'Essai de convoi équipé'},stockPreview=await f.read('prepareShopProvision',stock,f.owner);await f.cmd('provisionShop',{...stock,confirmation:stockPreview.confirmation},f.owner);const sale=await f.buy({offerId:'fuel',quantity:6},f.other);await f.pickup(sale,f.other);const p={shipId:'escort',lotId:sale.purchasedLotId,quantity:6},q=await f.read('prepareRefuel',p,f.other);await f.cmd('refuelShip',{...p,confirmation:q.confirmation,present:true},f.other);f.advance(120000);await f.navCommand('finishSoRefuel',{shipId:'escort'},f.other);
 const input={shipId:'ship',escortShipId:'escort',navigationCode:'AWAY-CODE'},preview=await f.read('prepareSoConvoy',input);await f.cmd('proposeSoConvoy',{...input,confirmation:preview.confirmation});const invite=(await f.navigation('escort',f.other)).invitations[0];await f.cmd('acceptSoConvoy',{shipId:'escort',leaderShipId:'ship',confirmation:invite.confirmation},f.other);
 const depart=async()=>{await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');f.setDice([1,5,2,1]);return f.navCommand('finishSoPreparation',{shipId:'escort'},f.other);};
 return {...f,depart};
}
export function moduleFlightSuite(makeStore,prefix='Vols équipés SO'){
 test(`${prefix} : quatre modules réellement achetés et montés, panne de quinze minutes sans casse`,async()=>{
  for(const code of ['MOD-01','MOD-02','MOD-03','MOD-06']){
   const f=await moduleFlightFixture(makeStore,{code}),before=await f.ship(),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),points=await f.points();assert.equal((await f.navigation()).ship.moduleFlightBlocked,false);await f.launch();
   const sh=await f.ship(),nav=(await f.navigation()).ship;assert.equal(sh.journey.event.delaySeconds,0);assert.equal(sh.journey.event.neutralizedModule.lotId,lot.id);assert.equal(sh.journey.suspended,false);assert.equal(sh.fuel,4);assert.equal(sh.revisionRequired,false);assert.deepEqual(await f.get(`inventory/${lot.id}`),lot);assert.deepEqual(sh.modules,before.modules);assert.equal(sh.soProfile.hullMax,4);assert.equal(sh.soProfile.shieldMax,2);assert.equal(sh.soProfile.maneuverability,1);assert.equal(sh.soProfile.weapon,undefined);assert.equal(nav.moduleNeutralizations[0].remainingSeconds,900);assert.equal((await f.points()).available,points.available-1);
   const recorded=await f.get(`voyages/${sh.journey.id}`);assert.deepEqual(recorded.event,sh.journey.event);
   f.advance(900000);const after=(await f.navigation()).ship;assert.equal(after.moduleNeutralizations.length,0);assert.deepEqual(after.profile,before.soProfile);assert.equal(after.hull,before.hull);assert.equal(after.shield,before.shield);assert.deepEqual(await f.get(`inventory/${lot.id}`),lot);
  }
 });
 test(`${prefix} : maximum réduit puis rétabli ne rend jamais de points, entretien voit le profil courant`,async()=>{
  for(const [code,key,max]of [['MOD-01','shield',3],['MOD-02','hull',5]]){
   const f=await moduleFlightFixture(makeStore,{code});await f.edit('ships/ship',s=>({...s,[key]:max}));await f.launch();const sh=await f.ship();assert.equal(sh[key],max-1);assert.throws(()=>maintenancePlan(sh,key==='hull'?'HULL':'SHIELD',1));f.advance(900000);const nav=(await f.navigation()).ship;assert.equal(nav[key],max-1);assert.equal(nav.profile[key==='hull'?'hullMax':'shieldMax'],max);assert.equal(maintenancePlan(flightShip(await f.get(''),sh,sh.moduleNeutralizations[0].untilGameMs),key==='hull'?'HULL':'SHIELD',1).points,1);
  }
 });
 test(`${prefix} : PAUSE et STOP figent le délai, lectures sans écriture et arrivée avant expiration`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.launch();f.advance(10000);await f.stage('PAUSE');f.advance(900000);const stored=await f.ship();assert.equal((await f.navigation()).ship.moduleNeutralizations[0].remainingSeconds,890);assert.deepEqual(await f.ship(),stored);await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'STOP'});f.advance(900000);assert.equal((await f.navigation()).ship.moduleNeutralizations[0].remainingSeconds,890);
 });
 test(`${prefix} : arrivée conserve la panne et empêche le retrait avant expiration`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.launch();f.advance(300000);const arrival=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:arrival.confirmation});const nav=(await f.navigation()).ship;assert.equal(nav.journey,null);assert.equal(nav.moduleNeutralizations[0].remainingSeconds,600);assert.equal((await f.ship()).docked,true);
  // Owner/technician are moved together by explicit scene setup for the workshop check.
  await f.edit(`characters/${f.otherId}`,c=>({...c,spacePortId:'away'}));await assert.rejects(f.read('prepareModuleMandateOffer',{...f.input,moduleOperation:'REMOVE'},f.owner),{code:'SPACE_SHIP_BUSY'});f.advance(600000);assert.equal((await f.navigation()).ship.moduleNeutralizations.length,0);const q=await f.read('prepareModuleMandateOffer',{...f.input,moduleOperation:'REMOVE'},f.owner);assert.equal(q.install.seconds,300);
 });
 test(`${prefix} : nouvel événement sans module admissible retarde sans prolonger la panne`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.launch();const original=(await f.ship()).moduleNeutralizations;f.advance(300000);const arrival=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:arrival.confirmation});await f.startFlight({navigationCode:'HOME-CODE'});f.advance(180000);f.setDice([1,5,1,1]);await f.navCommand('finishSoPreparation');const sh=await f.ship();assert.equal(sh.journey.event.delaySeconds,300);assert.equal(sh.journey.event.neutralizedModule,undefined);assert.deepEqual(sh.moduleNeutralizations,original);assert.equal(sh.fuel,2);
 });
 test(`${prefix} : expiration entre aperçu et confirmation invalide le jeton sans débit`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.launch();f.advance(300000);const arrived=await f.navigation();await f.cmd('arriveShip',{shipId:'ship',confirmation:arrived.confirmation});await f.startFlight({navigationCode:'HOME-CODE'});f.advance(180000);const preview=await f.navigation();f.advance(420000);await assert.rejects(f.cmd('finishSoPreparation',{shipId:'ship',confirmation:preview.confirmation,present:true}),{code:'STALE_REVISION'});assert.equal((await f.ship()).fuel,4);assert.equal((await f.points()).reserved,1);f.setDie(6);await f.navCommand('finishSoPreparation');assert.equal((await f.navigation()).ship.profile.shieldMax,3);assert.equal((await f.ship()).shield,2);
 });
 test(`${prefix} : marqueur retiré avec panne enregistrée ne réinterprète pas les données`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.launch();await f.edit('',s=>{const {moduleFlightVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(f.navigation(),{code:'MODULE_FLIGHT_NOT_OPEN'});assert.equal((await f.ship()).moduleNeutralizations.length,1);
 });
 test(`${prefix} : convoi, un seul événement et seul appareil admissible affecté`,async()=>{
  const f=await equippedConvoy(makeStore);await f.depart();const a=await f.ship(),b=await f.get('ships/escort');assert.equal(a.journey.event.affectedShipId,'ship');assert.deepEqual(a.journey.event,b.journey.event);assert.equal(a.journey.arrivesAtGameMs,b.journey.arrivesAtGameMs);assert.equal(a.moduleNeutralizations.length,1);assert.equal(b.moduleNeutralizations,undefined);assert.equal(a.journey.event.delaySeconds,0);assert.equal(a.fuel,4);assert.equal(b.fuel,4);assert.equal((await f.navigation('escort',f.other)).ship.journey.event.neutralizedModule.lotId,undefined);
 });
 test(`${prefix} : retrait du marqueur, réserve étrangère ou lot détaché refuse le départ`,async()=>{
  const f=await moduleFlightFixture(makeStore),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),session=await f.get('');
  await f.edit('',s=>{const {moduleFlightVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});assert.equal((await f.navigation()).ship.moduleFlightBlocked,true);await assert.rejects(f.startFlight(),{code:'MODULE_FLIGHT_NOT_OPEN'});await f.edit('',()=>session);
  for(const patch of [{status:'FIELD_RESERVED',fieldActionId:'other'},{ownerId:f.otherId},{holderId:f.otherId},{location:{kind:'CHARACTER',id:f.cid}}]){await f.edit(`inventory/${lot.id}`,()=>({...lot,...patch}));await assert.rejects(f.startFlight(),{code:'MODULE_LOT_UNAVAILABLE'});}await f.edit(`inventory/${lot.id}`,()=>lot);assert.equal((await f.ship()).fuel,6);assert.equal((await f.points()).reserved,0);
 });
 test(`${prefix} : ultime confirmation revalide le lot sans débiter PA ni carburant`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.startFlight();f.advance(180000);await f.edit(`inventory/${f.sale.purchasedLotId}`,l=>({...l,status:'FIELD_RESERVED',fieldActionId:'other'}));await assert.rejects(f.navCommand('finishSoPreparation'),{code:'MODULE_LOT_UNAVAILABLE'});assert.equal((await f.ship()).journey,null);assert.equal((await f.ship()).fuel,6);assert.equal((await f.points()).reserved,1);
 });
 test(`${prefix} : réessai, course et révocation ne rejouent pas l’événement ou le PA`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.startFlight();f.advance(180000);f.setDice([1,5,1,1]);const q=await f.navigation(),input={shipId:'ship',confirmation:q.confirmation,present:true,requestId:randomUUID()},inputs=[input,{...input,requestId:randomUUID()}],results=await Promise.allSettled(inputs.map(p=>f.cmd('finishSoPreparation',p)));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const i=results.findIndex(x=>x.status==='fulfilled'),sh=await f.ship();assert.deepEqual(await f.cmd('finishSoPreparation',inputs[i]),results[i].value);assert.deepEqual(await f.ship(),sh);assert.equal((await f.points()).reserved,0);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('finishSoPreparation',inputs[i]),{code:'FORBIDDEN'});
 });
 test(`${prefix} : marqueur courant contrôlé avant un reçu de départ sans panne`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.startFlight();f.advance(180000);f.setDie(6);const q=await f.navigation(),input={shipId:'ship',confirmation:q.confirmation,present:true,requestId:randomUUID()};await f.cmd('finishSoPreparation',input);await f.edit('',s=>{const {moduleFlightVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(f.cmd('finishSoPreparation',input),{code:'MODULE_FLIGHT_NOT_OPEN'});
 });
 test(`${prefix} : rollback conserve les réserves, aucun départ ou effet partiel`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await moduleFlightFixture(()=>store);await f.startFlight();f.advance(180000);const before=await f.ship();fail=true;await assert.rejects(f.navCommand('finishSoPreparation'),/INTERRUPTION/);fail=false;assert.deepEqual(await f.ship(),before);assert.equal((await f.points()).reserved,1);assert.deepEqual(await f.store.list(`sessions/${f.sid}/voyages`),[]);
 });
 test(`${prefix} : neutralisation et événement conservés entre épisodes, aucune guérison ou redistribution`,async()=>{
  const f=await moduleFlightFixture(makeStore);await f.launch();f.advance(100000);const e=await episodeHarness(f),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),ship=await f.ship();await e.close();await e.resume(await e.begin());assert.equal((await e.get('')).spaceOutlaws.moduleFlightVersion,1);assert.deepEqual(await f.ship(),ship);assert.deepEqual(await e.get(`inventory/${lot.id}`),lot);const restored=(await e.read('shipNavigation',{shipId:'ship'},f.player)).ship;assert.equal(restored.moduleNeutralizations[0].remainingSeconds,800);
 });
 test(`${prefix} : ancien manifeste non enrichi, vol nu conservé mais vol équipé fermé`,async()=>{
  const f=await moduleInstallationFixture(makeStore),session=await f.get(''),path=`campaigns/${session.campaignId}/versions/${session.versionId}`,header=await f.store.get(path);assert.equal(header.moduleFlightVersion,1);
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  const g=await import('./space-outlaws-voyages-suite.mjs').then(m=>m.soVoyagesFixture(makeStore,{release:false})),out=await g.release(await g.releasePreview()),vp=`campaigns/${g.campaignId}/versions/${out.versionId}`;
  await g.store.runTransaction(async tx=>{const {moduleFlightVersion,manifestDigest,...old}=await tx.get(vp);tx.set(vp,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await g.birth(await g.birthPreview());assert.equal((await g.read('mySession')).session.spaceOutlaws.moduleFlightVersion,undefined);
 });
 test(`${prefix} : combat lit le profil neutralisé puis restaure le canon sans rendre les dégâts`,async()=>{
  const f=await encountersFixture(makeStore),module={lotId:'synthetic-heavy',code:'MOD-06',size:2,status:'OPERATIONAL'},time=(await f.ship()).journey.departedAtGameMs;await f.edit('ships/ship',x=>({...x,modules:[module],soProfile:installedShipProfile(x.soProfile,[module]),moduleNeutralizations:[{lotId:module.lotId,code:module.code,untilGameMs:time+180000}]}));await f.begin();await f.submit('ATTACK');f.setDie(4);const first=await f.resolve();assert.equal(first.result.shots[0].threshold,4);assert.equal(first.result.shots[0].damage,1);await f.submit('ATTACK');f.setDie(5);const second=await f.resolve();assert.equal(second.result.shots[0].threshold,5);assert.equal(second.result.shots[0].damage,2);assert.deepEqual((await f.ship()).modules,[module]);
 });
}
