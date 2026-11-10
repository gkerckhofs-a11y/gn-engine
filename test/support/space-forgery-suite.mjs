import test from 'node:test';
import assert from 'node:assert/strict';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
const tid='forge_license',blankItemId='kit_blank-forms';
export async function forgeryFixture(makeStore,{category='RECEIPT',minLevel=1,threshold=6,second=false}={}){
 const f=await actionsFixture(makeStore,{classId:'INF',release:false,helper:second});
 const view=await f.view();
 const fieldTarget={kind:'FORGERY',title:'Atelier du faussaire',description:'Atelier en jeu avec mobilier fictif.',
  gmNotes:'ATELIER_MJ_SECRET',profiles:{},rewards:[],forgery:{category,minLevel,threshold,blankItemId,
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
  await assert.rejects(f.actionRead('prepareLotTransfer',{
   lotId:f.forms[1].id,recipientId:second,quantity:1
  }),{code:'SO_GAMEPLAY_NOT_OPEN'});
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
