import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {installationFixture} from './space-installation-suite.mjs';
import {nativeTechnicalFixture} from './space-technical-native-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {fieldAdminHtml,fieldTargetHtml} from '../../web/field-actions.mjs';
export async function installationRepairFixture(makeStore,{damage=true}={}){
 const f=await installationFixture(makeStore),get=p=>f.store.get(`${f.base}/${p}`),edit=(p,fn)=>f.store.runTransaction(async tx=>{const path=p?`${f.base}/${p}`:f.base;tx.set(path,fn(await tx.get(path)));});
 await edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='MEC-02'?{...k,level:2}:k)}}));await edit(`inventory/${f.lot.id}`,l=>({...l,quantity:8}));
 const config={targetId:'generator',revision:0,minLevel:2,threshold:6,partsItemId:'kit_repair-supplies',bonusItems:[],reason:'Conditions techniques préparées'};
 await f.actionCmd('configureInstallationRepair',config,f.owner);
 const damageNow=async()=>f.actionCmd('damageInstallation',{targetId:'generator',revision:(await get('fieldStates/generator')).revision,reason:'Incident durable joué'},f.owner);if(damage)await damageNow();
 const input={targetId:'generator',kind:'REPAIR_DURABLE',consumableLotId:f.lot.id},prepare=()=>f.actionRead('prepareFieldAction',input),start=async()=>{const p=await prepare();return f.actionCmd('startFieldAction',{...input,confirmation:p.confirmation,present:true});};
 return {...f,get,edit,config,input,damageNow,prepareRepair:prepare,startRepair:start};
}
export function installationRepairSuite(makeStore,prefix='Pannes durables d’installations'){
 test(`${prefix} : cinq minutes, deux pièces et un PA, réparation unique sans soin`,async()=>{
  const f=await installationRepairFixture(makeStore);f.setDie(6);const before=await f.get(`characters/${f.cid}`),p=await f.prepareRepair();assert.equal(p.durationSeconds,300);assert.equal(p.cost,1);const a=await f.startRepair();await assert.rejects(f.finishInstallation(a),{code:'FIELD_TOO_EARLY'});f.advance(300000);const input={actionId:a.id,present:true,requestId:randomUUID()},r=await f.actionCmd('finishFieldAction',input);assert.equal(r.result.success,true);assert.deepEqual(await f.actionCmd('finishFieldAction',input),r);assert.equal((await f.get(`inventory/${f.lot.id}`)).quantity,6);assert.equal((await f.points()).available,4);assert.equal((await f.get('fieldStates/generator')).durableFailure,null);assert.equal((await f.target()).target.status,'ONLINE');assert.equal((await f.get(`characters/${f.cid}`)).hp,before.hp);assert.equal((await f.get(`characters/${f.cid}`)).protection,before.protection);
 });
 test(`${prefix} : échec consomme pièces et PA, récupération sans verrou de sabotage inventé`,async()=>{
  const f=await installationRepairFixture(makeStore),failure=(await f.get('fieldStates/generator')).durableFailure;f.setDie(1);const a=await f.startRepair();f.advance(300000);assert.equal((await f.finishInstallation(a)).result.success,false);assert.deepEqual((await f.get('fieldStates/generator')).durableFailure,failure);assert.equal((await f.get(`inventory/${f.lot.id}`)).quantity,6);assert.equal((await f.get('fieldStates/generator')).lockedUntilGameMs,0);await assert.rejects(f.prepareRepair(),{code:'COOLDOWN_ACTIVE'});f.advance(600000);f.setDie(6);const b=await f.startRepair();f.advance(300000);await f.finishInstallation(b);assert.equal((await f.get(`inventory/${f.lot.id}`)).quantity,4);
 });
 test(`${prefix} : lever le sabotage ne répare pas la panne ; réparer ne lève pas le sabotage`,async()=>{
  for(const temporaryFirst of [true,false]){
   const f=await installationRepairFixture(makeStore,{damage:false});f.setDie(6);const sabotage=await f.startInstallation();f.advance(300000);await f.finishInstallation(sabotage);await f.damageNow();const deadline=(await f.get('fieldStates/generator')).offlineUntilGameMs;
   if(temporaryFirst){const a=await f.startInstallation('REPAIR',f.other);f.advance(180000);await f.finishInstallation(a,f.other);assert.equal((await f.target()).target.status,'OFFLINE');assert.ok((await f.get('fieldStates/generator')).durableFailure);assert.equal((await f.get('fieldStates/generator')).offlineUntilGameMs,null);}
   const b=await f.startRepair();f.advance(300000);await f.finishInstallation(b);assert.equal((await f.get('fieldStates/generator')).durableFailure,null);assert.equal((await f.target()).target.status,temporaryFirst?'ONLINE':'OFFLINE');if(!temporaryFirst){assert.equal((await f.get('fieldStates/generator')).offlineUntilGameMs,deadline);f.advance(600000);const view=await f.target();assert.equal(view.target.status,'ONLINE');assert.equal(view.protectedMs,900000);}
  }
 });
 test(`${prefix} : expiration du sabotage conserve l’avarie et permet seulement sa réparation`,async()=>{
  const f=await installationRepairFixture(makeStore,{damage:false});f.setDie(6);const a=await f.startInstallation();f.advance(300000);await f.finishInstallation(a);await f.damageNow();f.advance(1800000);assert.equal((await f.target()).target.status,'OFFLINE');assert.equal((await f.target()).target.durableFailure,true);await assert.rejects(f.startInstallation('REPAIR'),{code:'FIELD_STATE_CHANGED'});assert.equal((await f.prepareRepair()).durationSeconds,300);
 });
 test(`${prefix} : droits, version, interruption et ancienne session`,async()=>{
  const f=await installationRepairFixture(makeStore),pa=await f.points();await assert.rejects(f.actionCmd('configureInstallationRepair',{...f.config,revision:1}),{code:'FORBIDDEN'});await assert.rejects(f.actionCmd('configureInstallationRepair',{...f.config,revision:0},f.owner),{code:'STALE_REVISION'});await assert.rejects(f.actionCmd('configureInstallationRepair',{...f.config,revision:1,partsItemId:'absent'},f.owner),{code:'FIELD_REFERENCE'});
  const a=await f.startRepair();await assert.rejects(f.actionCmd('configureInstallationRepair',{...f.config,revision:1},f.owner),{code:'FIELD_UNAVAILABLE'});await f.edit('installationRepairProfiles/generator',p=>({...p,revision:p.revision+1}));f.advance(300000);await assert.rejects(f.finishInstallation(a),{code:'FIELD_STATE_CHANGED'});await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Conditions changées'});assert.equal((await f.points()).available,pa.available);assert.equal((await f.get(`inventory/${f.lot.id}`)).quantity,8);await f.edit('',s=>{const {installationRepairVersion,...flags}=s.spaceOutlaws;return {...s,spaceOutlaws:flags};});await assert.rejects(f.prepareRepair(),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : concurrence, révocation, annulation MJ et épisode sans réparation gratuite`,async()=>{
  const f=await installationRepairFixture(makeStore),q=await f.prepareRepair(),input={...f.input,confirmation:q.confirmation,present:true},results=await Promise.allSettled([f.actionCmd('startFieldAction',input),f.actionCmd('startFieldAction',input)]),a=results.find(r=>r.status==='fulfilled').value;assert.equal(results.filter(r=>r.status==='fulfilled').length,1);await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.finishInstallation(a),{code:'FORBIDDEN'});await f.actionCmd('cancelFieldActionMJ',{actionId:a.id,reason:'Accès révoqué'},f.owner);assert.equal((await f.get(`characters/${f.cid}/resources/actionPoints`)).reserved,0);assert.equal((await f.get(`inventory/${f.lot.id}`)).quantity,8);
  const e=await episodeHarness(f);await e.stage('PAUSE');await e.close();await e.resume(await e.begin());assert.ok((await e.get('fieldStates/generator')).durableFailure);assert.equal((await e.get('installationRepairProfiles/generator')).profile.consumable.quantity,2);
 });
 test(`${prefix} : diagnostic et interfaces distinguent les deux remises en état`,async()=>{
  const f=await installationRepairFixture(makeStore),admin=await f.actionRead('fieldAdmin',{},f.owner);assert.match(fieldAdminHtml(admin),/Pannes durables d’installations/);const view=await f.target();assert.match(fieldTargetHtml(view),/Réparer la panne durable/);assert.doesNotMatch(JSON.stringify(view),/Conditions techniques préparées|Incident durable joué/);
  const d=await nativeTechnicalFixture(makeStore,{kind:'INSTALLATION',level:2});await d.actionCmd('configureInstallationRepair',{targetId:'switch',revision:0,minLevel:2,threshold:6,partsItemId:'parts25',bonusItems:[],reason:'Conditions préparées'},d.owner);await d.actionCmd('damageInstallation',{targetId:'switch',revision:(await d.get('fieldStates/switch')).revision,reason:'Panne distincte'},d.owner);const a=await d.startDiagnostic();d.advance(60000);const r=await d.finishDiagnostic(a);assert.match(JSON.stringify(r.result.technical.rows),/Panne durable/);const repairs=r.result.technical.interventions;assert.ok(repairs.some(p=>p.seconds===300&&p.supplies?.quantity===2));assert.ok(repairs.some(p=>p.seconds===180));
 });
}
