import test from 'node:test';
import assert from 'node:assert/strict';
import {forgeryFixture} from './space-forgery-suite.mjs';

export function customsAppealSuite(makeStore,prefix='Douanes SO : contestation'){
 const basis={reason:'REGULATED_NO_LICENSE',reasonText:'Permis fictif absent',secured:true};
 async function fixture(){
  const f=await forgeryFixture(makeStore,{second:true});
  const work=await f.start();f.advance(270000);f.setDie(4);
  const lotId=(await f.finish(work.id)).documentId;
  const held=await f.actionCmd('startCustomsDetention',{lotId,...basis},f.owner);
  const seized=await f.actionCmd('seizeCustomsDetention',{
   detentionId:held.id,decision:'REGULARIZATION_FAILED',reasonText:'Régularisation refusée par le MJ',
   authorized:true,officialCustodyConfirmed:true
  },f.owner);
  return {...f,lotId,held,seized};
 }
 test(prefix+' : le propriétaire conteste, seul le MJ voit les dossiers complets',async()=>{
  const f=await fixture();
  const reason='Je présente un justificatif de fiction à examiner.';
  const requested=await f.actionCmd('submitCustomsAppeal',{seizureId:f.seized.id,reason});
  assert.equal(requested.status,'PENDING');
  assert.equal(requested.receiptCode,f.seized.receiptCode);
  assert.equal((await f.actionRead('myCustomsAppeals')).appeals[0].reason,reason);
  assert.deepEqual((await f.actionRead('myCustomsAppeals',{},f.other)).appeals,[]);
  const admin=await f.actionRead('customsAppealsAdmin',{},f.owner);
  assert.equal(admin.appeals[0].ownerId,f.cid);
  assert.equal(admin.appeals[0].reason,reason);
  await assert.rejects(f.actionRead('customsAppealsAdmin'),{code:'FORBIDDEN'});
  assert.equal((await f.store.get('sessions/'+f.sid+'/inventory/'+f.lotId)).status,'SEIZED');
  assert.equal((await f.actionRead('myCustomsSeizures')).receipts[0].status,'SEIZED');
  assert.equal((await f.store.list('sessions/'+f.sid+'/customsSeizureAppeals')).length,1);
 });
 test(prefix+' : pas de double contestation ni de contestation au nom d’un autre joueur',async()=>{
  const f=await fixture();
  const payload={seizureId:f.seized.id,reason:'Requête motivée'};
  await assert.rejects(f.actionCmd('submitCustomsAppeal',payload,f.other),{code:'FORBIDDEN'});
  await f.actionCmd('submitCustomsAppeal',payload);
  await assert.rejects(f.actionCmd('submitCustomsAppeal',payload),{code:'SO_CUSTOMS_APPEAL_EXISTS'});
  await assert.rejects(f.actionCmd('submitCustomsAppeal',{...payload,reason:' '}),
   {code:'SO_CUSTOMS_APPEAL_REASON'});
 });
 test(prefix+' : décision MJ motivée sans déplacement de lot, retour distinct',async()=>{
  const f=await fixture();
  await f.actionCmd('submitCustomsAppeal',{seizureId:f.seized.id,reason:'Le document du port serait valable.'});
  const command={seizureId:f.seized.id,outcome:'RETURN_RECOMMENDED',
    publicReply:'Présentez-vous au MJ pour une remise éventuelle.',
    privateReason:'Indice de fiction vérifié en régie'};
  await assert.rejects(f.actionCmd('decideCustomsAppeal',command),{code:'FORBIDDEN'});
  const result=await f.actionCmd('decideCustomsAppeal',command,f.owner);
  assert.equal(result.status,'DECIDED');
  assert.equal(result.outcome,'RETURN_RECOMMENDED');
  assert.doesNotMatch(JSON.stringify(result),/Indice de fiction vérifié|decidedBy/);
  const read=(await f.actionRead('myCustomsAppeals')).appeals[0];
  assert.equal(read.status,'DECIDED');
  assert.match(read.publicReply,/Présentez-vous/);
  assert.doesNotMatch(JSON.stringify(read),/Indice de fiction vérifié|sourceUid|decidedBy/);
  const privateRecord=(await f.actionRead('customsAppealsAdmin',{},f.owner)).appeals[0];
  assert.match(privateRecord.privateReason,/Indice de fiction/);
  assert.equal((await f.store.get('sessions/'+f.sid+'/inventory/'+f.lotId)).status,'SEIZED');
  assert.equal((await f.actionRead('myCustomsSeizures')).receipts[0].status,'SEIZED');
  await assert.rejects(f.actionCmd('decideCustomsAppeal',command,f.owner),
    {code:'SO_CUSTOMS_APPEAL_DECIDED'});
  await f.actionCmd('returnCustomsSeizure',{
    seizureId:f.seized.id,reasonText:'Retour physique effectué par le MJ',
    authorized:true,physicalReturnConfirmed:true
  },f.owner);
  assert.equal((await f.actionRead('myCustomsAppeals')).appeals[0].status,'CLOSED_RETURNED');
 });
 test(prefix+' : décision refusée sans réponse valide ou sur une saisie déjà restituée',async()=>{
  const f=await fixture();
  await f.actionCmd('submitCustomsAppeal',{seizureId:f.seized.id,reason:'Demande de contrôle'});
  const command={seizureId:f.seized.id,outcome:'MAINTAINED',
    publicReply:'Décision motivée',privateReason:'Faits du dossier'};
  await assert.rejects(f.actionCmd('decideCustomsAppeal',{...command,outcome:'GRANT_ADMIN'},f.owner),
    {code:'SO_CUSTOMS_APPEAL_DECISION'});
  await assert.rejects(f.actionCmd('decideCustomsAppeal',{...command,publicReply:' '},f.owner),
    {code:'SO_CUSTOMS_APPEAL_REPLY'});
  await f.actionCmd('returnCustomsSeizure',{
    seizureId:f.seized.id,reasonText:'Décision distincte de remise',
    authorized:true,physicalReturnConfirmed:true
  },f.owner);
  await assert.rejects(f.actionCmd('decideCustomsAppeal',command,f.owner),
    {code:'SO_CUSTOMS_APPEAL_CLOSED'});
 });
 test(prefix+' : la restitution clôt une demande dans les vues, sans effacer la requête',async()=>{
  const f=await fixture();
  const input={seizureId:f.seized.id,reason:'Demande de restitution motivée'};
  await f.actionCmd('submitCustomsAppeal',input);
  assert.equal((await f.actionRead('myCustomsAppeals')).appeals[0].status,'PENDING');
  await f.actionCmd('returnCustomsSeizure',{
    seizureId:f.seized.id,reasonText:'Pièce restituée au personnage',
    authorized:true,physicalReturnConfirmed:true
  },f.owner);
  assert.equal((await f.actionRead('myCustomsAppeals')).appeals[0].status,'CLOSED_RETURNED');
  assert.equal((await f.actionRead('customsAppealsAdmin',{},f.owner)).appeals[0].status,'CLOSED_RETURNED');
  assert.equal((await f.store.get('sessions/'+f.sid+'/customsSeizureAppeals/'+f.seized.id)).status,'PENDING');
 });
 test(prefix+' : une saisie restituée ne peut plus faire l’objet d’une nouvelle demande',async()=>{
  const f=await fixture();
  await f.actionCmd('returnCustomsSeizure',{
   seizureId:f.seized.id,reasonText:'Décision de retour MJ',
   authorized:true,physicalReturnConfirmed:true
  },f.owner);
  await assert.rejects(f.actionCmd('submitCustomsAppeal',{
   seizureId:f.seized.id,reason:'Contestation tardive'
  }),{code:'SO_CUSTOMS_APPEAL_CLOSED'});
 });
}
