import test from 'node:test';
import assert from 'node:assert/strict';
import {forgeryFixture} from './space-forgery-suite.mjs';

export function customsDetentionSuite(makeStore,prefix='Douanes SO : retenue provisoire'){
 test(prefix+' : 15 min réelles puis libération numérique sans décision, registre persistant',async()=>{
  const f=await forgeryFixture(makeStore,{second:true});
  const second=(await f.actionRead('mySession',{},f.other)).character.id;
  const action=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(action.id)).documentId;
  const start=await f.actionCmd('startCustomsDetention',{lotId,reason:'REGULATED_NO_LICENSE',
   reasonText:'Permis réglementé manquant pour ce lot de fiction',secured:true},f.owner);
  assert.equal(start.status,'ACTIVE');assert.equal(start.remainingRealMs,900000);
  assert.equal((await f.actionRead('myInventory')).lots.find(l=>l.id===lotId).status,'CUSTOMS_HELD');
  await assert.rejects(f.actionRead('prepareLotTransfer',{lotId,recipientId:second,quantity:1}),
   {code:'INSUFFICIENT_STOCK'});
  f.advance(899999);
  assert.equal((await f.actionRead('myInventory')).lots.find(l=>l.id===lotId).status,'CUSTOMS_HELD');
  f.advance(1);
  // No timer callback is needed; the state resolves from the authoritative server time.
  assert.equal((await f.actionRead('myInventory')).lots.find(l=>l.id===lotId).status,'AVAILABLE');
  const list=await f.actionRead('customsDetentionsAdmin',{},f.owner);
  assert.equal(list.cases[0].status,'EXPIRED');
  assert.equal(list.cases[0].remainingRealMs,0);
  const transfer=await f.actionRead('prepareLotTransfer',{lotId,recipientId:second,quantity:1});
  assert.ok(transfer.confirmation);
  const done=await f.actionCmd('releaseCustomsDetention',{
   detentionId:start.id,reasonText:'Échéance écoulée, accessoire rendu'},f.owner);
  assert.equal(done.status,'EXPIRED');
  const raw=await f.store.get('sessions/'+f.sid+'/inventory/'+lotId);
  assert.equal(raw.status,'AVAILABLE');assert.equal(raw.customsDetention,null);
  assert.equal((await f.store.get('sessions/'+f.sid+'/customsDetentions/'+start.id)).status,'EXPIRED');
  await assert.rejects(f.actionCmd('startCustomsDetention',{
   lotId,reason:'REGULATED_NO_LICENSE',reasonText:'Seconde retenue interdite',secured:true
  },f.owner),{code:'SO_CUSTOMS_HOLD_REPEAT'});
  assert.equal((await f.actionRead('inspectSoForgery',{lotId},f.owner)).quality,2);
 });
 test(prefix+' : libération anticipée, aucun déplacement de propriété, reçus et historique',async()=>{
  const f=await forgeryFixture(makeStore);
  const action=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(action.id)).documentId;
  const before=await f.store.get('sessions/'+f.sid+'/inventory/'+lotId);
  const detention=await f.actionCmd('startCustomsDetention',{lotId,
   reason:'REGULATED_NO_LICENSE',reasonText:'Contrôle des permis',secured:true},f.owner);
  const closed=await f.actionCmd('releaseCustomsDetention',{detentionId:detention.id,
   reasonText:'Permis régularisé et accessoire rendu'},f.owner);
  assert.equal(closed.status,'RELEASED');
  const after=await f.store.get('sessions/'+f.sid+'/inventory/'+lotId);
  assert.equal(after.ownerId,before.ownerId);assert.equal(after.holderId,before.holderId);
  assert.equal(after.location.kind,'CHARACTER');assert.equal(after.status,'AVAILABLE');
  const history=await f.store.list('sessions/'+f.sid+'/inventory/'+lotId+'/history');
  assert.ok(history.some(h=>h.kind==='SO_CUSTOMS_HOLD'));
  assert.ok(history.some(h=>h.kind==='SO_CUSTOMS_RELEASED'));
  await assert.rejects(f.actionCmd('releaseCustomsDetention',{detentionId:detention.id,
   reasonText:'Encore'},f.owner),{code:'SO_CUSTOMS_HOLD_FINISHED'});
 });
 test(prefix+' : refus acteur non MJ, absence de garde réelle et ancien Master',async()=>{
  const f=await forgeryFixture(makeStore);
  const action=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(action.id)).documentId;
  const input={lotId,reason:'REGULATED_NO_LICENSE',reasonText:'Permis absent',secured:true};
  await assert.rejects(f.actionRead('customsDetentionsAdmin'),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('startCustomsDetention',input),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('startCustomsDetention',{...input,secured:false},f.owner),{code:'SO_CUSTOMS_HOLD_CUSTODY'});
  await assert.rejects(f.actionCmd('startCustomsDetention',{...input,reason:'FAUX_DOCUMENT'},f.owner),{code:'SO_CUSTOMS_HOLD_REASON'});
  assert.deepEqual((await f.actionRead('customsDetentionsAdmin',{},f.owner)).cases,[]);
  const sid='sessions/'+f.sid,session=await f.store.get(sid);
  await f.store.runTransaction(async tx=>{
   const {customsDetentionVersion,...old}=session.spaceOutlaws;
   tx.set(sid,{...session,spaceOutlaws:old});
  });
  await assert.rejects(f.actionRead('customsDetentionsAdmin',{},f.owner),{code:'SO_CUSTOMS_HOLD_CLOSED'});
 });
 test(prefix+' : STOP SÉCURITÉ empêche une nouvelle retenue mais ne prolonge pas la durée réelle',async()=>{
  const f=await forgeryFixture(makeStore);
  const action=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(action.id)).documentId;
  const input={lotId,reason:'REGULATED_NO_LICENSE',reasonText:'Permis absent',secured:true};
  const detention=await f.actionCmd('startCustomsDetention',input,f.owner);
  await f.actionCmd('stopSafety',{reason:'Sécurité terrain'});
  f.advance(900000);
  const now=await f.actionRead('customsDetentionsAdmin',{},f.owner);
  assert.equal(now.cases.find(x=>x.id===detention.id).status,'EXPIRED');
  assert.equal((await f.actionRead('myInventory')).lots.find(x=>x.id===lotId).status,'AVAILABLE');
  const result=await f.actionCmd('releaseCustomsDetention',{
   detentionId:detention.id,reasonText:'Fin de retenue constatée'},f.owner);
  assert.equal(result.status,'EXPIRED');
 });
}
