import test from 'node:test';
import assert from 'node:assert/strict';
import {forgeryFixture} from './space-forgery-suite.mjs';

export function customsSeizureSuite(makeStore,prefix='Douanes SO : saisie formelle'){
 const basis={reason:'REGULATED_NO_LICENSE',reasonText:'Permis de transport réglementé absent',secured:true};
 const decision=(detentionId,patch={})=>({
  detentionId,decision:'REGULARIZATION_FAILED',reasonText:'Régularisation non obtenue',
  authorized:true,officialCustodyConfirmed:true,...patch});
 async function fixture(){
  const f=await forgeryFixture(makeStore,{second:true});
  const a=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(a.id)).documentId;
  const detention=await f.actionCmd('startCustomsDetention',{lotId,...basis},f.owner);
  return {...f,lotId,detention};
 }
 test(prefix+' : décision MJ, inventaire officiel et quittance joueur sans changement de titre',async()=>{
  const f=await fixture();
  const before=await f.store.get('sessions/'+f.sid+'/inventory/'+f.lotId);
  const seized=await f.actionCmd('seizeCustomsDetention',decision(f.detention.id),f.owner);
  assert.equal(seized.status,'SEIZED');
  assert.equal(seized.lotId,f.lotId);
  assert.ok(seized.receiptCode);
  assert.doesNotMatch(JSON.stringify(seized),/FIBRE_PAPIER|reasonText|decisionBy/);
  const lot=await f.store.get('sessions/'+f.sid+'/inventory/'+f.lotId);
  assert.equal(lot.status,'SEIZED');
  assert.equal(lot.ownerId,before.ownerId);
  assert.equal(lot.holderId,'CUSTOMS_OFFICIAL');
  assert.deepEqual(lot.location,{kind:'CUSTOMS',id:'CUSTOMS_OFFICIAL'});
  assert.equal(lot.origin.kind,'SO_FORGERY');
  assert.equal((await f.store.get('sessions/'+f.sid+'/customsDetentions/'+f.detention.id)).status,'SEIZED');
  const stock=await f.store.get('sessions/'+f.sid+'/customsOfficialInventory/'+f.lotId);
  assert.equal(stock.lotId,f.lotId);assert.equal(stock.receiptCode,seized.receiptCode);
  assert.equal((await f.actionRead('inspectSoForgery',{lotId:f.lotId},f.owner)).quality,2);
  const admin=await f.actionRead('customsSeizuresAdmin',{},f.owner);
  assert.equal(admin.officialStock[0].id,seized.id);
  assert.match(admin.officialStock[0].reasonText,/Régularisation/);
  const receipt=await f.actionRead('myCustomsSeizures');
  assert.equal(receipt.receipts[0].receiptCode,seized.receiptCode);
  assert.equal(receipt.receipts[0].status,'SEIZED');
  assert.doesNotMatch(JSON.stringify(receipt),/FIBRE_PAPIER|decisionBy|reasonText/);
  assert.deepEqual((await f.actionRead('myCustomsSeizures',{},f.other)).receipts,[]);
  await assert.rejects(f.actionRead('customsSeizuresAdmin'),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('seizeCustomsDetention',decision(f.detention.id)),{code:'FORBIDDEN'});
  await assert.rejects(f.actionCmd('seizeCustomsDetention',decision(f.detention.id),f.owner),
   {code:'SO_CUSTOMS_HOLD_FINISHED'});
 });
 test(prefix+' : expiration à 15 min interdit une saisie rétroactive',async()=>{
  const f=await fixture();
  f.advance(900000);
  await assert.rejects(f.actionCmd('seizeCustomsDetention',decision(f.detention.id),f.owner),
   {code:'SO_CUSTOMS_HOLD_EXPIRED'});
  assert.equal((await f.actionRead('myInventory')).lots.find(x=>x.id===f.lotId).status,'AVAILABLE');
  assert.ok(!(await f.store.get('sessions/'+f.sid+'/customsOfficialInventory/'+f.lotId)));
  const admin=await f.actionRead('customsDetentionsAdmin',{},f.owner);
  assert.equal(admin.cases[0].status,'EXPIRED');
 });
 test(prefix+' : aucune saisie sans décision ou transfert physique confirmé',async()=>{
  const f=await fixture();
  await assert.rejects(f.actionCmd('seizeCustomsDetention',
   decision(f.detention.id,{authorized:false}),f.owner),{code:'SO_CUSTOMS_SEIZURE_DECISION'});
  await assert.rejects(f.actionCmd('seizeCustomsDetention',
   decision(f.detention.id,{officialCustodyConfirmed:false}),f.owner),{code:'SO_CUSTOMS_SEIZURE_DECISION'});
  await assert.rejects(f.actionCmd('seizeCustomsDetention',
   decision(f.detention.id,{decision:'FAUX_DOCUMENT'}),f.owner),{code:'SO_CUSTOMS_SEIZURE_DECISION'});
  assert.equal((await f.store.get('sessions/'+f.sid+'/inventory/'+f.lotId)).status,'CUSTOMS_HELD');
 });
 test(prefix+' : STOP SÉCURITÉ interdit de saisir, sans retarder la fin réelle',async()=>{
  const f=await fixture();
  await f.actionCmd('stopSafety',{reason:'Interruption de sécurité'});
  await assert.rejects(f.actionCmd('seizeCustomsDetention',decision(f.detention.id),f.owner),
   {code:'SESSION_NOT_RUNNING'});
  f.advance(900000);
  const cases=await f.actionRead('customsDetentionsAdmin',{},f.owner);
  assert.equal(cases.cases[0].status,'EXPIRED');
 });
}
