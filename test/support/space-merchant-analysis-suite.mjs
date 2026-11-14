import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {actionsFixture,analysisTarget} from './space-outlaws-actions-suite.mjs';
import {actionMenuItems} from '../../web/player-action-menu.mjs';
import {terminalItems} from '../../web/player-terminal.mjs';
export async function merchantFixture(makeStore,{level=2,classId='COU',bonus=true,...options}={}){
 const rewards=Array.from({length:5},(_,i)=>({id:`level${i+1}`,kind:'KNOWLEDGE',knowledgeId:['ordinary','higher','bonus'][Math.min(i,2)],quantity:1,stock:1,perCharacter:1,minLevel:i+1,bonus:false}));
 // Three distinct prepared dossiers suffice to check the five acquisition levels.
 const f=await actionsFixture(makeStore,{classId,skillId:'COU-01',...options,targetPatch:{rewards:[rewards[0],{...rewards[1],minLevel:3},...(bonus?[{...rewards[2],minLevel:5,bonus:true}]:[])]}});
 const cid=(await f.actionRead('mySession')).character.id;
 const edit=(path,fn)=>f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}${path?`/${path}`:''}`;tx.set(p,fn(await tx.get(p)));});
 if(classId==='COU')await edit(`characters/${cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='COU-01'?{...s,level}:s)}}));
 return {...f,cid,edit};
}
export function merchantAnalysisSuite(makeStore,prefix='Expertise marchande V0.7'){
 test(`${prefix} : cinq niveaux, garanties automatiques, supplément préparé seulement au niveau admis`,async()=>{
  for(let level=1;level<=5;level++){
   const f=await merchantFixture(makeStore,{level});await f.stage('EN_JEU');
   const before=await f.store.list(`sessions/${f.sid}/inventory`),accounts=await f.store.list(`sessions/${f.sid}/accounts`);
   const p=await f.prepareAction();assert.equal(p.durationSeconds,60);assert.equal(p.cost,1);assert.equal(p.cooldownSeconds,600);assert.equal(p.test,level===5?'D6':'AUTO');
   assert.doesNotMatch(JSON.stringify(p),/TEXTE_PRIVE|VERITE_MJ|SECRET_MJ/);
   const a=await f.start();f.advance(59999);await assert.rejects(f.finish(a),{code:'FIELD_TOO_EARLY'});f.advance(1);const r=await f.finish(a);
   assert.deepEqual(r.result.information.map(k=>k.id),['ordinary',...(level>=3?['higher']:[]),...(level===5?['bonus']:[])]);
   assert.equal(r.result.roll,level===5?1:null);assert.equal((await f.points()).available,4);
   assert.deepEqual(await f.store.list(`sessions/${f.sid}/inventory`),before);assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),accounts);
   const own=await f.actionRead('mySession');assert.ok(actionMenuItems(own).some(i=>i.id==='COU-01'));assert.equal(terminalItems(own).find(i=>i.id==='merchant-analysis').path,`act/${f.sid}/COU-01`);
  }
 });
 test(`${prefix} : échec du supplément préserve les informations ordinaires, refus de relance et coût unique`,async()=>{
  const f=await merchantFixture(makeStore,{level:1});await f.edit('fieldTargets/scene',t=>({...t,rewards:t.rewards.map(r=>r.bonus?{...r,minLevel:1}:r)}));await f.stage('EN_JEU');
  const p=await f.prepareAction(),input={targetId:'scene',kind:'ANALYZE',present:true,confirmation:p.confirmation};
  const attempts=await Promise.allSettled([f.actionCmd('startFieldAction',{...input,requestId:randomUUID()}),f.actionCmd('startFieldAction',{...input,requestId:randomUUID()})]);assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  const a=attempts.find(r=>r.status==='fulfilled').value;f.advance(60000);const requestId=randomUUID(),r=await f.finish(a,{requestId,die:6});assert.equal(r.result.roll,1);assert.equal(r.result.bonusSuccess,false);assert.deepEqual(r.result.information.map(k=>k.id),['ordinary']);assert.deepEqual(await f.finish(a,{requestId,die:6}),r);
  await assert.rejects(f.actionRead('knowledgeDetail',{knowledgeId:'bonus'}),{code:'FORBIDDEN'});await assert.rejects(f.start({targetId:'elsewhere'}),{code:'COOLDOWN_ACTIVE'});f.advance(600000);await assert.rejects(f.start(),{code:'FIELD_ANALYSIS_DONE'});assert.equal((await f.points()).available,4);
 });
 test(`${prefix} : compétence secondaire autorisée, classe seule sans compétence refusée`,async()=>{
  const f=await merchantFixture(makeStore,{classId:'COM'});await f.stage('EN_JEU');await assert.rejects(f.start(),{code:'FIELD_SKILL_REQUIRED'});
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'COU-01',name:'Expertise marchande',kind:'PASSIVE',level:1}]}}));
  await f.start();assert.equal((await f.points()).reserved,1);
 });
 test(`${prefix} : pause, annulation et perte réseau ne livrent pas de renseignement partiel`,async()=>{
  const f=await merchantFixture(makeStore);await f.stage('EN_JEU');const a=await f.start();f.advance(10000);await f.stage('PAUSE');f.advance(600000);assert.equal((await f.actionRead('myFieldActions')).actions[0].remainingMs,50000);await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Scène interrompue'});assert.equal((await f.points()).available,5);assert.deepEqual((await f.actionRead('myKnowledge')).items,[]);
  await f.stage('EN_JEU');const b=await f.start();f.advance(60000);const run=f.store.runTransaction.bind(f.store);f.store.runTransaction=cb=>run(async tx=>{await cb(tx);throw Error('NETWORK');});await assert.rejects(f.finish(b),/NETWORK/);f.store.runTransaction=run;assert.equal((await f.points()).reserved,1);assert.deepEqual((await f.actionRead('myKnowledge')).items,[]);await f.finish(b);assert.equal((await f.points()).reserved,0);
 });
 test(`${prefix} : version et accès revérifiés, ancienne session fermée sans migration`,async()=>{
  const f=await merchantFixture(makeStore);await f.stage('EN_JEU');const a=await f.start();f.advance(60000);await f.edit('fieldTargets/scene',t=>({...t,revision:t.revision+1}));await assert.rejects(f.finish(a),{code:'FIELD_STATE_CHANGED'});await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Dossier changé'});
  await f.edit('',s=>{const {merchantAnalysisVersion,...flags}=s.spaceOutlaws;return {...s,spaceOutlaws:flags};});await assert.rejects(f.start(),{code:'SO_GAMEPLAY_NOT_OPEN'});const own=await f.actionRead('mySession');assert.ok(!actionMenuItems(own).some(i=>i.id==='COU-01'));assert.ok(!terminalItems(own).some(i=>i.id==='merchant-analysis'));
 });
 test(`${prefix} : une offre sans supplément ne permet ni aide ni matériel pour un dé absent`,async()=>{
  const f=await merchantFixture(makeStore,{bonus:false,helper:true,material:true});await f.stage('EN_JEU');const lot=(await f.actionRead('myInventory')).lots.find(l=>l.item.id==='kit_communicator');await assert.rejects(f.prepareAction({bonusLotId:lot.id}),{code:'FIELD_EQUIPMENT_UNAVAILABLE'});
  const offer=await f.actionCmd('offerAid',{targetId:f.cid,skillId:'COU-01',present:true},f.other);await assert.rejects(f.prepareAction({aidOfferId:offer.id}),{code:'AID_NOT_ALLOWED'});
 });
}
