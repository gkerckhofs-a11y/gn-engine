import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {entryFixture} from './space-outlaws-entry-suite.mjs';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {analysisProfile} from '../../src/shared/space-outlaws-analysis.mjs';
import {centralTestKnowledge} from './central-knowledge-suite.mjs';
import {actionPointPath} from '../../src/core/action-point-state.mjs';
import {accountId} from '../../src/core/economy-state.mjs';

export const analysisTarget=(skillId='COM-03',patch={})=>({kind:'ANALYSIS',title:'Poste balisé',description:'Description publique',gmNotes:'SECRET_MJ',dependencyId:null,offlineSeconds:0,failureLockSeconds:0,repairProtectionSeconds:0,
 profiles:{ANALYZE:analysisProfile(skillId)},rewards:[{id:'ordinary',kind:'KNOWLEDGE',knowledgeId:'ordinary',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:false},{id:'higher',kind:'KNOWLEDGE',knowledgeId:'higher',quantity:1,stock:1,perCharacter:1,minLevel:3,bonus:false},...(skillId==='COM-03'?[]:[{id:'bonus',kind:'KNOWLEDGE',knowledgeId:'bonus',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:true}])],...patch});
export async function actionsFixture(makeStore,{classId='COM',nature='HUMANOID',helper=false,skillId=classId==='TRA'?'TRA-01':'COM-03',material=false,release=true}={}){
 const f=await entryFixture(makeStore,{classId,nature});
 if(helper){const s=await f.read('session'),d=await f.view();await f.begin(f.token,f.other,{sessionRevision:s.revision,draftRevision:d.draft.revision});await f.save({sessionRevision:s.revision,draftRevision:d.draft.revision,proposal:{firstName:'Bela',lastName:'Test',speciesId:nature==='DROID'?'droid-test':'species-test',classId,secondaryId:classId==='MED'?'COM-03':'MED-02',background:'Fiction distincte',friends:''}},f.other);await f.cmd('reviewAdmission',{uid:f.other.uid,revision:2,policyRevision:1,draftRevision:d.draft.revision,decision:'APPROVE',reason:'Deuxième joueur'});const p=await f.read('previewAdmissionM2',f.owner,{uid:f.other.uid});await f.prepare(p,{uid:f.other.uid});}
 let revision=(await f.view()).draft.revision;
 for(const id of ['ordinary','higher','bonus'])await f.cc('saveCentralKnowledge',{knowledgeId:id,knowledgeRevision:0,draftRevision:revision++,knowledge:{...centralTestKnowledge,title:`Titre ${id}`,body:`TEXTE_PRIVE_${id}`,gmTruth:'VERITE_MJ',initialCharacterIds:[],qrEnabled:false,qrSkillId:null,qrSkillLevel:null,qrCharacterIds:[]},reason:'Information de scène'});
 const target=analysisTarget(skillId);if(material)target.profiles.ANALYZE=analysisProfile(skillId,{bonusItems:[{itemId:'kit_communicator',bonus:2}]});
 for(const id of ['scene','elsewhere'])await f.cc('saveCentralFieldTarget',{fieldTargetId:id,fieldTargetRevision:0,draftRevision:revision++,fieldTarget:target,reason:'Scène V0.7'});
 if(release){const p=await f.releasePreview();assert.deepEqual(p.blockers,[]);await f.release(p);await f.birth(await f.birthPreview());if(helper){const p=await f.birthPreview(f.owner,{uid:f.other.uid});await f.birth(p,{uid:f.other.uid});}}
 let at=1000000,die=1;
 const workflow=createWorkflow({store:f.store,ownerEmail:f.owner.email,now:()=>at,rollD6:()=>die});
 const read=(a,input={},actor=f.player)=>workflow.dispatch(a,actor,{sessionId:f.sid,...input});
 const cmd=(a,input={},actor=f.player)=>read(a,{requestId:randomUUID(),...input},actor);
 const stage=async stage=>cmd('setStage',{stage,revision:(await read('session',{},f.owner)).revision},f.owner);
 const prepare=(patch={},actor=f.player)=>read('prepareFieldAction',{targetId:'scene',kind:'ANALYZE',...patch},actor);
 const start=async(patch={},actor=f.player)=>{const p=await prepare(patch,actor);return cmd('startFieldAction',{targetId:'scene',kind:'ANALYZE',...patch,present:true,confirmation:p.confirmation},actor);};
 const finish=(a,patch={},actor=f.player)=>cmd('finishFieldAction',{actionId:a.id,present:true,...patch},actor);
 const points=async(actor=f.player)=>(await read('mySession',{},actor)).actionPoints;
 return {...f,actionRead:read,actionCmd:cmd,stage,prepareAction:prepare,start,finish,points,advance:ms=>{at+=ms;},setDie:n=>{die=n;},target};
}
export function spaceOutlawsActionsSuite(makeStore,prefix='Actions SPACE OUTLAWS'){
 test(`${prefix} : QR, aperçu privé, scène et informations graduées sans jet tactique`,async()=>{
  const f=await actionsFixture(makeStore);const scan=await f.actionRead('fieldTarget',{targetId:'scene'});assert.equal(scan.profiles[0].durationSeconds,105);assert.doesNotMatch(JSON.stringify(scan),/TEXTE_PRIVE|VERITE_MJ|SECRET_MJ|Titre ordinary/);assert.equal((await f.points()).available,5);
  await assert.rejects(f.start(),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');const p=await f.prepareAction();assert.equal(p.cost,1);assert.equal(p.test,'AUTO');assert.equal(p.cooldownSeconds,600);assert.equal((await f.points()).reserved,0);
  const a=await f.start();assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,1);await assert.rejects(f.finish(a),{code:'FIELD_TOO_EARLY'});f.advance(105000);const r=await f.finish(a);assert.equal(r.result.roll,null);assert.equal(r.status,'SUCCEEDED');assert.deepEqual(r.result.information.map(k=>k.id),['ordinary']);assert.equal((await f.points()).reserved,0);
  const detail=await f.actionRead('knowledgeDetail',{knowledgeId:'ordinary'});assert.equal(detail.knowledge.body,'TEXTE_PRIVE_ordinary');assert.doesNotMatch(JSON.stringify(detail),/VERITE_MJ|SECRET_MJ/);await assert.rejects(f.actionRead('knowledgeDetail',{knowledgeId:'higher'}),{code:'FORBIDDEN'});await f.actionCmd('markKnowledgeRead',{knowledgeId:'ordinary',receiptRevision:1});assert.equal((await f.points()).available,4);
 });
 test(`${prefix} : Traces et documents garantis même après échec du supplément, jet non relançable`,async()=>{
  for(const skillId of ['TRA-01','TRA-03']){const f=await actionsFixture(makeStore,{classId:'TRA',skillId});await f.stage('EN_JEU');const a=await f.start();f.advance(120000);const requestId=randomUUID(),r=await f.finish(a,{requestId,die:6});assert.equal(r.result.roll,1);assert.equal(r.result.total,3);assert.equal(r.result.bonusSuccess,false);assert.equal(r.status,'SUCCEEDED');assert.equal((await f.actionRead('myKnowledge')).items.length,1);f.setDie(6);assert.deepEqual(await f.finish(a,{requestId,die:6}),r);assert.deepEqual((await f.finish(a)).result,r.result);assert.equal((await f.points()).available,4);}
 });
 test(`${prefix} : succès bonus sans critique automatique, sans accès au niveau supérieur`,async()=>{
  const f=await actionsFixture(makeStore,{classId:'TRA'});await f.stage('EN_JEU');f.setDie(4);const a=await f.start();f.advance(120000);const r=await f.finish(a);assert.equal(r.result.total,6);assert.equal(r.result.bonusSuccess,true);assert.deepEqual(r.result.information.map(k=>k.id),['ordinary','bonus']);assert.equal((await f.actionRead('myKnowledge')).items.length,2);
 });
 test(`${prefix} : une seule action par acteur et cible malgré deux confirmations concurrentes`,async()=>{
  const f=await actionsFixture(makeStore,{helper:true});await f.stage('EN_JEU');const p=await f.prepareAction(),q=await f.prepareAction({},f.other);
  const input={targetId:'scene',kind:'ANALYZE',present:true};const results=await Promise.allSettled([f.actionCmd('startFieldAction',{...input,confirmation:p.confirmation}),f.actionCmd('startFieldAction',{...input,confirmation:q.confirmation},f.other)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.store.list(`sessions/${f.sid}/fieldActions`)).length,1);assert.equal((await f.points()).reserved+(await f.points(f.other)).reserved,1);
  const who=results[0].status==='fulfilled'?f.player:f.other;await assert.rejects(f.start({targetId:'elsewhere'},who),{code:'FIELD_ACTOR_BUSY'});
 });
 test(`${prefix} : pause suspend durée et échéance PA, annulation libère sans récupération`,async()=>{
  const f=await actionsFixture(makeStore);await f.stage('EN_JEU');const a=await f.start();f.advance(10000);await f.stage('PAUSE');const before=await f.points();f.advance(300*60000);assert.equal((await f.actionRead('myFieldActions')).actions[0].remainingMs,95000);assert.equal((await f.points()).nextRefillInMs,before.nextRefillInMs);await assert.rejects(f.finish(a),{code:'SESSION_NOT_RUNNING'});await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Interruption'});assert.equal((await f.points()).available,5);await f.stage('EN_JEU');assert.equal((await f.start()).remainingMs,105000);
 });
 test(`${prefix} : renouvellement commun avec PA réservé et réessais ne surdistribuent pas`,async()=>{
  const f=await actionsFixture(makeStore);await f.stage('EN_JEU');const a=await f.start();f.advance(300*60000);const p=await f.points();assert.equal(p.available,4);assert.equal(p.reserved,1);await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Annulation au cycle'});assert.equal((await f.points()).available,5);await f.actionCmd('cancelFieldAction',{actionId:a.id,reason:'Second essai'});assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : récupération liée à compétence, tentative liée à la version du lieu`,async()=>{
  const f=await actionsFixture(makeStore);await f.stage('EN_JEU');const a=await f.start();f.advance(105000);await f.finish(a);await assert.rejects(f.start({targetId:'elsewhere'}),{code:'COOLDOWN_ACTIVE'});f.advance(600000);await assert.rejects(f.start(),{code:'FIELD_ANALYSIS_DONE'});assert.equal((await f.actionRead('fieldTarget',{targetId:'scene'})).analysisDone,true);await f.start({targetId:'elsewhere'});
 });
 test(`${prefix} : aide unique et matériel disponible, un seul PA et récupération pour les deux`,async()=>{
  const f=await actionsFixture(makeStore,{classId:'TRA',helper:true,material:true});await f.stage('EN_JEU');const me=await f.actionRead('mySession'),other=await f.actionRead('mySession',{},f.other),lot=(await f.actionRead('myInventory')).lots.find(l=>l.item.id==='kit_communicator');
  const offer=await f.actionCmd('offerAid',{targetId:me.character.id,skillId:'TRA-01',present:true},f.other);const a=await f.start({aidOfferId:offer.id,bonusLotId:lot.id});assert.equal((await f.points(f.other)).available,5);await assert.rejects(f.start({targetId:'elsewhere'},f.other),{code:'OUT_OF_COMBAT'});f.advance(120000);const r=await f.finish(a);assert.equal(r.result.roll,1);assert.equal(r.result.total,6);assert.equal(r.result.bonusSuccess,true);assert.equal((await f.points()).available,4);assert.equal((await f.points(f.other)).available,5);assert.deepEqual((await f.actionRead('myKnowledge',{},f.other)).items,[]);await assert.rejects(f.start({targetId:'elsewhere'},f.other),{code:'COOLDOWN_ACTIVE'});assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${lot.id}`)).quantity,1);assert.notEqual(me.character.id,other.character.id);
 });
 test(`${prefix} : aide révoquée bloque la résolution, MJ peut libérer toutes les réservations`,async()=>{
  const f=await actionsFixture(makeStore,{classId:'TRA',helper:true});await f.stage('EN_JEU');const me=await f.actionRead('mySession'),o=await f.actionCmd('offerAid',{targetId:me.character.id,skillId:'TRA-01',present:true},f.other),a=await f.start({aidOfferId:o.id});f.advance(120000);await f.actionCmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.finish(a),{code:'INVALID_RECIPIENT'});await f.actionCmd('cancelFieldActionMJ',{actionId:a.id,reason:'Accès révoqué'},f.owner);assert.equal((await f.points()).available,5);assert.equal((await f.actionRead('myKnowledge')).items.length,0);
 });
 test(`${prefix} : révocation joueur avant réessai et fermeture sans action pendante`,async()=>{
  const f=await actionsFixture(makeStore);await f.stage('EN_JEU');const a=await f.start();await assert.rejects(f.stage('FINISHED'),{code:'FIELD_ACTIONS_OPEN'});f.advance(105000);await f.finish(a);await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.finish(a),{code:'FORBIDDEN'});await f.stage('FINISHED');assert.equal((await f.actionRead('session',{},f.owner)).stage,'FINISHED');
 });
 test(`${prefix} : gardes legacy conservent kit, crédits et autorité MJ`,async()=>{
  const f=await actionsFixture(makeStore);await f.role(true,'RECEPTION');const s=await f.actionRead('session',{},f.owner);await assert.rejects(f.actionCmd('setStage',{stage:'EN_JEU',revision:s.revision},f.mj),{code:'FORBIDDEN'});await f.stage('EN_JEU');const me=await f.actionRead('mySession');
  await assert.rejects(f.actionCmd('saveFieldTarget',{targetId:'scene',revision:1,target:{...f.target,publicationState:'PUBLISHED'},reason:'Contourner'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.actionCmd('declareCapture',{confirmed:true}),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.actionCmd('offerAid',{targetId:me.character.id,skillId:'COM-01',present:true}),{code:'AID_NOT_ALLOWED'});
  const wallet=await f.store.get(`sessions/${f.sid}/accounts/${accountId(me.character.id)}`);assert.equal(wallet.protectedCredits,200);assert.ok((await f.store.list(`sessions/${f.sid}/inventory`)).every(l=>l.transferable===false));
 });
 test(`${prefix} : confirmation périmée, présence manquante et compétence absente sans débit`,async()=>{
  const f=await actionsFixture(makeStore,{classId:'MED'});await f.stage('EN_JEU');const p=await f.prepareAction();assert.equal(p.durationSeconds,120);await assert.rejects(f.actionCmd('startFieldAction',{targetId:'scene',kind:'ANALYZE',confirmation:p.confirmation}),{code:'FIELD_PRESENCE_REQUIRED'});await assert.rejects(f.actionCmd('startFieldAction',{targetId:'scene',kind:'ANALYZE',confirmation:'fake',present:true}),{code:'STALE_REVISION'});assert.equal((await f.points()).available,5);
  const g=await actionsFixture(makeStore,{classId:'COM',skillId:'TRA-01'});await g.stage('EN_JEU');await assert.rejects(g.start(),{code:'FIELD_SKILL_REQUIRED'});assert.equal((await g.points()).available,5);
 });
 test(`${prefix} : interruption transactionnelle ne distribue ni information ni coût partiel`,async()=>{
  const raw=makeStore();let fail=false;const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};const f=await actionsFixture(()=>wrapped);await f.stage('EN_JEU');const a=await f.start();f.advance(105000);fail=true;await assert.rejects(f.finish(a),/INTERRUPTION/);fail=false;assert.equal((await f.points()).reserved,1);assert.deepEqual((await f.actionRead('myKnowledge')).items,[]);await f.finish(a);assert.equal((await f.points()).reserved,0);assert.equal((await f.actionRead('myKnowledge')).items.length,1);
 });
 test(`${prefix} : publication refuse paramètres libres et récompenses de stock sur une analyse`,async()=>{
  const f=await actionsFixture(makeStore,{release:false}),d=await f.view(),save=fieldTarget=>f.cc('saveCentralFieldTarget',{fieldTargetId:'bad',fieldTargetRevision:0,draftRevision:d.draft.revision,fieldTarget,reason:'Invalide'});
  for(const patch of [{profiles:{ANALYZE:{...analysisProfile('COM-03'),cost:0}}},{profiles:{ANALYZE:{...analysisProfile('TRA-01'),durationSeconds:1}}},{rewards:[{id:'money',kind:'CREDITS',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:false}]},{rewards:[{id:'secret',kind:'KNOWLEDGE',knowledgeId:'bonus',quantity:1,stock:1,perCharacter:1,minLevel:1,bonus:true}]}])await assert.rejects(save(analysisTarget('COM-03',patch)),{code:'INVALID_FIELD_TARGET'});
 });
 test(`${prefix} : budget de première activation bloque avant toute écriture de version`,async()=>{
  const f=await actionsFixture(makeStore,{release:false}),knowledge=await f.store.get(`${f.base}/changes/knowledge_ordinary`),target=await f.store.get(`${f.base}/changes/fieldTarget_scene`);
  await f.store.runTransaction(async tx=>{
   for(let i=3;i<250;i++)tx.set(`${f.base}/changes/knowledge_k${i}`,{...knowledge,id:`knowledge_k${i}`,entityId:`k${i}`,data:{...knowledge.data,id:`k${i}`}});
   for(let i=2;i<100;i++)tx.set(`${f.base}/changes/fieldTarget_t${i}`,{...target,id:`fieldTarget_t${i}`,entityId:`t${i}`,data:{...target.data,id:`t${i}`}});
  });
  const p=await f.releasePreview();assert.equal(p.canRelease,false);assert.ok(p.blockers.some(b=>b.code==='SO_RUNTIME_LIMIT'));await assert.rejects(f.release(p),{code:'SO_RELEASE_BLOCKED'});assert.deepEqual(await f.store.list(`campaigns/${f.campaignId}/versions`),[]);
 });

}
