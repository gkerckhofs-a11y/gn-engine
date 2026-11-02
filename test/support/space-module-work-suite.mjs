import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {moduleMandateFixture} from './space-module-mandates-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {actionPointPath} from '../../src/core/action-point-state.mjs';

export async function moduleWorkFixture(makeStore,options={}){
 const f=await moduleMandateFixture(makeStore,options),r=await f.offer();await f.approve(r);
 const preview=(actor=f.other)=>f.read('prepareModuleWorkStart',{mandateId:r.id},actor);
 const start=async(patch={},actor=f.other)=>{const q=await preview(actor);return f.cmd('startModuleWork',{mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,...patch},actor);};
 const work=(actor=f.other)=>f.read(actor===f.owner?'moduleWorkAdmin':'moduleWork',{mandateId:r.id},actor);
 const cancel=async(actor=f.other,patch={})=>{const q=await work(actor);return f.cmd(actor===f.owner?'cancelModuleWorkAdmin':'cancelModuleWork',{mandateId:r.id,confirmation:q.confirmation,reason:'Interruption explicite',...patch},actor);};
 return {...f,r,preview,start,work,cancel};
}
export function moduleWorkSuite(makeStore,prefix='Travaux modules SO'){
 test(`${prefix} : aperçu sans effet et démarrage personnel atomique, 1 PA réservé`,async()=>{
  const f=await moduleWorkFixture(makeStore),ship=await f.ship(),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),wallets=await f.store.list(`sessions/${f.sid}/accounts`),ledger=await f.store.list(`sessions/${f.sid}/ledger`),points=await f.points(f.other);
  const p=await f.preview();assert.equal(p.after.reserved,1);assert.equal((await f.points(f.other)).reserved,0);assert.deepEqual(await f.ship(),ship);
  const r=await f.start();assert.equal(r.status,'MODULE_ACTIVE');assert.deepEqual(await f.ship(),{...ship,maintenanceId:r.id,revision:ship.revision+1});assert.deepEqual(await f.get(`inventory/${lot.id}`),{...lot,status:'FIELD_RESERVED',fieldActionId:r.id,revision:lot.revision+1});
  const pa=await f.points(f.other);assert.equal(pa.available,points.available-1);assert.equal(pa.reserved,1);assert.equal((await f.get(`characters/${f.otherId}`)).activeMaintenanceId,r.id);
  assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),wallets);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ledger`),ledger);assert.deepEqual((await f.read('spaceMaintenance',{},f.other)).jobs,[]);
 });
 test(`${prefix} : propriétaire ou MJ ne démarre pas à la place du Mécano, présences exigées`,async()=>{
  const f=await moduleWorkFixture(makeStore);for(const actor of [f.player,f.owner])await assert.rejects(f.preview(actor),{code:'FORBIDDEN'});
  for(const patch of [{present:false},{workshopConfirmed:false}])await assert.rejects(f.start(patch),{code:'FIELD_PRESENCE_REQUIRED'});assert.equal((await f.points(f.other)).reserved,0);
  const q=await f.preview();await assert.rejects(f.cmd('startModuleWork',{mandateId:f.r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,seconds:0},f.other),{code:'INVALID_ADMISSION'});await assert.rejects(f.read('prepareModuleWorkStart',{},f.other),{code:'INVALID_ID'});
 });
 test(`${prefix} : accord périmé, compétence perdue et PA insuffisant ne réservent rien`,async()=>{
  const f=await moduleWorkFixture(makeStore),tech=await f.get(`characters/${f.otherId}`);await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[]}}));await assert.rejects(f.preview(),{code:'MODULE_MANDATE_STALE'});await f.edit(`characters/${f.otherId}`,()=>tech);
  const path=actionPointPath(f.sid,f.otherId),pa=await f.store.get(path);await f.store.runTransaction(async tx=>tx.set(path,{...pa,available:0,reserved:0}));await assert.rejects(f.preview(),{code:'NOT_ENOUGH_ACTION_POINTS'});assert.equal((await f.ship()).maintenanceId,undefined);assert.equal((await f.get(`inventory/${f.sale.purchasedLotId}`)).status,'AVAILABLE');
 });
 test(`${prefix} : un seul démarrage concurrent et réessai sans doubler la réserve`,async()=>{
  const f=await moduleWorkFixture(makeStore),q=await f.preview(),p={mandateId:f.r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,requestId:randomUUID()},inputs=[p,{...p,requestId:randomUUID()}],results=await Promise.allSettled(inputs.map(p=>f.cmd('startModuleWork',p,f.other)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const winner=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('startModuleWork',inputs[winner],f.other),results[winner].value);assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.points(f.other)).available,4);
 });
 test(`${prefix} : durées canoniques, pause et STOP figent le délai, aucun montage automatique`,async()=>{
  for(const [code,seconds]of [['MOD-01',600],['MOD-03',900]]){
   const f=await moduleWorkFixture(makeStore,{code});await f.start();assert.equal((await f.work()).remainingSeconds,seconds);f.advance(10000);await f.stage('PAUSE');const remaining=(await f.work()).remainingSeconds;f.advance(999999);assert.equal((await f.work()).remainingSeconds,remaining);await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'STOP'});const stopped=(await f.work()).remainingSeconds;f.advance(999999);assert.equal((await f.work()).remainingSeconds,stopped);assert.equal((await f.work()).canCancel,false);
   const s=await f.read('session',{},f.owner);await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);f.advance(seconds*1000);assert.equal((await f.work()).remainingSeconds,0);assert.equal((await f.ship()).modules.length,0);assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.get(`inventory/${f.sale.purchasedLotId}`)).status,'FIELD_RESERVED');await f.cancel();
  }
 });
 test(`${prefix} : annulation par propriétaire ou Mécano restitue le même exemplaire et son PA`,async()=>{
  for(const role of ['owner','tech']){const f=await moduleWorkFixture(makeStore),lot=await f.get(`inventory/${f.sale.purchasedLotId}`);await f.start();f.advance(role==='owner'?6*3600000:900000);const actor=role==='owner'?f.player:f.other;assert.equal((await f.cancel(actor)).status,'MODULE_CANCELLED');const restored=await f.get(`inventory/${lot.id}`);assert.deepEqual(restored.item,lot.item);assert.equal(restored.ownerId,lot.ownerId);assert.equal(restored.quantity,1);assert.equal(restored.status,'AVAILABLE');assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.points(f.other)).available,5);assert.equal((await f.ship()).maintenanceId,null);assert.equal((await f.get(`characters/${f.otherId}`)).activeMaintenanceId,null);}
 });
 test(`${prefix} : décès ou révocation ne bloque pas la restitution MJ, STOP bloque un nouvel effet`,async()=>{
  const f=await moduleWorkFixture(makeStore);await f.start();await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await f.edit(`characters/${f.cid}`,c=>({...c,survival:{dead:true}}));await f.cmd('stopSafety',{reason:'Sécurité'});await assert.rejects(f.cancel(f.owner),{code:'SO_SAFETY_STOP'});const s=await f.read('session',{},f.owner);await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);await f.cancel(f.owner);assert.equal((await f.ship()).maintenanceId,null);assert.equal((await f.store.get(actionPointPath(f.sid,f.otherId))).reserved,0);
 });
 test(`${prefix} : réservation incohérente refuse une libération partielle ou d’un autre travail`,async()=>{
  const f=await moduleWorkFixture(makeStore);await f.start();await f.edit('ships/ship',s=>({...s,maintenanceId:'autre'}));const pa=await f.points(f.other),lot=await f.get(`inventory/${f.sale.purchasedLotId}`);await assert.rejects(f.work(f.owner),{code:'MODULE_WORK_RESERVATION'});assert.deepEqual(await f.points(f.other),pa);assert.deepEqual(await f.get(`inventory/${lot.id}`),lot);
 });
 test(`${prefix} : verrous natifs bloquent navigation, activité du Mécano et clôture`,async()=>{
  const f=await moduleWorkFixture(makeStore);await f.start();await assert.rejects(f.read('prepareSoShipName',{shipId:'ship',name:'Changement'}),{code:'SPACE_SHIP_BUSY'});const e=await episodeHarness(f);await e.stage('PAUSE');const q=await e.read('prepareCampaignClosure',e.closeInput());assert.equal(q.canClose,false);assert.ok(q.blocks.some(b=>b.kind==='SHIP_OPERATION'));assert.ok(q.blocks.some(b=>b.kind==='CHARACTER_OPERATION'));assert.ok(q.blocks.some(b=>b.kind==='RESERVED_STOCK'));await f.cancel(f.owner);
 });
 test(`${prefix} : interruption transactionnelle au démarrage et à l’annulation ne laisse rien de partiel`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail)throw Error('INTERRUPTION');return result;})};const f=await moduleWorkFixture(()=>store),q=await f.preview(),input={mandateId:f.r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('startModuleWork',input,f.other),/INTERRUPTION/);fail=false;assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.ship()).maintenanceId,undefined);await f.cmd('startModuleWork',input,f.other);fail=true;await assert.rejects(f.cancel(f.owner),/INTERRUPTION/);fail=false;assert.equal((await f.points(f.other)).reserved,1);assert.equal((await f.ship()).maintenanceId,f.r.id);await f.cancel(f.owner);
 });
 test(`${prefix} : reçus et marqueur restent soumis aux droits courants`,async()=>{
  const f=await moduleWorkFixture(makeStore),q=await f.preview(),p={mandateId:f.r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,requestId:randomUUID()};await f.cmd('startModuleWork',p,f.other);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('startModuleWork',p,f.other),{code:'FORBIDDEN'});await f.cancel(f.owner);
  const g=await moduleWorkFixture(makeStore);await g.edit('',s=>{const {moduleWorkVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(g.preview(),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : ancien manifeste garde l’accord préparatoire sans démarrage implicite`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),out=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${out.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {moduleWorkVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.moduleWorkVersion,undefined);assert.equal((await f.read('mySession')).session.spaceOutlaws.moduleMandatesVersion,1);await assert.rejects(f.read('prepareModuleWorkStart',{mandateId:'none'}),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
}
