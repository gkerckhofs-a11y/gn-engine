import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture,analysisTarget} from './space-outlaws-actions-suite.mjs';
const tid='forge_license',blankItemId='kit_blank-forms';
export async function forgeryFixture(makeStore,{category='RECEIPT',minLevel=1,threshold=6,second=false,review=false}={}){
 const f=await actionsFixture(makeStore,{classId:'INF',release:false,helper:second});
 if(review)await f.cc('saveCentralFieldTarget',{fieldTargetId:'review',fieldTargetRevision:0,draftRevision:(await f.view()).draft.revision,fieldTarget:analysisTarget('TRA-03',{documentOnly:true}),reason:'Dossier des originaux produits'});
 const view=await f.view();
 const fieldTarget={kind:'FORGERY',title:'Atelier du faussaire',description:'Atelier en jeu avec mobilier fictif.',
  gmNotes:'ATELIER_MJ_SECRET',profiles:{},rewards:[],forgery:{...(review?{reviewTargetId:'review'}:{}),category,minLevel,threshold,blankItemId,
   documentTitle:'Attestation du Port de Brèche',documentText:'DOCUMENT_DE_FICTION_SANS_DROIT',
   anomalies:'FIBRE_PAPIER_INCORRECTE_SECRET_MJ'}};
 await f.cc('saveCentralFieldTarget',{fieldTargetId:tid,fieldTargetRevision:0,draftRevision:view.draft.revision,
  fieldTarget,reason:'Modèle de document fictif'});
 const release=await f.releasePreview();assert.deepEqual(release.blockers,[]);
 await f.release(release);await f.birth(await f.birthPreview());
 if(second){const secondBirth=await f.birthPreview(f.owner,{uid:f.other.uid});await f.birth(secondBirth,{uid:f.other.uid});}
 await f.stage('EN_JEU');
 const cid=(await f.actionRead('mySession')).character.id;
 const formLots=()=>f.store.list('sessions/'+f.sid+'/inventory').then(ls=>ls.filter(l=>l.holderId===cid&&l.origin?.slotId==='blank-forms'));
 const forms=await formLots();assert.equal(forms.reduce((sum,l)=>sum+l.quantity,0),2);
 const start=(patch={})=>f.actionCmd('startSoForgery',{targetId:tid,blankLotId:forms[0].id,present:true,...patch});
 const finish=(id,patch={})=>f.actionCmd('finishSoForgery',{targetId:tid,actionId:id,present:true,...patch});
 const cancel=id=>f.actionCmd('cancelSoForgery',{targetId:tid,actionId:id});
 return {...f,tid,cid,forms,formLots,start,finish,cancel};
}
export function soForgerySuite(makeStore,prefix='INF-03'){
 test(prefix+' : annulation MJ après révocation libère exactement le PA, le formulaire et l’atelier',async()=>{
  const f=await forgeryFixture(makeStore),a=await f.start();await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);
  await assert.rejects(f.finish(a.id),{code:'FORBIDDEN'});
  const pending=await f.actionRead('soForgeryAdmin',{},f.owner);assert.equal(pending.actions[0].id,a.id);assert.doesNotMatch(JSON.stringify(pending),/SECRET_MJ|DOCUMENT_DE_FICTION/);
  const body={actionId:a.id,reason:'Accès retiré pendant la scène',requestId:'moderate-once'};
  const r=await f.actionCmd('cancelSoForgeryMJ',body,f.owner);assert.equal(r.status,'CANCELLED');
  assert.deepEqual(await f.actionCmd('cancelSoForgeryMJ',body,f.owner),r);
  assert.deepEqual(await f.actionCmd('cancelSoForgeryMJ',{...body,requestId:'moderate-twice'},f.owner),r);
  const points=await f.store.get(`sessions/${f.sid}/characters/${f.cid}/resources/actionPoints`);assert.equal(points.available,5);assert.equal(points.reserved,0);
  assert.equal((await f.formLots()).reduce((n,l)=>n+l.quantity,0),2);assert.ok((await f.formLots()).every(l=>l.status==='AVAILABLE'));
  assert.equal((await f.store.get(`sessions/${f.sid}/fieldStates/${f.tid}`)).activeActionId,null);
  assert.equal((await f.actionRead('soForgeryAdmin',{},f.owner)).actions.length,0);
  assert.equal((await f.store.list(`sessions/${f.sid}/audit`)).filter(a=>a.action==='cancelSoForgeryMJ').length,1);
 });
 test(prefix+' : régie de falsification contrôle le rôle au rejeu, le motif et les actions déjà résolues',async()=>{
  const f=await forgeryFixture(makeStore),a=await f.start(),body={actionId:a.id,reason:'Interruption contrôlée',requestId:'cancel-test'};
  await assert.rejects(f.actionRead('soForgeryAdmin'),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('cancelSoForgeryMJ',body),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('cancelSoForgeryMJ',{...body,reason:' '},f.owner),{code:'REASON_REQUIRED'});
  await f.role(true,'RECEPTION');await assert.rejects(f.actionRead('soForgeryAdmin',{},f.mj),{code:'FORBIDDEN'});
  await f.role(true,'MJ');await f.stage('PAUSE');await f.actionCmd('cancelSoForgeryMJ',body,f.mj);
  await f.role(false,'MJ');await assert.rejects(f.actionCmd('cancelSoForgeryMJ',body,f.mj),{code:'FORBIDDEN'});
  await f.stage('EN_JEU');const b=await f.start();f.advance(270000);f.setDie(6);await f.finish(b.id);
  await assert.rejects(f.actionCmd('cancelSoForgeryMJ',{actionId:b.id,reason:'Trop tard'},f.owner),{code:'SO_INF03_STALE'});
 });
 test(prefix+' : annulation MJ et résolution concurrentes conservent un seul résultat économique',async()=>{
  const f=await forgeryFixture(makeStore),a=await f.start();f.advance(270000);f.setDie(6);
  const results=await Promise.allSettled([f.finish(a.id),f.actionCmd('cancelSoForgeryMJ',{actionId:a.id,reason:'Interruption concurrente'},f.owner)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const ended=await f.store.get(`sessions/${f.sid}/inf03Actions/${a.id}`),success=ended.status==='SUCCESS',points=await f.points();
  assert.equal(points.reserved,0);assert.equal(points.available,success?4:5);
  assert.equal((await f.formLots()).reduce((n,l)=>n+l.quantity,0),success?1:2);
  assert.equal((await f.store.list(`sessions/${f.sid}/forgeryRecords`)).length,success?1:0);
 });

 test(prefix+' : cinq niveaux, durées canoniques, un seul jet et aucune identité révélée par le modèle',async()=>{
  const categories=['RECEIPT','MANIFEST','LICENSE','ORDER','EXCEPTIONAL'],durations=[300,270,240,210,180];
  for(let level=1;level<=5;level++){
   const f=await forgeryFixture(makeStore,{category:categories[level-1],minLevel:level}),path=`sessions/${f.sid}/characters/${f.cid}`;
   await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='INF-03'?{...k,level}:k)}});});
   const a=await f.start();assert.equal(a.durationSeconds,durations[level-1]);await assert.rejects(f.finish(a.id),{code:'SO_INF03_TOO_EARLY'});assert.equal(f.rollCount(),0);
   f.setDie(6);f.advance(durations[level-1]*1000);const r=await f.finish(a.id,{requestId:'finish-once'});assert.equal(r.success,true);assert.equal((await f.points()).available,4);assert.equal(f.rollCount(),1);
   assert.deepEqual(await f.finish(a.id,{requestId:'finish-once'}),r);await assert.rejects(f.finish(a.id),{code:'SO_INF03_STALE'});assert.equal(f.rollCount(),1);
   const lot=await f.store.get(`sessions/${f.sid}/inventory/${r.documentId}`);assert.equal(lot.quantity,1);assert.ok(lot.item.id.startsWith('document_'));
  }
 });
 test(prefix+' : niveau retiré avant résolution, aucun jet et annulation libérant le formulaire',async()=>{
  const f=await forgeryFixture(makeStore),a=await f.start(),path=`sessions/${f.sid}/characters/${f.cid}`;
  await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.filter(k=>k.id!=='INF-03')}});});
  f.advance(270000);await assert.rejects(f.finish(a.id),{code:'SO_INF03_SKILL'});assert.equal(f.rollCount(),0);
  await f.cancel(a.id);assert.equal((await f.points()).available,5);assert.equal((await f.formLots()).reduce((n,l)=>n+l.quantity,0),2);
 });
 test(prefix+' : formulaire initial, durée, PA, faux suivi et qualité privée',async()=>{
  const f=await forgeryFixture(makeStore);
  const view=await f.actionRead('mySoForgery',{targetId:f.tid});
  assert.equal(view.level,2);assert.equal(view.blanks.length,2);
  assert.doesNotMatch(JSON.stringify(view),/FIBRE_PAPIER_INCORRECTE_SECRET_MJ|DOCUMENT_DE_FICTION_SANS_DROIT/);
  const a=await f.start();assert.equal(a.durationSeconds,270);
  assert.equal((await f.points()).reserved,1);
  assert.equal((await f.store.get('sessions/'+f.sid+'/inventory/'+f.forms[0].id)).status,'FIELD_RESERVED');
  await assert.rejects(f.finish(a.id),{code:'SO_INF03_TOO_EARLY'});
  f.advance(270000);f.setDie(4);
  const r=await f.finish(a.id);
  assert.equal(r.status,'SUCCESS');assert.equal(r.total,6);assert.ok(r.documentId);
  assert.equal((await f.points()).available,4);assert.equal((await f.points()).reserved,0);
  const consumed=await f.store.get('sessions/'+f.sid+'/inventory/'+f.forms[0].id);
  assert.equal(consumed.quantity,0);assert.equal(consumed.status,'CONSUMED');
  const forged=await f.store.get('sessions/'+f.sid+'/inventory/'+r.documentId);
  assert.equal(forged.item.description,'DOCUMENT_DE_FICTION_SANS_DROIT');
  assert.equal(forged.item.kind,'INDIVIDUAL');assert.equal(forged.quantity,1);
  assert.equal(forged.transferable,true);
  assert.equal(forged.forgeryEvidence,undefined);
  const evidence=await f.store.get('sessions/'+f.sid+'/forgeryRecords/'+r.documentId);
  assert.equal(evidence.quality,2);assert.match(evidence.anomalies,/FIBRE_PAPIER/);
  const inspection=await f.actionRead('inspectSoForgery',{lotId:r.documentId},f.owner);
  assert.equal(inspection.quality,2);assert.match(inspection.anomalies,/FIBRE_PAPIER/);
  assert.equal(inspection.documentName,forged.item.name);
  await assert.rejects(f.actionRead('inspectSoForgery',{lotId:r.documentId}),{code:'FORBIDDEN'});
  await assert.rejects(f.actionRead('inspectSoForgery',{lotId:'missing'},f.owner),{code:'SO_INF03_RECORD'});
  assert.doesNotMatch(JSON.stringify(r),/FIBRE_PAPIER|DOCUMENT_DE_FICTION/);
 });

 test(prefix+' : régie MJ conserve la preuve de documents saisis ou détruits, sans pouvoir douanier',async()=>{
  const f=await forgeryFixture(makeStore,{second:true});
  const recipient=(await f.actionRead('mySession',{},f.other)).character.id;
  const work=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(work.id)).documentId;
  const lotPath='sessions/'+f.sid+'/inventory/'+lotId;
  await f.store.runTransaction(async tx=>{
   const lot=await tx.get(lotPath);
   tx.set(lotPath,{...lot,status:'SEIZED',revision:lot.revision+1,
    location:{kind:'CUSTOMS',id:'desk-test'}});
   tx.set(lotPath+'/history/seized-event',{id:'seized-event',kind:'correctLot',at:10100,
    before:{quantity:1,status:'AVAILABLE'},after:{quantity:1,status:'SEIZED'},
    reason:'Statut administratif de test, non une saisie officielle'});
  });
  const seized=await f.actionRead('inspectSoForgery',{lotId},f.owner);
  assert.equal(seized.status,'SEIZED');
  assert.equal(seized.quantity,1);
  assert.equal(seized.locationKind,'CUSTOMS');
  assert.equal(seized.quality,2);
  assert.equal(seized.inventoryEvents[0].status,'SEIZED');
  await assert.rejects(f.actionRead('prepareLotTransfer',{lotId,recipientId:recipient,quantity:1}),
   {code:'FORBIDDEN'});
  await f.store.runTransaction(async tx=>{
   const lot=await tx.get(lotPath);
   tx.set(lotPath,{...lot,status:'DESTROYED',quantity:0,revision:lot.revision+1});
   tx.set(lotPath+'/history/destroyed-event',{id:'destroyed-event',kind:'correctLot',at:10200,
    before:{quantity:1,status:'SEIZED'},after:{quantity:0,status:'DESTROYED'},
    reason:'Pièce retirée, historique conservé'});
  });
  const archived=await f.actionRead('inspectSoForgery',{lotId},f.owner);
  assert.equal(archived.status,'DESTROYED');assert.equal(archived.quantity,0);
  assert.equal(archived.inventoryEvents[0].status,'DESTROYED');
  assert.equal(archived.inventoryEvents[1].status,'SEIZED');
  assert.match(archived.anomalies,/FIBRE_PAPIER/);
  await assert.rejects(f.actionRead('inspectSoForgery',{lotId},f.other),{code:'FORBIDDEN'});
  await assert.rejects(f.actionRead('prepareLotTransfer',{lotId,recipientId:recipient,quantity:1}),
   {code:'FORBIDDEN'});
 });
 test(prefix+' : remise d’un faux à un autre joueur conserve l’identifiant, le registre privé et la chaîne MJ',async()=>{
  const f=await forgeryFixture(makeStore,{second:true});
  const second=(await f.actionRead('mySession',{},f.other)).character.id;
  const action=await f.start();f.advance(270000);f.setDie(4);
  const forged=(await f.finish(action.id)).documentId;
  const own=await f.actionRead('myInventory');
  const ownLot=own.lots.find(l=>l.id===forged);
  assert.equal(own.canTransfer,false);
  assert.equal(ownLot.canTransferByHand,true);
  assert.equal(ownLot.item.kind,'INDIVIDUAL');
  assert.equal(ownLot.origin,undefined);
  assert.doesNotMatch(JSON.stringify(own),/FIBRE_PAPIER_INCORRECTE_SECRET_MJ/);
  const protectedInput={lotId:f.forms[1].id,recipientId:second,quantity:1};
  await assert.rejects(f.actionRead('prepareLotTransfer',protectedInput),{code:'SO_PERSONAL_TRANSFER_RESTRICTED'});
  const input={lotId:forged,recipientId:second,quantity:1};
  const prepared=await f.actionRead('prepareLotTransfer',input);
  const proposal=await f.actionCmd('proposeLotTransfer',{...input,confirmation:prepared.confirmation});
  const offer=await f.actionRead('lotTransferDetail',{transferId:proposal.id},f.other);
  assert.equal(offer.status,'PENDING');
  assert.doesNotMatch(JSON.stringify(offer),/FIBRE_PAPIER_INCORRECTE_SECRET_MJ|forgeryTransfer|quality/);
  await assert.rejects(f.actionCmd('acceptLotTransfer',{
   transferId:proposal.id,confirmation:offer.confirmation,received:false
  },f.other),{code:'HANDOVER_REQUIRED'});
  const accepted=await f.actionCmd('acceptLotTransfer',{
   transferId:proposal.id,confirmation:offer.confirmation,received:true
  },f.other);
  assert.equal(accepted.status,'ACCEPTED');
  assert.equal(accepted.receivedLotId,forged);
  const after=await f.store.get('sessions/'+f.sid+'/inventory/'+forged);
  assert.equal(after.ownerId,second);assert.equal(after.holderId,second);
  assert.equal(after.origin.kind,'SO_FORGERY');
  const history=await f.store.list('sessions/'+f.sid+'/inventory/'+forged+'/history');
  assert.equal(history.filter(e=>e.kind==='TRANSFER').length,1);
  const ownerView=await f.actionRead('inspectSoForgery',{lotId:forged},f.owner);
  assert.equal(ownerView.holderId,second);
  assert.equal(ownerView.quality,2);
  assert.match(ownerView.anomalies,/FIBRE_PAPIER/);
  assert.equal(ownerView.transfers[0].transferId,proposal.id);
  const recipient=await f.actionRead('myInventory',{},f.other);
  assert.equal(recipient.lots.find(l=>l.id===forged).canTransferByHand,true);
  assert.doesNotMatch(JSON.stringify(recipient),/FIBRE_PAPIER_INCORRECTE_SECRET_MJ|quality|anomalies|SO_FORGERY/);
  await assert.rejects(f.actionRead('inspectSoForgery',{lotId:forged},f.other),{code:'FORBIDDEN'});
 });
 test(prefix+' : vol ROG-02 d’un faux conserve le lot et la preuve MJ',async()=>{
  const f=await forgeryFixture(makeStore,{second:true});
  const thief=(await f.actionRead('mySession',{},f.other)).character.id;
  const crafted=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(crafted.id)).documentId;
  const path='sessions/'+f.sid+'/characters/'+thief;
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(path);
   tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:[
    ...c.abilityProfile.skills,{id:'ROG-02',name:'Vol à la tire',kind:'PASSIVE',level:2}
   ]}});
  });
  const started=await f.actionCmd('startSoPickpocket',{
   targetId:f.cid,firstName:'Ari',lastName:'Test',present:true
  },f.other);
  assert.equal(started.status,'RUNNING');
  f.advance(45000);
  const stolen=await f.actionCmd('finishSoPickpocket',{actionId:started.id},f.other);
  assert.equal(stolen.status,'SUCCESS');
  const after=await f.store.get('sessions/'+f.sid+'/inventory/'+lotId);
  assert.equal(after.ownerId,thief);
  assert.equal(after.holderId,thief);
  assert.equal(after.origin.kind,'SO_FORGERY');
  const inspected=await f.actionRead('inspectSoForgery',{lotId},f.owner);
  assert.equal(inspected.quality,2);
  assert.match(inspected.anomalies,/FIBRE_PAPIER/);
  assert.equal(inspected.holderId,thief);
  assert.equal(inspected.otherMovements[0].kind,'SO_PICKPOCKET');
  assert.equal(inspected.otherMovements[0].sourceId,f.cid);
  assert.equal(inspected.otherMovements[0].destinationId,thief);
  const pocket=await f.actionRead('myInventory',{},f.other);
  assert.equal(pocket.lots.find(l=>l.id===lotId).id,lotId);
  assert.doesNotMatch(JSON.stringify(pocket),/FIBRE_PAPIER_INCORRECTE_SECRET_MJ|quality|anomalies|SO_FORGERY/);
  await assert.rejects(f.actionRead('inspectSoForgery',{lotId},f.other),{code:'FORBIDDEN'});
 });
 test(prefix+' : faux au registre falsifié exclu du vol sans révélation ni dépense de PA',async()=>{
  const f=await forgeryFixture(makeStore,{second:true});
  const thief=(await f.actionRead('mySession',{},f.other)).character.id;
  const crafted=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(crafted.id)).documentId;
  const actorPath='sessions/'+f.sid+'/characters/'+thief;
  const evidencePath='sessions/'+f.sid+'/forgeryRecords/'+lotId;
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(actorPath),e=await tx.get(evidencePath);
   tx.set(actorPath,{...c,abilityProfile:{...c.abilityProfile,skills:[
    ...c.abilityProfile.skills,{id:'ROG-02',name:'Vol à la tire',kind:'PASSIVE',level:2}
   ]}});
   tx.set(evidencePath,{...e,templateRevision:999});
  });
  const attempt=await f.actionCmd('startSoPickpocket',{
   targetId:f.cid,firstName:'Ari',lastName:'Test',present:true
  },f.other);
  f.advance(45000);
  const result=await f.actionCmd('finishSoPickpocket',{actionId:attempt.id},f.other);
  assert.equal(result.status,'EMPTY');
  assert.equal((await f.points(f.other)).available,5);
  assert.equal((await f.store.get('sessions/'+f.sid+'/inventory/'+lotId)).holderId,f.cid);
  await assert.rejects(f.actionRead('inspectSoForgery',{lotId},f.owner),{code:'SO_INF03_RECORD'});
 });
 test(prefix+' : une provenance de faux altérée interdit la remise, sans réécrire son registre',async()=>{
  const f=await forgeryFixture(makeStore,{second:true});
  const second=(await f.actionRead('mySession',{},f.other)).character.id;
  const a=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(a.id)).documentId,recordPath='sessions/'+f.sid+'/forgeryRecords/'+lotId;
  const record=await f.store.get(recordPath);
  await f.store.runTransaction(async tx=>tx.set(recordPath,{...record,templateRevision:999}));
  await assert.rejects(f.actionRead('prepareLotTransfer',{lotId,recipientId:second,quantity:1}),
   {code:'SO_INF03_RECORD'});
  await assert.rejects(f.actionRead('inspectSoForgery',{lotId},f.owner),{code:'SO_INF03_RECORD'});
  assert.equal((await f.store.get('sessions/'+f.sid+'/inventory/'+lotId)).ownerId,f.cid);
 });
 test(prefix+' : échec consomme un formulaire et un PA sans créer de faux',async()=>{
  const f=await forgeryFixture(makeStore);
  const a=await f.start();f.advance(270000);f.setDie(1);
  const r=await f.finish(a.id);
  assert.equal(r.status,'FAILED');assert.equal(r.documentId,null);
  assert.equal((await f.points()).available,4);
  const remaining=(await f.formLots()).reduce((n,x)=>n+x.quantity,0);
  assert.equal(remaining,1);
  assert.deepEqual(await f.store.list('sessions/'+f.sid+'/forgeryRecords'),[]);
  await assert.rejects(f.start({blankLotId:f.forms[1].id}),{code:'SO_INF03_COOLDOWN'});
  f.advance(600000);
  const second=await f.start({blankLotId:f.forms[1].id});assert.equal(second.status,'RUNNING');
 });
 test(prefix+' : annulation libère le formulaire et restitue le PA',async()=>{
  const f=await forgeryFixture(makeStore);
  const a=await f.start();
  assert.equal((await f.cancel(a.id)).status,'CANCELLED');
  assert.equal((await f.points()).available,5);assert.equal((await f.points()).reserved,0);
  assert.equal((await f.store.get('sessions/'+f.sid+'/inventory/'+f.forms[0].id)).status,'AVAILABLE');
  const b=await f.start();assert.notEqual(a.id,b.id);
 });
 test(prefix+' : refus modèle de niveau N3, autre formulaire, cible absente et doublons concurrents',async()=>{
  const f=await forgeryFixture(makeStore,{category:'LICENSE',minLevel:3});
  await assert.rejects(f.start(),{code:'SO_INF03_SKILL'});
  const characterPath='sessions/'+f.sid+'/characters/'+f.cid;
  await f.store.runTransaction(async tx=>{
   const c=await tx.get(characterPath);tx.set(characterPath,{...c,abilityProfile:{...c.abilityProfile,
    skills:c.abilityProfile.skills.map(x=>x.id==='INF-03'?{...x,level:3}:x)}});
  });
  await assert.rejects(f.start({blankLotId:'nonexistent'}),{code:'SO_INF03_FORM'});
  const first=await f.start();assert.equal(first.durationSeconds,240);
  await assert.rejects(f.start(),{code:'SO_INF03_COOLDOWN'});
 });
 test(prefix+' : révocation de l’accès, ancienne version, captif et STOP protègent les actions',async()=>{
  const f=await forgeryFixture(makeStore);
  await f.actionCmd('setSoCaptivity',{characterId:f.cid,kind:'CELL',reason:'Détention de jeu',safePath:true},f.owner);
  await assert.rejects(f.start(),{code:'SO_INF03_BUSY'});
  await f.actionCmd('endSoCaptivity',{characterId:f.cid},f.owner);
  const a=await f.start();
  await f.actionCmd('stopSafety',{reason:'Arrêt de sécurité'});
  await assert.rejects(f.finish(a.id),{code:'SESSION_NOT_RUNNING'});
  const before=await f.store.get('sessions/'+f.sid);
  await f.store.runTransaction(async tx=>{const {inf03Version,...rest}=before.spaceOutlaws;
   tx.set('sessions/'+f.sid,{...before,spaceOutlaws:rest});
  });
  await assert.rejects(f.actionRead('mySoForgery',{targetId:f.tid}),{code:'SO_INF03_CLOSED'});
 });
}
