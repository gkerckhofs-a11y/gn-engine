import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {installationProfiles,validSoInstallation} from '../../src/shared/space-installation.mjs';
import {actionMenuItems} from '../../web/player-action-menu.mjs';
import {centralFieldTargetPayload} from '../../web/central-field-targets.mjs';
import {soReleaseDefinitionChecks} from '../../src/core/space-outlaws-release-check.mjs';
export const installationTarget=(minLevel=1)=>({kind:'INSTALLATION',title:'Générateur fictif',description:'Éclairage fictif hors service pendant la panne.',gmNotes:'SECRET_INSTALLATION',profiles:installationProfiles({minLevel,kitId:'kit_repair-supplies'}),rewards:[],dependencyId:null,offlineSeconds:900,failureLockSeconds:300,repairProtectionSeconds:900});
async function fixture(makeStore,{level=2,minLevel=1}={}){
 const f=await actionsFixture(makeStore,{classId:'MEC',helper:true,release:false});
 await f.cc('saveCentralFieldTarget',{fieldTargetId:'generator',fieldTargetRevision:0,draftRevision:(await f.view()).draft.revision,fieldTarget:installationTarget(minLevel),reason:'Installation A15 de recette'});
 const p=await f.releasePreview();assert.deepEqual(p.blockers,[]);await f.release(p);await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});await f.stage('EN_JEU');
 const me=await f.actionRead('mySession'),other=await f.actionRead('mySession',{},f.other),base=`sessions/${f.sid}`;
 await f.store.runTransaction(async tx=>{const c=await tx.get(`${base}/characters/${me.character.id}`);tx.set(`${base}/characters/${c.id}`,{...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'SABOTAGE',name:'Sabotage acquis pour recette',kind:'PASSIVE',level}]}});});
 const lot=(await f.store.list(`${base}/inventory`)).find(l=>l.holderId===me.character.id&&l.item.id==='kit_repair-supplies');
 const input=(kind='SABOTAGE')=>({targetId:'generator',kind,...(kind==='SABOTAGE'?{consumableLotId:lot.id}:{})});
 const start=async(kind='SABOTAGE',actor=f.player)=>{const i=input(kind),p=await f.actionRead('prepareFieldAction',i,actor);return f.actionCmd('startFieldAction',{...i,confirmation:p.confirmation,present:true},actor);};
 const finish=(a,actor=f.player)=>f.actionCmd('finishFieldAction',{actionId:a.id,present:true},actor);
 return {...f,base,cid:me.character.id,tid:other.character.id,lot,input,startInstallation:start,finishInstallation:finish,target:()=>f.actionRead('fieldTarget',{targetId:'generator'})};
}
export function installationSuite(makeStore,prefix='Installations A15'){
 test(`${prefix} : sabotage puis remise en service native, coûts séparés, aucun soin`,async()=>{
  const f=await fixture(makeStore);f.setDie(6);const before=await f.store.get(`${f.base}/characters/${f.tid}`),a=await f.startInstallation();assert.equal(a.remainingMs,300000);f.advance(299999);await assert.rejects(f.finishInstallation(a),{code:'FIELD_TOO_EARLY'});f.advance(1);await f.finishInstallation(a);await f.finishInstallation(a);assert.equal((await f.points()).available,4);assert.equal((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).quantity,1);assert.equal((await f.store.get(`${f.base}/fieldStates/generator`)).status,'OFFLINE');
  const b=await f.startInstallation('REPAIR',f.other);assert.equal(b.remainingMs,180000);f.advance(180000);await f.finishInstallation(b,f.other);assert.equal((await f.points(f.other)).available,4);const after=await f.store.get(`${f.base}/characters/${f.tid}`);assert.equal(after.hp,before.hp);assert.equal(after.protection,before.protection);assert.equal((await f.store.get(`${f.base}/fieldStates/generator`)).status,'ONLINE');f.advance(600000);await assert.rejects(f.startInstallation(),{code:'FIELD_TARGET_LOCKED'});
  const items=actionMenuItems(await f.actionRead('mySession'));assert.ok(items.some(i=>i.id==='SABOTAGE'));assert.ok(items.some(i=>i.id==='MEC-02-restart'));assert.doesNotMatch(JSON.stringify(await f.target()),/SECRET_INSTALLATION/);
 });
 test(`${prefix} : expiration automatique avec protection calculée depuis la vraie fin de panne`,async()=>{
  const f=await fixture(makeStore);f.setDie(6);const a=await f.startInstallation();f.advance(300000);await f.finishInstallation(a);f.advance(900000);await assert.rejects(f.startInstallation(),{code:'FIELD_TARGET_LOCKED'});f.advance(899999);await assert.rejects(f.startInstallation(),{code:'FIELD_TARGET_LOCKED'});f.advance(1);const b=await f.startInstallation();assert.equal(b.status,'ACTIVE');
 });
 test(`${prefix} : échec consomme kit et PA, verrou cinq minutes et récupération dix minutes`,async()=>{
  const f=await fixture(makeStore);const a=await f.startInstallation();f.advance(300000);const r=await f.finishInstallation(a);assert.equal(r.result.success,false);assert.equal((await f.points()).available,4);assert.equal((await f.store.get(`${f.base}/inventory/${f.lot.id}`)).quantity,1);await assert.rejects(f.startInstallation(),{code:'FIELD_TARGET_LOCKED'});f.advance(300000);await assert.rejects(f.startInstallation(),{code:'COOLDOWN_ACTIVE'});f.advance(300000);assert.equal((await f.startInstallation()).status,'ACTIVE');
 });
 test(`${prefix} : niveau, ancienne session, concurrence et interruption sans effet ni perte`,async()=>{
  const f=await fixture(makeStore,{level:1,minLevel:2});await assert.rejects(f.startInstallation(),{code:'FIELD_SKILL_REQUIRED'});await assert.rejects(f.startInstallation('SABOTAGE',f.other),{code:'FIELD_SKILL_REQUIRED'});
  const g=await fixture(makeStore),i=g.input(),p=await g.actionRead('prepareFieldAction',i);const r=await Promise.allSettled([1,2].map(()=>g.actionCmd('startFieldAction',{...i,confirmation:p.confirmation,present:true})));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);const a=r.find(x=>x.status==='fulfilled').value;await g.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Interruption avant le jet'});assert.equal((await g.points()).available,5);assert.equal((await g.store.get(`${g.base}/inventory/${g.lot.id}`)).quantity,2);
  await g.store.runTransaction(async tx=>{const s=await tx.get(g.base);const {sabotageVersion,...flags}=s.spaceOutlaws;tx.set(g.base,{...s,spaceOutlaws:flags});});await assert.rejects(g.startInstallation(),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : pause, changement de cible et révocation ne permettent pas une résolution périmée`,async()=>{
  const f=await fixture(makeStore);const a=await f.startInstallation();await f.stage('PAUSE');f.advance(300000);await assert.rejects(f.finishInstallation(a),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await assert.rejects(f.finishInstallation(a),{code:'FIELD_TOO_EARLY'});f.advance(300000);
  await f.store.runTransaction(async tx=>{const p=`${f.base}/fieldTargets/generator`,t=await tx.get(p);tx.set(p,{...t,revision:t.revision+1});});await assert.rejects(f.finishInstallation(a),{code:'FIELD_STATE_CHANGED'});await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Cible modifiée'});assert.equal((await f.points()).available,5);
  const g=await fixture(makeStore),b=await g.startInstallation();g.advance(300000);await g.actionCmd('revokeAccess',{uid:g.player.uid},g.owner);await assert.rejects(g.finishInstallation(b),{code:'FORBIDDEN'});await g.actionCmd('cancelFieldActionMJ',{actionId:b.id,reason:'Accès révoqué'},g.owner);assert.equal((await g.store.get(`${g.base}/inventory/${g.lot.id}`)).quantity,2);
 });
 test(`${prefix} : éditeur et publication refusent durée, niveau avancé ou consommable de réparation inventés`,()=>{
  const t=centralFieldTargetPayload({kind:'INSTALLATION',soInstallation:'1',title:'Installation',description:'Jeu',gmNotes:'Secret',sabotageLevel:'2',sabotageKit:'kit',sabotageThreshold:'6',sabotageInstructions:'Scène',sabotageBonus:''});assert.equal(validSoInstallation(t),true);
  for(const change of [x=>x.profiles.SABOTAGE.minLevel=3,x=>x.profiles.SABOTAGE.durationSeconds=1,x=>x.profiles.REPAIR.consumable={itemId:'kit',quantity:1},x=>x.offlineSeconds=901]){const x=structuredClone(t);change(x);assert.equal(validSoInstallation(x),false);assert.ok(soReleaseDefinitionChecks([{id:'fieldTarget_x',entityId:'x',type:'fieldTarget',operation:'UPSERT',data:x}]).definitions.length);}
 });
}
