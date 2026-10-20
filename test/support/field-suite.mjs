import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {campaignFixture} from './campaigns-suite.mjs';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {portBrecheActionPoints,actionPointPath} from '../../src/core/action-point-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {cleanScenarioSnapshot} from '../../src/core/scenario-package.mjs';
const profile=(patch={})=>({skillId:null,minLevel:1,durationSeconds:30,test:'D6',threshold:4,bonusItems:[],successText:'Réussite',failureText:'Échec',...patch});
export async function fieldFixture(makeStore){
 const f=await campaignFixture(makeStore);let time=100000,die=4;const advance=f.advance;f.advance=ms=>{time+=ms;advance(ms);};
 const w=createWorkflow({store:f.store,ownerEmail:f.owner.email,now:()=>time,rollD6:()=>die}),read=(a,input={},who=f.alice)=>w.dispatch(a,who,{sessionId:f.sid,...input}),cmd=(a,input={},who=f.alice)=>read(a,{requestId:randomUUID(),...input},who);
 const setup={sessionId:f.sid,revision:(await f.session()).revision,reason:'Règles test',rules:portBrecheActionPoints},p=await f.read('prepareActionPointRules',f.owner,setup);await f.cmd('saveActionPointRules',f.owner,{...setup,confirmation:p.confirmation});
 const save=(target,patch={})=>cmd('saveFieldTarget',{target,reason:'Configuration test',...patch},f.owner);
 const search=(patch={})=>save({kind:'SEARCH',title:'Cachette',description:'Description publique',gmNotes:'SECRET_RESERVE',publicationState:'PUBLISHED',profiles:{SEARCH:profile()},rewards:[{id:'credits',kind:'CREDITS',quantity:10,stock:1,perCharacter:1}],...patch});
 const installation=(patch={})=>save({kind:'INSTALLATION',title:'Générateur',publicationState:'PUBLISHED',profiles:{SABOTAGE:profile(),REPAIR:profile()},rewards:[],offlineSeconds:0,failureLockSeconds:300,repairProtectionSeconds:60,...patch});
 const prepare=(targetId,kind='SEARCH',patch={},who=f.alice)=>read('prepareFieldAction',{targetId,kind,...patch},who);
 const start=async(targetId,kind='SEARCH',patch={},who=f.alice)=>{const p=await prepare(targetId,kind,patch,who);return cmd('startFieldAction',{targetId,kind,...patch,confirmation:p.confirmation,present:true},who);};
 const finish=(a,patch={},who=f.alice)=>cmd('finishFieldAction',{actionId:a.id,present:true,...patch},who);
 const state=id=>f.store.get(`sessions/${f.sid}/fieldStates/${id}`),points=()=>f.store.get(actionPointPath(f.sid,f.characters[0]));
 const item=async(consumable=false)=>f.cmd('saveSessionItem',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,name:consumable?'Charge':'Outil',kind:'STACKABLE',consumable,publicationState:'PUBLISHED',reason:'Matériel'});
 const grant=async(itemId,quantity=3)=>{const i={sessionId:f.sid,revision:(await f.session()).revision,characterId:f.characters[0],itemId,quantity,reason:'Matériel'},p=await f.read('prepareGrantItem',f.owner,i);await f.cmd('grantItem',f.owner,{...i,confirmation:p.confirmation});return (await f.session()).inventory.find(l=>l.item.id===itemId);};
 return {...f,get sid(){return f.sid;},fieldRead:read,fieldCmd:cmd,save,search,installation,prepareField:prepare,start,finish,state,points,item,grant,setDie:n=>die=n};
}
export function fieldSuite(makeStore,prefix='Terrain'){
 test(`${prefix} : réglages modifiés pendant l’action, coût et délai déjà engagés conservés`,async()=>{
  const f=await fieldFixture(makeStore),t=await f.search({rewards:[{id:'constructor',kind:'CREDITS',quantity:10,stock:3,perCharacter:2}]}),a=await f.start(t.id);
  const input={sessionId:f.sid,revision:(await f.session()).revision,rules:{...portBrecheActionPoints,cost:2,cooldownSeconds:0},reason:'Nouvelles règles'},p=await f.read('prepareActionPointRules',f.owner,input);await f.cmd('saveActionPointRules',f.owner,{...input,confirmation:p.confirmation});
  f.advance(30000);await f.finish(a);assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,0);await assert.rejects(f.start(t.id),{code:'COOLDOWN_ACTIVE'});f.advance(600000);const b=await f.start(t.id);assert.equal(b.cost,2);f.advance(30000);await f.finish(b);assert.equal((await f.state(t.id)).stock.constructor,1);await assert.rejects(f.start(t.id),{code:'FIELD_EMPTY'});
 });
 test(`${prefix} : une transaction interrompue ne laisse ni crédit ni résultat partiel`,async()=>{
  const f=await fieldFixture(makeStore),t=await f.search(),a=await f.start(t.id);f.advance(30000);const run=f.store.runTransaction.bind(f.store);let fail=true;f.store.runTransaction=callback=>run(async tx=>{const result=await callback(tx);if(fail){fail=false;throw new Error('Interruption simulée');}return result;});
  await assert.rejects(f.finish(a),/Interruption simulée/);assert.equal((await f.state(t.id)).stock.credits,1);assert.equal((await f.points()).reserved,1);assert.equal((await f.store.get(`sessions/${f.sid}/accounts/${accountId(f.characters[0])}`)).balance,100);await f.finish(a);assert.equal((await f.state(t.id)).stock.credits,0);
 });
 test(`${prefix} : configuration invalide et confirmation périmée ne réservent rien`,async()=>{
  const f=await fieldFixture(makeStore);await assert.rejects(f.search({profiles:{SEARCH:profile({bonusItems:[null]})}}),{code:'INVALID_FIELD_TARGET'});await assert.rejects(f.search({profiles:{SEARCH:profile({skillId:'absent'})}}),{code:'FIELD_REFERENCE'});
  const t=await f.search(),p=await f.prepareField(t.id);await assert.rejects(f.prepareField(t.id,'constructor'),{code:'INVALID_FIELD_TARGET'});const old=(await f.fieldRead('fieldAdmin',{},f.owner)).fieldTargets.find(x=>x.id===t.id);await f.save({...old,title:'Nouveau titre'},{targetId:t.id,revision:old.revision});await assert.rejects(f.fieldCmd('startFieldAction',{targetId:t.id,kind:'SEARCH',present:true,confirmation:p.confirmation}),{code:'STALE_REVISION'});assert.equal((await f.state(t.id)).activeActionId,null);
 });
 test(`${prefix} : durée, PA réservés, résultat et crédits uniques après réessais`,async()=>{
  const f=await fieldFixture(makeStore),t=await f.search(),p=await f.prepareField(t.id);assert.equal((await f.state(t.id)).activeActionId,null);assert.equal(JSON.stringify(p).includes('SECRET_RESERVE'),false);assert.equal('reward' in p,false);
  const requestId=randomUUID(),input={targetId:t.id,kind:'SEARCH',confirmation:p.confirmation,present:true,requestId},a=await f.fieldCmd('startFieldAction',input);assert.deepEqual(await f.fieldCmd('startFieldAction',input),a);assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,1);
  await assert.rejects(f.finish(a),{code:'FIELD_TOO_EARLY'});f.advance(30000);const result=await f.finish(a,{requestId:'resolve-once',die:6});f.setDie(1);assert.deepEqual(await f.finish(a,{requestId:'resolve-once',die:6}),result);assert.equal((await f.finish(a)).result.roll,4);assert.equal(result.result.total,4);
  assert.equal((await f.store.get(`sessions/${f.sid}/accounts/${accountId(f.characters[0])}`)).balance,110);assert.equal((await f.state(t.id)).stock.credits,0);assert.equal((await f.points()).reserved,0);
 });
 test(`${prefix} : dernier contenu et personnage verrouillés face à deux lancements concurrents`,async()=>{
  const f=await fieldFixture(makeStore),t=await f.search(),p=await f.prepareField(t.id),q=await f.prepareField(t.id,'SEARCH',{},f.bob);
  const results=await Promise.allSettled([f.fieldCmd('startFieldAction',{targetId:t.id,kind:'SEARCH',confirmation:p.confirmation,present:true}),f.fieldCmd('startFieldAction',{targetId:t.id,kind:'SEARCH',confirmation:q.confirmation,present:true},f.bob)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const winner=results.find(r=>r.status==='fulfilled').value,who=winner.characterId===f.characters[0]?f.alice:f.bob;f.advance(30000);await f.finish(winner,{},who);assert.equal((await f.state(t.id)).stock.credits,0);
  await assert.rejects(f.start(t.id,'SEARCH',{},who===f.alice?f.bob:f.alice),{code:'FIELD_EMPTY'});
 });
 test(`${prefix} : pause et annulation à travers un renouvellement sans surdistribution`,async()=>{
  const f=await fieldFixture(makeStore),t=await f.search(),a=await f.start(t.id);f.advance(10000);await f.stage('PAUSE');f.advance(300000);assert.equal((await f.fieldRead('myFieldActions')).actions[0].remainingMs,20000);await assert.rejects(f.finish(a),{code:'SESSION_NOT_RUNNING'});
  await f.stage('EN_JEU');f.advance(300*60000);await f.fieldCmd('cancelFieldAction',{actionId:a.id,reason:'Interruption avant jet'});assert.equal((await f.points()).available,5);assert.equal((await f.points()).reserved,0);assert.equal((await f.state(t.id)).stock.credits,1);
  const b=await f.start(t.id);assert.equal(b.remainingMs,30000);
 });
 test(`${prefix} : échec dépense le consommable, conserve la réserve et partage le délai FOUILLE`,async()=>{
  const f=await fieldFixture(makeStore),i=await f.item(true),lot=await f.grant(i.id),t=await f.search({profiles:{SEARCH:profile({threshold:9,consumable:{itemId:i.id,quantity:1}})}}),other=await f.search();
  const a=await f.start(t.id,'SEARCH',{consumableLotId:lot.id});assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).status,'FIELD_RESERVED');
  await assert.rejects(f.cmd('prepareLotTransfer',f.alice,{sessionId:f.sid,lotId:lot.id,recipientId:f.characters[1],quantity:1}),{code:'INSUFFICIENT_STOCK'});
  f.advance(30000);const r=await f.finish(a);assert.equal(r.status,'FAILED');assert.equal((await f.points()).available,4);assert.equal((await f.state(t.id)).stock.credits,1);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,2);
  await assert.rejects(f.start(other.id),{code:'COOLDOWN_ACTIVE'});f.advance(600000);await f.start(other.id);
 });
 test(`${prefix} : niveau de compétence, un bonus disponible, profil figé et sortie sans effet`,async()=>{
  const f=await fieldFixture(makeStore),skill=await f.cmd('saveSessionSkill',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,name:'Technique',kind:'PASSIVE',publicationState:'PUBLISHED',reason:'Test'});
  const input={sessionId:f.sid,revision:(await f.session()).revision,characterId:f.characters[0],classId:null,overrides:[{skillId:skill.id,level:2}],published:true,reason:'Expertise'},p=await f.read('prepareAbilityProfile',f.owner,input);await f.cmd('setAbilityProfile',f.owner,{...input,confirmation:p.confirmation});
  const i=await f.item(),lot=await f.grant(i.id),t=await f.search({profiles:{SEARCH:profile({skillId:skill.id,minLevel:2,threshold:8,durationByLevel:{2:10},bonusItems:[{itemId:i.id,bonus:2}]})}});
  await assert.rejects(f.start(t.id,'SEARCH',{},f.bob),{code:'FIELD_SKILL_REQUIRED'});const a=await f.start(t.id,'SEARCH',{bonusLotId:lot.id});assert.equal(a.durationSeconds,10);assert.equal(a.level,2);assert.equal(a.bonus,2);
  await assert.rejects(f.save({...((await f.fieldRead('fieldAdmin',{},f.owner)).fieldTargets.find(t=>t.id===a.targetId)),title:'Changement'},{targetId:t.id,revision:1}),{code:'FIELD_TARGET_BUSY'});
  f.advance(10000);const r=await f.finish(a);assert.equal(r.result.total,8);assert.equal(r.status,'SUCCEEDED');assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,3);
 });
 test(`${prefix} : sabotage, dépendance de fouille, réparation et protection`,async()=>{
  const f=await fieldFixture(makeStore),i=await f.installation(),t=await f.search({dependencyId:i.id}),a=await f.start(i.id,'SABOTAGE');f.advance(30000);await f.finish(a);assert.equal((await f.state(i.id)).status,'OFFLINE');await assert.rejects(f.start(t.id),{code:'INSTALLATION_OFFLINE'});
  const repair=await f.start(i.id,'REPAIR',{},f.bob);f.advance(30000);await f.finish(repair,{},f.bob);assert.equal((await f.state(i.id)).status,'ONLINE');await assert.rejects(f.start(i.id,'SABOTAGE',{},f.eve),{code:'FIELD_TARGET_LOCKED'});await f.start(t.id);
 });
 test(`${prefix} : panne à expiration, échec technique et horloge suspendue`,async()=>{
  const f=await fieldFixture(makeStore),i=await f.installation({offlineSeconds:60}),a=await f.start(i.id,'SABOTAGE');f.advance(30000);await f.finish(a);await f.stage('PAUSE');f.advance(120000);assert.equal((await f.fieldRead('fieldTarget',{targetId:i.id})).target.status,'OFFLINE');await f.stage('EN_JEU');f.advance(60000);assert.equal((await f.fieldRead('fieldTarget',{targetId:i.id})).target.status,'ONLINE');
  f.setDie(1);const b=await f.start(i.id,'SABOTAGE',{},f.bob);f.advance(30000);await f.finish(b,{},f.bob);await assert.rejects(f.start(i.id,'SABOTAGE',{},f.eve),{code:'FIELD_TARGET_LOCKED'});
 });
 test(`${prefix} : droits, informations privées, révocation avant cache et libération MJ`,async()=>{
  const f=await fieldFixture(makeStore),t=await f.search();await f.cmd('setStaff',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,email:f.staff.email,role:'RECEPTION',active:true,reason:'Accueil'});
  for(const who of [f.alice,f.staff])await assert.rejects(f.fieldRead('fieldAdmin',{},who),{code:'FORBIDDEN'});await assert.rejects(f.fieldRead('fieldTarget',{targetId:t.id},null),{code:'LOGIN_REQUIRED'});assert.equal(JSON.stringify(await f.fieldRead('fieldTarget',{targetId:t.id})).includes('SECRET_RESERVE'),false);
  const a=await f.start(t.id);await assert.rejects(f.finish(a,{},f.bob),{code:'FORBIDDEN'});await f.cmd('revokeAccess',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,uid:f.alice.uid,reason:'Fin'});await assert.rejects(f.finish(a),{code:'FORBIDDEN'});
  await f.fieldCmd('cancelFieldActionMJ',{actionId:a.id,reason:'Libération après révocation'},f.owner);assert.equal((await f.points()).available,5);assert.equal((await f.state(t.id)).activeActionId,null);
 });
 test(`${prefix} : reprise de campagne sans réapparition des stocks, plafonds ni panne prolongée`,async()=>{
  const f=await fieldFixture(makeStore),t=await f.search({rewards:[{id:'credits',kind:'CREDITS',quantity:10,stock:2,perCharacter:1}]}),i=await f.installation({offlineSeconds:600});let a=await f.start(t.id);f.advance(30000);await f.finish(a);a=await f.start(i.id,'SABOTAGE');f.advance(30000);await f.finish(a);f.advance(20000);
  await f.close();await f.resume(await f.begin());assert.equal((await f.state(t.id)).stock.credits,1);assert.equal((await f.state(i.id)).offlineUntilGameMs,580000);await f.activate(f.alice,f.characters[0]);await f.run();await assert.rejects(f.start(t.id),{code:'FIELD_EMPTY'});assert.equal((await f.fieldRead('fieldTarget',{targetId:i.id})).target.status,'OFFLINE');
 });
 test(`${prefix} : clôture bloquée même sans PA, réapprovisionnement identifié et protégé`,async()=>{
  const f=await fieldFixture(makeStore);const rules={sessionId:f.sid,revision:(await f.session()).revision,rules:{...portBrecheActionPoints,enabled:false},reason:'Sans PA'},pr=await f.read('prepareActionPointRules',f.owner,rules);await f.cmd('saveActionPointRules',f.owner,{...rules,confirmation:pr.confirmation});
  const t=await f.search(),a=await f.start(t.id),closing=await f.closing();assert.ok(closing.view.blocks.some(b=>b.kind==='FIELD_ACTION'));
  await f.fieldCmd('cancelFieldActionMJ',{actionId:a.id,reason:'Clôture'},f.owner);const old=await f.state(t.id),input={targetId:t.id,rewardId:'credits',quantity:2,revision:old.revision,reason:'Approvisionnement',requestId:'supply-once'};await f.fieldCmd('replenishFieldTarget',input,f.owner);await f.fieldCmd('replenishFieldTarget',input,f.owner);assert.equal((await f.state(t.id)).stock.credits,3);await f.close();
 });
 test(`${prefix} : objets et connaissances attribués une fois, instantanés privés conservés`,async()=>{
  const f=await fieldFixture(makeStore),i=await f.item(),k=await f.cmd('saveSessionKnowledge',f.owner,{sessionId:f.sid,revision:(await f.session()).revision,title:'Dossier secret',body:'Texte reçu',kind:'CLUE',publicationState:'PUBLISHED',shareMode:'COPY',qrEnabled:false,qrAudience:'ALL_PLAYERS',gmTruth:'VERITE_MJ',reason:'Indice'});
  const t=await f.search({profiles:{SEARCH:profile({test:'AUTO',cooldownSeconds:0})},rewards:[{id:'objet',kind:'ITEM',itemId:i.id,quantity:2,stock:1,perCharacter:1},{id:'indice',kind:'KNOWLEDGE',knowledgeId:k.id,quantity:1,stock:3,perCharacter:1}]});let a=await f.start(t.id);f.advance(30000);assert.equal((await f.finish(a)).result.roll,null);assert.equal((await f.session()).inventory.find(l=>l.id===a.id).quantity,2);a=await f.start(t.id);f.advance(30000);await f.finish(a);assert.equal((await f.read('knowledgeDetail',f.alice,{sessionId:f.sid,knowledgeId:k.id})).knowledge.body,'Texte reçu');assert.equal(JSON.stringify(await f.fieldRead('myFieldActions')).includes('VERITE_MJ'),false);await assert.rejects(f.start(t.id),{code:'FIELD_EMPTY'});
 });
 test(`${prefix} : scénario figé, archive et master préservent les références de terrain`,async()=>{
  const f=await fieldFixture(makeStore),target={kind:'SEARCH',title:'Modèle',publicationState:'PUBLISHED',profiles:{SEARCH:profile({test:'AUTO'})},rewards:[{id:'credits',kind:'CREDITS',quantity:5,stock:2,perCharacter:1}]};const t=await f.fieldCmd('saveFieldTarget',{sessionId:undefined,scenarioId:f.scenarioId,target,reason:'Modèle'},f.owner);
  const scenario=await f.scenario(),version=await f.cmd('publishScenario',f.owner,{scenarioId:f.scenarioId,revision:scenario.revision}),next=await f.cmd('createSession',f.owner,{...f.sessionInput,versionId:version.id});assert.equal((await f.store.get(`sessions/${next.id}/fieldStates/${t.id}`)).stock.credits,2);
  const exported=await f.read('prepareScenarioExport',f.owner,{scenarioId:f.scenarioId});assert.ok(exported);const clean=cleanScenarioSnapshot({scenario,records:{characters:scenario.characters,groups:scenario.groups,knowledge:scenario.knowledge,skills:scenario.skills,classes:scenario.classes,items:scenario.items,fieldTargets:[{...target,id:t.id,revision:1}]}});assert.equal(clean.records.fieldTargets.length,1);
 });
}
