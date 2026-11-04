import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {newLot} from '../../src/core/inventory-state.mjs';
import {moduleItem} from './space-ship-module-catalog-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

// Native publication/ships/characters; capability, MOD-05 and damage below are
// synthetic closed-component setup, NOT a playable MOD-05 purchase/mount.
export async function towingWorkFixture(makeStore,options={}){
 const f=await soVoyagesFixture(makeStore,{profileId:options.profileId??'CARGO'}),get=p=>f.store.get(`sessions/${f.sid}${p?'/'+p:''}`),edit=(p,fn)=>f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}${p?'/'+p:''}`;tx.set(path,fn(await tx.get(path)));});
 await f.provision({shipId:'wreck',name:'Épave',ownerId:options.sameOwner?f.cid:f.otherId,pilotId:f.otherId});
 const moduleId='towing-module';await edit('',s=>({...s,spaceOutlaws:{...s.spaceOutlaws,towingWorkVersion:1}}));
 await edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,published:true,skills:[...c.abilityProfile.skills.filter(k=>k.id!=='MEC-02'),{id:'MEC-02',level:2}]}}));
 await edit('ships/ship',s=>({...s,moduleInstallationVersion:1,modules:[{lotId:moduleId,code:'MOD-05',size:s.soProfile.size,status:'OPERATIONAL'}]}));
 await edit('ships/wreck',s=>({...s,hull:0,shield:0,revisionRequired:true}));
 const ship=await f.ship(),lot={...newLot(moduleId,{...moduleItem,id:'towing-definition',shipModule:{code:'MOD-05',size:ship.soProfile.size}},1,f.cid,1,{kind:'SYNTHETIC_TOWING_COMPONENT'}),status:'INSTALLED',transferable:true,resellable:true,holderId:'ship',location:{kind:'SHIP_MODULE',id:'ship'}};
 await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/inventory/${moduleId}`,lot));
 const input={shipId:'ship',wreckId:'wreck',technicianId:f.otherId,present:true,source:'SECRET_PHYSICAL_TOWING_SETUP',reason:'Préparer le travail attesté'};
 const preview=(patch={})=>f.read('prepareTowingWork',{...input,...patch},f.owner),offer=async(patch={})=>f.cmd('offerTowingWork',{...input,...patch,confirmation:(await preview(patch)).confirmation},f.owner);
 const view=(r,actor=f.player)=>f.read(actor===f.owner?'towingWorkAdmin':'towingWork',{workId:r.id},actor);
 const approve=async(r,actor=f.player)=>{const p={workId:r.id},q=await f.read('prepareTowingApproval',p,actor);return f.cmd('approveTowingWork',{...p,confirmation:q.confirmation,present:true},actor);};
 const approved=async()=>{const r=await offer();await approve(r);if(!options.sameOwner)await approve(r,f.other);return r;};
 const start=async(r,patch={})=>{const p={workId:r.id},q=await f.read('prepareTowingStart',p,f.other);return f.cmd('startTowingWork',{...p,confirmation:q.confirmation,present:true,...patch},f.other);};
 const cancel=async(r,actor=f.other)=>{const p={workId:r.id},q=await view(r,actor);return f.cmd(actor===f.owner?'cancelTowingWorkAdmin':'cancelTowingWork',{...p,confirmation:q.confirmation,reason:'Interruption attestée'},actor);};
 return {...f,get,edit,input,moduleId,preview,offer,view,approve,approved,start,cancel};
}

export function towingWorkSuite(makeStore,prefix='Attelage préparatoire SO'){
 test(`${prefix} : fermé sans marqueur et dépendances, y compris avant un ancien reçu`,async()=>{
  const f=await towingWorkFixture(makeStore),session=await f.get(''),q=await f.preview(),p={...f.input,confirmation:q.confirmation,requestId:randomUUID()};await f.cmd('offerTowingWork',p,f.owner);
  for(const patch of [{towingWorkVersion:undefined},{towingWorkVersion:2},{moduleFlightVersion:undefined}]){await f.edit('',s=>({...s,spaceOutlaws:Object.fromEntries(Object.entries({...session.spaceOutlaws,...patch}).filter(([,v])=>v!==undefined))}));await assert.rejects(f.cmd('offerTowingWork',p,f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});}assert.equal((await f.ship()).maintenanceId??null,null);
 });
 test(`${prefix} : aperçu sans mutation, accord de chaque propriétaire et aucune appropriation`,async()=>{
  const f=await towingWorkFixture(makeStore),before=await f.ship(),wreck=await f.get('ships/wreck'),lot=await f.get(`inventory/${f.moduleId}`),q=await f.preview();assert.equal(q.seconds,300);assert.equal(q.level,2);assert.equal(q.actionPoints,1);assert.deepEqual(await f.get('shipMaintenance/nope'),null);assert.deepEqual(await f.ship(),before);
  const r=await f.offer();assert.equal((await f.view(r)).status,'TOWING_OFFERED');await f.approve(r);await assert.rejects(f.start(r),{code:'TOWING_OWNER_APPROVAL_REQUIRED'});await f.approve(r,f.other);assert.equal((await f.view(r)).status,'TOWING_APPROVED');assert.deepEqual(await f.ship(),before);assert.deepEqual(await f.get('ships/wreck'),wreck);assert.deepEqual(await f.get(`inventory/${f.moduleId}`),lot);assert.equal((await f.points(f.other)).reserved,0);assert.doesNotMatch(JSON.stringify(await f.view(r)),/SECRET_|binding|technicianVersion|lotRevision|source|assignedUid/);
 });
 test(`${prefix} : même propriétaire, un accord personnel suffit pour ses deux vaisseaux`,async()=>{
  const f=await towingWorkFixture(makeStore,{sameOwner:true}),r=await f.approved();assert.equal((await f.view(r)).status,'TOWING_APPROVED');await assert.rejects(f.approve(r,f.other),{code:'FORBIDDEN'});await f.start(r);assert.equal((await f.points(f.other)).reserved,1);
 });
 test(`${prefix} : attestation requise, champs de coût et résultat injectés refusés`,async()=>{
  const f=await towingWorkFixture(makeStore);for(const patch of [{seconds:0},{actionPoints:0},{ownerId:f.cid},{attached:true}])await assert.rejects(f.preview(patch),{code:'INVALID_ADMISSION'});await assert.rejects(f.preview({present:false}),{code:'FIELD_PRESENCE_REQUIRED'});
  const r=await f.approved();await assert.rejects(f.start(r,{present:false}),{code:'FIELD_PRESENCE_REQUIRED'});assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.ship()).maintenanceId??null,null);
 });
 test(`${prefix} : gabarit, épave à zéro Coque et remorqueur valide exigés`,async()=>{
  const f=await towingWorkFixture(makeStore),ship=await f.ship(),wreck=await f.get('ships/wreck');
  for(const patch of [{hull:1},{soProfile:{...wreck.soProfile,id:'TRANSPORT',size:3}},{portId:'away'},{combatId:'combat'},{maintenanceId:'other'},{enabled:false}]){await f.edit('ships/wreck',()=>({...wreck,...patch}));await assert.rejects(f.preview());}await f.edit('ships/wreck',()=>wreck);
  for(const patch of [{hull:0},{soProfile:{...ship.soProfile,id:'FIGHTER',size:1}},{revisionRequired:true},{convoy:{id:'c'}},{rescueId:'r'},{operation:{id:'o'}}]){await f.edit('ships/ship',()=>({...ship,...patch}));await assert.rejects(f.preview());}await f.edit('ships/ship',()=>ship);await assert.rejects(f.preview({wreckId:'ship'}),{code:'TOWING_SHIPS_BUSY'});
 });
 test(`${prefix} : lot monté réel et opérationnel requis, aucune calibration client`,async()=>{
  const f=await towingWorkFixture(makeStore),lot=await f.get(`inventory/${f.moduleId}`),ship=await f.ship();
  for(const patch of [{ownerId:f.otherId},{holderId:f.cid},{status:'AVAILABLE'},{quantity:2},{fieldActionId:'other'},{transferable:false},{location:{kind:'CHARACTER',id:f.cid}}]){await f.edit(`inventory/${f.moduleId}`,()=>({...lot,...patch}));await assert.rejects(f.preview(),{code:'MODULE_LOT_UNAVAILABLE'});}await f.edit(`inventory/${f.moduleId}`,()=>lot);
  await f.edit('ships/ship',s=>({...s,moduleNeutralizations:[{lotId:f.moduleId,untilGameMs:999999999}]}));await assert.rejects(f.preview(),{code:'TOWING_MODULE_UNAVAILABLE'});await f.edit('ships/ship',()=>({...ship,modules:[]}));await assert.rejects(f.preview(),{code:'TOWING_MODULE_REQUIRED'});
 });
 test(`${prefix} : niveau, présence, activité et transfert ouvert revalidés`,async()=>{
  const f=await towingWorkFixture(makeStore),tech=await f.get(`characters/${f.otherId}`);for(const patch of [{spacePortId:'away'},{activeCargoId:'busy'},{outOfCombat:true},{abilityProfile:{published:true,skills:[{id:'MEC-02',level:1}]}}]){await f.edit(`characters/${f.otherId}`,()=>({...tech,...patch}));await assert.rejects(f.preview());}await f.edit(`characters/${f.otherId}`,()=>tech);
  await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/cargoTransfers/open`,{id:'open',status:'LOADING',source:{kind:'HOLD',id:'wreck'},destination:{kind:'CHARACTER',id:f.cid}}));await assert.rejects(f.preview(),{code:'CARGO_TRANSFERS_OPEN'});
 });
 test(`${prefix} : deux réservations, cinq minutes sans attelage automatique ni débit de carburant`,async()=>{
  const f=await towingWorkFixture(makeStore),r=await f.approved(),ship=await f.ship(),wreck=await f.get('ships/wreck'),lot=await f.get(`inventory/${f.moduleId}`);await f.start(r);assert.equal((await f.ship()).maintenanceId,r.id);assert.equal((await f.get('ships/wreck')).maintenanceId,r.id);assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.points(f.other)).available,4);
  f.advance(299000);assert.equal((await f.view(r)).remainingSeconds,1);f.advance(1000);const v=await f.view(r);assert.equal(v.remainingSeconds,0);assert.equal(v.status,'TOWING_ACTIVE');assert.equal(v.canFinish,false);assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.ship()).fuel,ship.fuel);assert.equal((await f.ship()).hull,ship.hull);assert.equal((await f.get('ships/wreck')).hull,wreck.hull);assert.equal((await f.get('ships/wreck')).ownerId,wreck.ownerId);assert.deepEqual(await f.get(`inventory/${f.moduleId}`),lot);assert.deepEqual(await f.store.list(`sessions/${f.sid}/voyages`),[]);
  await assert.rejects(f.cmd('cancelSpaceMaintenanceAdmin',{maintenanceId:r.id,confirmation:'not-a-maintenance-job',reason:'Confusion de dossier'},f.owner),{code:'FORBIDDEN'});
 });
 test(`${prefix} : pause et STOP figent le délai, interruption libère les réservations`,async()=>{
  const f=await towingWorkFixture(makeStore),r=await f.approved();await f.start(r);f.advance(10000);await f.stage('PAUSE');f.advance(1000000);assert.equal((await f.view(r)).remainingSeconds,290);await f.cmd('stopSafety',{reason:'STOP'});f.advance(1000000);assert.equal((await f.view(r)).remainingSeconds,290);await assert.rejects(f.cancel(r),{code:'SO_SAFETY_STOP'});await f.cmd('resumeSafety',{revision:(await f.get('')).revision,reason:'Fin STOP'},f.owner);await f.cancel(r);assert.equal((await f.ship()).maintenanceId??null,null);assert.equal((await f.get('ships/wreck')).maintenanceId??null,null);assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.points(f.other)).available,5);
 });
 test(`${prefix} : instantané périmé et propriété changée ferment le démarrage`,async()=>{
  const f=await towingWorkFixture(makeStore),r=await f.approved();await f.edit('ships/wreck',s=>({...s,revision:s.revision+1}));await assert.rejects(f.start(r),{code:'TOWING_WORK_STALE'});assert.equal((await f.points(f.other)).reserved,0);await f.cancel(r,f.owner);assert.equal((await f.view(r)).status,'TOWING_CANCELLED');
 });
 test(`${prefix} : double clic, concurrence et proposition unique ne doublent pas le PA`,async()=>{
  const f=await towingWorkFixture(makeStore),r=await f.approved();await assert.rejects(f.offer(),{code:'TOWING_WORK_OPEN'});const q=await f.read('prepareTowingStart',{workId:r.id},f.other),p={workId:r.id,confirmation:q.confirmation,present:true,requestId:randomUUID()},inputs=[p,{...p,requestId:randomUUID()}],results=await Promise.allSettled(inputs.map(p=>f.cmd('startTowingWork',p,f.other)));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const winner=results.findIndex(x=>x.status==='fulfilled');assert.deepEqual(await f.cmd('startTowingWork',inputs[winner],f.other),results[winner].value);assert.equal((await f.points(f.other)).reserved,1);
  await f.edit('ships/wreck',s=>({...s,ownerId:f.cid}));await assert.rejects(f.cmd('startTowingWork',inputs[winner],f.other),{code:'TOWING_WORK_STALE'});
 });
 test(`${prefix} : révocation avant reçu, annulation MJ sans remplacement du Mécano`,async()=>{
  const f=await towingWorkFixture(makeStore),r=await f.approved(),q=await f.read('prepareTowingStart',{workId:r.id},f.other),p={workId:r.id,confirmation:q.confirmation,present:true,requestId:randomUUID()};await f.cmd('startTowingWork',p,f.other);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('startTowingWork',p,f.other),{code:'FORBIDDEN'});await assert.rejects(f.read('prepareTowingStart',{workId:r.id},f.owner),{code:'FORBIDDEN'});await f.cancel(r,f.owner);assert.equal((await f.get('ships/wreck')).maintenanceId??null,null);assert.equal((await f.get(`characters/${f.otherId}/resources/actionPoints`)).reserved,0);
 });
 test(`${prefix} : rollback du démarrage ne laisse ni verrou ni PA réservé`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('TOWING_INTERRUPTION');return r;})},f=await towingWorkFixture(()=>store),r=await f.approved(),ship=await f.ship();fail=true;await assert.rejects(f.start(r),/TOWING_INTERRUPTION/);fail=false;assert.deepEqual(await f.ship(),ship);assert.equal((await f.get('ships/wreck')).maintenanceId??null,null);assert.equal((await f.points(f.other)).reserved,0);await f.start(r);assert.equal((await f.points(f.other)).reserved,1);
 });
 test(`${prefix} : clôture bloquée par les deux vaisseaux et le travail, annulation idempotente`,async()=>{
  const f=await towingWorkFixture(makeStore),r=await f.approved();await f.start(r);const e=await episodeHarness(f);await e.stage('PAUSE');const q=await e.read('prepareCampaignClosure',e.closeInput());assert.equal(q.canClose,false);assert.ok(q.blocks.some(b=>b.kind==='SHIP_OPERATION'));assert.ok(q.blocks.some(b=>b.kind==='CHARACTER_OPERATION'));
  const v=await f.view(r,f.owner),p={workId:r.id,confirmation:v.confirmation,reason:'Fin du travail',requestId:randomUUID()},out=await f.cmd('cancelTowingWorkAdmin',p,f.owner);assert.deepEqual(await f.cmd('cancelTowingWorkAdmin',p,f.owner),out);assert.equal((await f.points(f.other)).available,5);assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.ship()).maintenanceId,null);assert.equal((await f.get('ships/wreck')).maintenanceId,null);
 });

}
