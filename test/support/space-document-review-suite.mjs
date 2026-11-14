import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {forgeryFixture} from './space-forgery-suite.mjs';
import {itemInput,newLot} from '../../src/core/inventory-state.mjs';
import {centralTestKnowledge} from './central-knowledge-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
const item={name:'Document portuaire',description:'Texte présenté par le porteur.',kind:'INDIVIDUAL',consumable:false,reviewTargetId:'scene',pillable:true,pickpocketable:true,publicationState:'PUBLISHED'};
export async function reviewFixture(makeStore,{shareMode=null}={}){
 const f=await actionsFixture(makeStore,{classId:'TRA',skillId:'TRA-03',helper:true,release:false,targetPatch:{documentOnly:true}});
 if(shareMode)await f.cc('saveCentralKnowledge',{knowledgeId:'original-text',knowledgeRevision:0,draftRevision:(await f.view()).draft.revision,
  knowledge:{...centralTestKnowledge,kind:'DOCUMENT',title:'Texte du document',body:'Texte obtenu',shareMode,initialCharacterIds:[],qrEnabled:false,qrSkillId:null,qrSkillLevel:null,qrCharacterIds:[]},reason:'Texte lié à l’original'});
 await f.release(await f.releasePreview());await f.birth(await f.birthPreview());await f.birth(await f.birthPreview(f.owner,{uid:f.other.uid}),{uid:f.other.uid});await f.stage('EN_JEU');
 const cid=(await f.actionRead('mySession')).character.id,otherId=(await f.actionRead('mySession',{},f.other)).character.id;
 const lot=newLot('original',itemInput({...item,...(shareMode?{knowledgeId:'original-text'}:{})},'document-model'),1,cid,1000000,{kind:'SCENARIO_VERSION'});
 await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/inventory/${lot.id}`,lot));
 return {...f,cid,otherId,lot};
}
const input=lotId=>({documentLotId:lotId,kind:'ANALYZE'});
async function start(f,lotId,actor=f.player){const p=await f.actionRead('prepareFieldAction',input(lotId),actor);return f.actionCmd('startFieldAction',{...input(lotId),present:true,confirmation:p.confirmation},actor);}
async function transfer(f,lotId,from,to,toActor){const p={lotId,recipientId:to,quantity:1},q=await f.actionRead('prepareLotTransfer',p,from),a=await f.actionCmd('proposeLotTransfer',{...p,confirmation:q.confirmation},from),d=await f.actionRead('lotTransferDetail',{transferId:a.id},toActor);await f.actionCmd('acceptLotTransfer',{transferId:a.id,confirmation:d.confirmation,received:true},toActor);}
export function spaceDocumentReviewSuite(makeStore,prefix='Documents TRA-03'){
 test(`${prefix} : épisode suivant conserve la provenance du faux et le quota de l’original`,async()=>{
  const f=await forgeryFixture(makeStore,{review:true});f.setDie(6);const a=await f.start();f.advance(270000);const made=await f.finish(a.id),e=await episodeHarness(f);
  const lot=await e.get(`inventory/${made.documentId}`),evidence=await e.get(`forgeryRecords/${made.documentId}`),action=await e.get(`inf03Actions/${a.id}`);
  await e.close({participantUids:[f.player.uid]});await e.resume(await e.begin());
  assert.deepEqual(await e.get(`inventory/${made.documentId}`),lot);assert.deepEqual(await e.get(`forgeryRecords/${made.documentId}`),evidence);assert.deepEqual(await e.get(`inf03Actions/${a.id}`),action);
  assert.equal((await e.read('inspectSoForgery',{lotId:made.documentId})).originActionId,a.id);
  assert.deepEqual(await f.store.get(`sessions/${f.sid}/forgeryRecords/${made.documentId}`),evidence);
  const g=await reviewFixture(makeStore),b=await start(g,'original');g.advance(120000);await g.finish(b);const next=await episodeHarness(g);
  await next.close();await next.resume(await next.begin());await next.stage('EN_JEU');
  await assert.rejects(next.read('prepareFieldAction',input('original'),g.player),{code:'FIELD_ANALYSIS_DONE'});
 });
 test(`${prefix} : cinq niveaux sur l’original, informations préparées seules et coût unique`,async()=>{
  for(let level=1;level<=5;level++){
   const f=await reviewFixture(makeStore),path=`sessions/${f.sid}/characters/${f.cid}`;
   await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='TRA-03'?{...k,level}:k)}});});
   const a=await start(f,'original');assert.equal(a.durationSeconds,120);f.advance(120000);const r=await f.finish(a);
   assert.deepEqual(r.result.information.map(k=>k.id),['ordinary',...(level>=3?['higher']:[]),...(level===5?['bonus']:[])]);
   assert.equal((await f.points()).available,4);assert.deepEqual((await f.finish(a)).result,r.result);
  }
 });
 test(`${prefix} : copie transmise, verrou partagé et révocation du reçu avant résolution`,async()=>{
  const f=await reviewFixture(makeStore,{shareMode:'COPY'});await f.actionCmd('openInventoryDocument',{lotId:'original'});
  const r=await f.store.get(`sessions/${f.sid}/characters/${f.cid}/knowledge/original-text`);
  await f.actionCmd('shareKnowledge',{knowledgeId:'original-text',recipientId:f.otherId,receiptRevision:r.grantRevision});
  assert.equal((await f.actionRead('myDocumentReviews',{},f.other)).documents.length,1);
  const p=await f.actionRead('prepareFieldAction',input('original')),q=await f.actionRead('prepareFieldAction',input('original'),f.other);
  const outcomes=await Promise.allSettled([f.actionCmd('startFieldAction',{...input('original'),present:true,confirmation:p.confirmation}),f.actionCmd('startFieldAction',{...input('original'),present:true,confirmation:q.confirmation},f.other)]);
  assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  const won=outcomes[0].status==='fulfilled'?0:1,actor=won===0?f.player:f.other,cid=won===0?f.cid:f.otherId,a=outcomes[won].value;
  await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}/characters/${cid}/knowledge/original-text`,r=await tx.get(path);tx.set(path,{...r,active:false,grantRevision:r.grantRevision+1});});
  f.advance(120000);await assert.rejects(f.actionCmd('finishFieldAction',{actionId:a.id,present:true},actor),{code:'SO_DOCUMENT_REVIEW_ACCESS'});
  await f.actionCmd('cancelFieldActionMJ',{actionId:a.id,reason:'Accès documentaire retiré'},f.owner);
  assert.equal((await f.points()).reserved,0);assert.equal((await f.points(f.other)).reserved,0);
 });
 test(`${prefix} : interruption atomique et nouvelle version, sans renouvellement par réessai`,async()=>{
  const raw=makeStore();let fail=false;
  const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};
  const f=await reviewFixture(()=>store),a=await start(f,'original');f.advance(120000);fail=true;
  await assert.rejects(f.finish(a),/INTERRUPTION/);fail=false;assert.equal((await f.points()).reserved,1);assert.deepEqual((await f.actionRead('myKnowledge')).items,[]);
  const done=await f.finish(a);assert.deepEqual((await f.finish(a)).result,done.result);
  f.advance(600000);await assert.rejects(start(f,'original'),{code:'FIELD_ANALYSIS_DONE'});
  await raw.runTransaction(async tx=>{const p=`sessions/${f.sid}/fieldTargets/scene`,t=await tx.get(p);tx.set(p,{...t,revision:t.revision+1});});
  const next=await start(f,'original');await f.actionCmd('cancelFieldAction',{actionId:next.id,reason:'Interruption de la nouvelle version'});
  assert.equal((await f.points()).available,4);
 });
 test(`${prefix} : seul un original accessible ouvre le dossier, aucun accès par le QR du modèle`,async()=>{
  const f=await reviewFixture(makeStore);const list=await f.actionRead('myDocumentReviews');assert.deepEqual(list.documents,[{id:'original',name:item.name}]);
  await assert.rejects(f.actionRead('fieldTarget',{targetId:'scene'}),{code:'SO_DOCUMENT_REVIEW_ACCESS'});
  await assert.rejects(f.actionRead('fieldTarget',input('original'),f.other),{code:'SO_DOCUMENT_REVIEW_ACCESS'});
  const d=await f.actionRead('fieldTarget',input('original'));assert.equal(d.documentLotId,'original');assert.equal(d.profiles[0].durationSeconds,120);assert.equal(d.profiles[0].cost,1);
  assert.doesNotMatch(JSON.stringify(d),/SECRET_MJ|VERITE_MJ|TEXTE_PRIVE|assignedUid|ownerId|"origin":/);
  await assert.rejects(f.actionRead('prepareFieldAction',{...input('original'),targetId:'wrong'}),{code:'SO_DOCUMENT_REVIEW_ACCESS'});
 });
 test(`${prefix} : original transféré en cours, résultat refusé et annulation native libère les PA`,async()=>{
  const f=await reviewFixture(makeStore),a=await start(f,'original');
  // Another operator can change possession through the native transfer path
  // only after the active actor is free; a correction simulates concurrent MJ custody.
  await f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}/inventory/original`,l=await tx.get(p);tx.set(p,{...l,holderId:f.otherId,ownerId:f.otherId,location:{kind:'CHARACTER',id:f.otherId},revision:l.revision+1});});
  f.advance(120000);await assert.rejects(f.finish(a),{code:'SO_DOCUMENT_REVIEW_ACCESS'});assert.equal((await f.points()).reserved,1);
  await f.actionCmd('cancelFieldActionMJ',{actionId:a.id,reason:'Document retiré de la scène'},f.owner);assert.equal((await f.points()).available,5);
  assert.deepEqual((await f.actionRead('myKnowledge')).items,[]);
 });
 test(`${prefix} : niveaux, quota stable après transfert et nouvelle analyse par le destinataire`,async()=>{
  const f=await reviewFixture(makeStore),path=`sessions/${f.sid}/characters/${f.cid}`;
  await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='TRA-03'?{...k,level:3}:k)}});});
  const a=await start(f,'original');f.advance(120000);const r=await f.finish(a);assert.deepEqual(r.result.information.map(k=>k.id),['ordinary','higher']);assert.equal(r.result.bonusSuccess,false);
  await transfer(f,'original',f.player,f.otherId,f.other);assert.equal((await f.actionRead('myDocumentReviews')).documents.length,0);
  const b=await start(f,'original',f.other);f.advance(120000);const br=await f.finish(b,{},f.other);assert.deepEqual(br.result.information.map(k=>k.id),['ordinary']);
  await transfer(f,'original',f.other,f.cid,f.player);f.advance(600000);
  await assert.rejects(start(f,'original'),{code:'FIELD_ANALYSIS_DONE'});assert.equal((await f.store.get(`sessions/${f.sid}/inventory/original`)).id,'original');
 });
 test(`${prefix} : copie autorisée conservée, SHOW lié à la possession`,async()=>{
  for(const shareMode of ['COPY','SHOW']){
   const f=await reviewFixture(makeStore,{shareMode});await f.actionCmd('openInventoryDocument',{lotId:'original'});
   await transfer(f,'original',f.player,f.otherId,f.other);
   if(shareMode==='SHOW'){await assert.rejects(start(f,'original'),{code:'SO_DOCUMENT_REVIEW_ACCESS'});assert.equal((await f.actionRead('myDocumentReviews')).documents.length,0);}
   else {assert.equal((await f.actionRead('myDocumentReviews')).documents.length,1);const a=await start(f,'original');f.advance(120000);await f.finish(a);}
   assert.equal((await f.store.list(`sessions/${f.sid}/inventory`)).filter(l=>l.item.id==='document-model').length,1);
  }
 });
 test(`${prefix} : faux produit par INF-03, original et provenance conservés, faussaire non révélé`,async()=>{
  const f=await forgeryFixture(makeStore,{second:true,review:true});f.setDie(6);const forge=await f.start();f.advance(270000);const made=await f.finish(forge.id),lotId=made.documentId;
  assert.ok(lotId);assert.doesNotMatch(JSON.stringify(await f.actionRead('myInventory')),/forged_/);const before=await f.store.get(`sessions/${f.sid}/inventory/${lotId}`),recipient=(await f.actionRead('mySession',{},f.other)).character.id;
  await transfer(f,lotId,f.player,recipient,f.other);
  await f.store.runTransaction(async tx=>{const p=`sessions/${f.sid}/characters/${recipient}`,c=await tx.get(p);tx.set(p,{...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills,{id:'TRA-03',kind:'PASSIVE',level:3}]}});});
  assert.deepEqual((await f.store.get(`sessions/${f.sid}/inventory/${lotId}`)).origin,before.origin);
  const d=await f.actionRead('fieldTarget',input(lotId),f.other);assert.doesNotMatch(JSON.stringify(d),/FIBRE_PAPIER|ATELIER_MJ_SECRET|quality|creator|originAction/);
  const a=await start(f,lotId,f.other);f.advance(120000);const r=await f.actionCmd('finishFieldAction',{actionId:a.id,present:true},f.other);
  assert.equal(r.status,'SUCCEEDED');assert.deepEqual(r.result.information.map(k=>k.id),['ordinary','higher','bonus']);
  assert.doesNotMatch(JSON.stringify(r),/FIBRE_PAPIER|creator|originAction/);
 });
}
