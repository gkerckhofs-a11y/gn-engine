import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {moduleWorkFixture} from './space-module-work-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {convoyFixture} from './space-convoy-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {maintenancePlan} from '../../src/core/space-maintenance.mjs';

export async function moduleInstallationFixture(makeStore,options={}){
 const f=await moduleWorkFixture(makeStore,options);await f.start();
 const preview=(actor=f.other)=>f.read('prepareModuleInstallation',{mandateId:f.r.id},actor);
 const finish=async(patch={},actor=f.other)=>{const p=await preview(actor);return f.cmd('finishModuleInstallation',{mandateId:f.r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true,performed:true,...patch},actor);};
 const ready=()=>f.advance(options.code==='MOD-03'||options.code==='MOD-06'?900000:600000);
 return {...f,previewInstallation:preview,finish,ready};
}
export function moduleInstallationSuite(makeStore,prefix='Montage à quai SO'){
 test(`${prefix} : quatre modules, même exemplaire, maximums canoniques et aucun point actuel rendu`,async()=>{
  for(const code of ['MOD-01','MOD-02','MOD-03','MOD-06']){
   const f=await moduleWorkFixture(makeStore,{code});await f.edit('ships/ship',s=>({...s,hull:2,shield:1}));
   // Damage changed the proposal: prepare an explicit new consent before starting.
   await f.close(f.r);const r=await f.offer();await f.approve(r);const q=await f.read('prepareModuleWorkStart',{mandateId:r.id},f.other);await f.cmd('startModuleWork',{mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true},f.other);
   f.advance(code==='MOD-01'||code==='MOD-02'?600000:900000);const ship=await f.ship(),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),wallets=await f.store.list(`sessions/${f.sid}/accounts`),ledger=await f.store.list(`sessions/${f.sid}/ledger`);
   const p=await f.read('prepareModuleInstallation',{mandateId:r.id},f.other);assert.deepEqual(await f.ship(),ship);assert.equal((await f.points(f.other)).reserved,1);
   const out=await f.cmd('finishModuleInstallation',{mandateId:r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true,performed:true},f.other);assert.equal(out.status,'MODULE_INSTALLED');
   const after=await f.ship(),installed=await f.get(`inventory/${lot.id}`);assert.equal(after.hull,2);assert.equal(after.shield,1);assert.equal(after.soProfile.hullMax,4+Number(code==='MOD-02'));assert.equal(after.soProfile.shieldMax,2+Number(code==='MOD-01'));assert.equal(after.soProfile.maneuverability,1+Number(code==='MOD-03'));assert.equal(after.soProfile.weapon,code==='MOD-06'?'HEAVY':undefined);assert.equal(after.maintenanceId,null);assert.equal(after.modules[0].lotId,lot.id);assert.equal(installed.id,lot.id);assert.deepEqual(installed.item,lot.item);assert.equal(installed.ownerId,lot.ownerId);assert.equal(installed.quantity,1);assert.equal(installed.status,'INSTALLED');assert.deepEqual(installed.location,{kind:'SHIP_MODULE',id:'ship'});assert.equal(installed.fieldActionId,null);assert.equal((await f.points(f.other)).available,4);assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.get(`characters/${f.otherId}`)).activeMaintenanceId,null);
   assert.equal(maintenancePlan(after,code==='MOD-01'?'SHIELD':'HULL',1).points,1);assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),wallets);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ledger`),ledger);
  }
 });
 test(`${prefix} : délai réel de jeu et confirmation personnelle, propriétaire et MJ ne remplacent pas le Mécano`,async()=>{
  const f=await moduleInstallationFixture(makeStore);await assert.rejects(f.previewInstallation(),{code:'MODULE_WORK_NOT_READY'});f.ready();for(const actor of [f.owner,f.player])await assert.rejects(f.previewInstallation(actor),{code:'FORBIDDEN'});
  for(const patch of [{present:false},{workshopConfirmed:false},{performed:false}])await assert.rejects(f.finish(patch),{code:'FIELD_PRESENCE_REQUIRED'});await assert.rejects(f.finish({hull:999}),{code:'INVALID_ADMISSION'});assert.equal((await f.ship()).modules.length,0);assert.equal((await f.points(f.other)).reserved,1);
 });
 test(`${prefix} : PAUSE et STOP interdisent la finalisation, sans effet automatique`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();await f.stage('PAUSE');await assert.rejects(f.previewInstallation(),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'STOP'});await assert.rejects(f.previewInstallation(),{code:'SO_SAFETY_STOP'});assert.equal((await f.ship()).modules.length,0);assert.equal((await f.points(f.other)).reserved,1);
 });
 test(`${prefix} : réessai et course de confirmations consomment un seul PA`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();const p=await f.previewInstallation(),input={mandateId:f.r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true,performed:true,requestId:randomUUID()},inputs=[input,{...input,requestId:randomUUID()}],results=await Promise.allSettled(inputs.map(i=>f.cmd('finishModuleInstallation',i,f.other)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const winner=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('finishModuleInstallation',inputs[winner],f.other),results[winner].value);assert.equal((await f.ship()).modules.length,1);assert.equal((await f.points(f.other)).available,4);assert.equal((await f.points(f.other)).reserved,0);
 });
 test(`${prefix} : concurrence avec interruption choisit un seul état final`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();const p=await f.previewInstallation(),w=await f.work(),results=await Promise.allSettled([f.cmd('finishModuleInstallation',{mandateId:f.r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true,performed:true},f.other),f.cmd('cancelModuleWork',{mandateId:f.r.id,confirmation:w.confirmation,reason:'Renoncement'},f.other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const installed=(await f.ship()).modules.length===1;assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.points(f.other)).available,installed?4:5);assert.equal((await f.get(`inventory/${f.sale.purchasedLotId}`)).status,installed?'INSTALLED':'AVAILABLE');
 });
 test(`${prefix} : mutation du lot, gabarit, emplacement ou réservation bloque tout effet`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();const original=await f.ship(),lot=await f.get(`inventory/${f.sale.purchasedLotId}`);
  for(const patch of [{revision:original.revision+1},{modules:[{code:'MOD-01'}]},{soProfile:{...original.soProfile,id:'FIGHTER'}},{maintenanceId:'autre'}]){await f.edit('ships/ship',()=>({...original,...patch}));await assert.rejects(f.previewInstallation());assert.equal((await f.points(f.other)).reserved,1);}await f.edit('ships/ship',()=>original);
  await f.edit(`inventory/${lot.id}`,l=>({...l,ownerId:f.otherId}));await assert.rejects(f.previewInstallation(),{code:'MODULE_MANDATE_STALE'});assert.equal((await f.ship()).modules.length,0);
 });
 test(`${prefix} : compétence perdue, port quitté ou propriétaire mort ferme le montage mais pas la restitution MJ`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();const tech=await f.get(`characters/${f.otherId}`);await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[]}}));await assert.rejects(f.previewInstallation(),{code:'MODULE_TECH_REQUIRED'});await f.edit(`characters/${f.otherId}`,()=>tech);await f.edit(`characters/${f.otherId}`,c=>({...c,spacePortId:'away'}));await assert.rejects(f.previewInstallation(),{code:'MODULE_MANDATE_STALE'});await f.edit(`characters/${f.otherId}`,()=>tech);await f.edit(`characters/${f.cid}`,c=>({...c,survival:{dead:true}}));await assert.rejects(f.previewInstallation(),{code:'FORBIDDEN'});await f.cancel(f.owner);assert.equal((await f.ship()).modules.length,0);assert.equal((await f.points(f.other)).available,5);
 });
 test(`${prefix} : droits courants avant ancien reçu et marqueur obligatoire`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();const p=await f.previewInstallation(),input={mandateId:f.r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true,performed:true,requestId:randomUUID()};await f.cmd('finishModuleInstallation',input,f.other);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('finishModuleInstallation',input,f.other),{code:'FORBIDDEN'});
  const g=await moduleInstallationFixture(makeStore);g.ready();await g.edit('',s=>{const {hiddenCargoVersion,moduleFlightVersion,moduleRemovalVersion,moduleInstallationVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(g.previewInstallation(),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.equal((await g.work()).canFinish,false);await g.cancel();
 });
 test(`${prefix} : rollback conserve les trois réserves et permet le même réessai`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const out=await cb(tx);if(fail)throw Error('INTERRUPTION');return out;})};const f=await moduleInstallationFixture(()=>store);f.ready();const p=await f.previewInstallation(),input={mandateId:f.r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true,performed:true,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('finishModuleInstallation',input,f.other),/INTERRUPTION/);fail=false;assert.equal((await f.ship()).modules.length,0);assert.equal((await f.ship()).maintenanceId,f.r.id);assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.get(`inventory/${f.sale.purchasedLotId}`)).status,'FIELD_RESERVED');await f.cmd('finishModuleInstallation',input,f.other);assert.equal((await f.ship()).modules.length,1);
 });
 test(`${prefix} : ancien marqueur : module séparé du sac et de la soute, départ équipé et convoi refusés`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();await f.finish();await f.edit('',s=>{const {hiddenCargoVersion,moduleFlightVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});const bag=await f.read('myInventory'),nav=await f.navigation();assert.equal(bag.lots.some(l=>l.id===f.sale.purchasedLotId),false);assert.equal(bag.stored.length,0);assert.equal(bag.ownedElsewhere.some(l=>l.id===f.sale.purchasedLotId),false);assert.equal(bag.installed[0].id,f.sale.purchasedLotId);assert.equal(nav.ship.moduleFlightBlocked,true);assert.equal(nav.ship.modules[0].lotId,f.sale.purchasedLotId);await assert.rejects(f.startFlight(),{code:'MODULE_FLIGHT_NOT_OPEN'});await assert.rejects(f.read('prepareSoConvoy',{shipId:'ship',escortShipId:'none',navigationCode:'AWAY-CODE'}),{code:'MODULE_FLIGHT_NOT_OPEN'});
 });
 test(`${prefix} : partenaire équipé et ultime confirmation de convoi n’échappent pas au verrou de départ`,async()=>{
  const f=await convoyFixture(makeStore,{form:false});await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}`,s=await tx.get(path),{hiddenCargoVersion,moduleFlightVersion,...old}=s.spaceOutlaws;tx.set(path,{...s,spaceOutlaws:old});});const escort=await f.get('ships/escort');await f.edit('ships/escort',s=>({...s,modules:[{code:'MOD-01',size:2,status:'OPERATIONAL'}]}));await assert.rejects(f.propose(),{code:'MODULE_FLIGHT_NOT_OPEN'});await f.edit('ships/escort',()=>escort);await f.propose();await f.accept();await f.startFlight();await f.startFlight({shipId:'escort'},f.other);f.advance(180000);await f.navCommand('finishSoPreparation');await f.edit('ships/escort',s=>({...s,modules:[{code:'MOD-01',size:2,status:'OPERATIONAL'}]}));await assert.rejects(f.navCommand('finishSoPreparation',{shipId:'escort'},f.other),{code:'MODULE_FLIGHT_NOT_OPEN'});for(const id of ['ship','escort']){const ship=await f.get(`ships/${id}`);assert.equal(ship.journey,null);assert.equal(ship.fuel,6);}assert.equal((await f.points()).reserved,1);assert.equal((await f.points(f.other)).reserved,1);
 });
 test(`${prefix} : reprise d’épisode conserve le montage sans redistribution ni nouvelle dépense`,async()=>{
  const f=await moduleInstallationFixture(makeStore);f.ready();await f.finish();const ship=await f.ship(),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual(await f.ship(),ship);assert.deepEqual(await e.get(`inventory/${lot.id}`),lot);assert.equal((await e.get('')).spaceOutlaws.moduleInstallationVersion,1);assert.equal((await e.get(`characters/${f.otherId}`)).activeMaintenanceId,null);assert.equal((await e.get(`characters/${f.otherId}/resources/actionPoints`)).reserved,0);assert.equal((await e.get(`characters/${f.otherId}/resources/actionPoints`)).available,5);
 });
 test(`${prefix} : ancien manifeste conserve les travaux sans ouvrir la finalisation`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),out=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${out.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {hiddenCargoVersion,moduleFlightVersion,moduleRemovalVersion,moduleInstallationVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.moduleInstallationVersion,undefined);assert.equal((await f.read('mySession')).session.spaceOutlaws.moduleWorkVersion,1);await assert.rejects(f.read('prepareModuleInstallation',{mandateId:'none'}),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
}
