import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {admissionFixture} from './admissions-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {initialClassKit} from '../../src/shared/initial-class-kit.mjs';
import {createWorkflow} from '../../src/core/workflow.mjs';

export const rehearsal={title:'Les passagers de Port-Brèche · session fictive',story:'Un transport attend sa clairance. Une messagère a disparu.',date:'2036-05-17',time:'14 h (heure belge fictive)',duration:'3 h de démonstration',place:'Spatioport fictif',price:1200,capacity:2,holdMinutes:15,sale:'CLOSED',published:false,policyVersion:'demo-1',terms:'Conditions fictives de recette.',privacy:'Notice de test sur données synthétiques.',guidance:'Jouer avec les autres équipages.',practical:'Matériel fictif fourni.',cancellation:'Annulation simulée à la régie de test.',seller:'Organisation fictive de Port-Brèche',contact:'Contact de test à la régie fictive.',faq:'Première aventure ? La régie fictive accueille les nouveaux joueurs.'};
export async function ticketFixture(makeStore){
 const f=await admissionFixture(makeStore);await f.configure();
 let at=1000000;const wf=createWorkflow({store:f.store,ownerEmail:f.owner.email,ticketSandbox:true,now:()=>at});
 const call=(action,input={},actor=f.owner)=>wf.dispatch(action,actor,{sessionId:f.sid,...input});
 const cmd=(action,input={},actor=f.owner)=>call(action,{requestId:randomUUID(),...input},actor);
 const cc=(action,input)=>wf.dispatch(action,f.owner,{campaignId:f.campaignId,requestId:randomUUID(),...input});
 let rev=1;
 for(const [id,name,profession] of [['vigie','Nora Venn','Vigie'],['guide','Sol Barde','Guide des dunes'],['courrier','Ivo Marne','Courrier']]){
  await cc('saveCentralCharacter',{characterId:id,characterRevision:0,draftRevision:rev++,character:{...centralTestCharacter,displayName:name,profession,creationPlan:{classId:'COM',speciesId:'species-test',secondaryId:'MED-02'},relations:[]},reason:'Distribution fictive'});
 }
 const bindings=[];
 for(const slot of initialClassKit('COM').slots){const itemId='kit_'+slot.id;bindings.push({slotId:slot.id,itemId});await cc('saveCentralItem',{itemId,itemRevision:0,draftRevision:rev++,item:{...centralTestItem,name:slot.label,kind:slot.requiresConsumable?'STACKABLE':'INDIVIDUAL',consumable:slot.requiresConsumable,pillable:true},reason:'Kit fictif'});}
 await cc('saveCentralClassKit',{classKitId:'COM',classKitRevision:0,draftRevision:rev,classKit:{bindings,gmNotes:'Notes secrètes de test'},reason:'Kit canonique'});
 const q=await call('previewSpaceOutlawsRelease');assert.deepEqual(q.blockers,[]);
 await cmd('releaseSpaceOutlaws',{confirmation:q.confirmation,reason:'Master fictif'});
 const configure=async(settings=rehearsal)=>cmd('ticketPublish',{settings,revision:(await call('ticketDesk')).event?.revision??0});
 const role=async(id,extra={})=>cmd('ticketRole',{roleId:id,revision:(await call('ticketDesk')).event.revision,teaser:'Une rencontre au port avec '+id,style:'Enquête',early:'Pour votre préparation uniquement : '+id,portrait:['vigie','guide','courrier'].indexOf(id),enabled:true,options:{weaponApplicable:true,startingInformation:''},...extra});
 const open=async(capacity=2)=>{await configure({...rehearsal,capacity});for(const id of ['vigie','guide','courrier'])await role(id);await configure({...rehearsal,capacity,published:true,sale:'OPEN'});};
 const reserve=async(actor=f.player)=>{const e=await call('ticketPage',{},null);return cmd('ticketReserve',{revision:e.revision,policyVersion:e.policyVersion,price:e.price,name:'Joueur fictif',consent:true},actor);};
 const pay=(actor,attempt,outcome='SUCCESS')=>call('ticketMockCheckout',{attempt,outcome},actor);
 return {...f,call,cmd,wf,configure,role,open,reserve,pay,advance:ms=>{at+=ms;}};
}
export function ticketSuite(makeStore){
 test('Catalogue : publication volontaire, profil M2 validé, rôles indisponibles écartés et projections sans secrets',async()=>{
  const f=await ticketFixture(makeStore);await f.configure();
  await assert.rejects(f.call('ticketPage',{},null));assert.deepEqual(await f.wf.dispatch('ticketCatalogue',null,{}),[]);
  await assert.rejects(f.configure({...rehearsal,published:true,sale:'OPEN'}),{code:'TICKET_ROLES'});
  await assert.rejects(f.role('inconnu'));await f.role('vigie');await f.role('guide');
  await f.configure({...rehearsal,published:true,sale:'OPEN'});const d=await f.call('ticketPage',{},null);assert.equal(d.remaining,2);
  assert.doesNotMatch(JSON.stringify(d),/gmNotes|biography|secret|"uid"|early|options|versionId|startingInformation/i);
  await assert.rejects(f.call('ticketDesk',{},f.player));await assert.rejects(f.cmd('ticketPublish',{revision:4,settings:rehearsal},f.player));
 });
 test('Dernière place, reprise sur un autre appareil, prix périmé, garde expirée et compte isolé',async()=>{
  const f=await ticketFixture(makeStore);await f.open(1);const e=await f.call('ticketPage',{},null),p={revision:e.revision,price:e.price,policyVersion:e.policyVersion,name:'Participant fictif',consent:true};
  await assert.rejects(f.cmd('ticketReserve',{...p,price:1},f.player));await assert.rejects(f.cmd('ticketReserve',{...p,consent:false},f.player));
  const result=await Promise.allSettled([f.cmd('ticketReserve',p,f.player),f.cmd('ticketReserve',p,f.other)]);
  assert.equal(result.filter(x=>x.status==='fulfilled').length,1);const [winner,other]=result[0].status==='fulfilled'?[f.player,f.other]:[f.other,f.player];
  assert.equal((await f.call('ticketMine',{},other)),null);const o=await f.call('ticketMine',{},winner);assert.equal((await f.cmd('ticketReserve',p,winner)).attempt,o.attempt);
  assert.equal((await f.wf.dispatch('ticketAccount',winner,[]).catch(()=>null)),null);
  assert.equal((await f.wf.dispatch('ticketAccount',winner,{}))[0].attempt,o.attempt);
  f.advance(16*60000);assert.equal((await f.call('ticketMine',{},winner)).payment,'EXPIRED');assert.equal((await f.call('ticketPage',{},null)).remaining,1);
  assert.equal((await f.cmd('ticketReserve',p,other)).payment,'CHECKOUT_PENDING');
 });

 test('Prestataire test : retour forgé, paiement sans retour navigateur, double notification, montant erroné et arrivée tardive',async()=>{
  const f=await ticketFixture(makeStore);await f.open(1);const old=await f.reserve();
  assert.equal((await f.call('ticketSync',{attempt:old.attempt},f.player)).payment,'CHECKOUT_PENDING');
  await assert.rejects(f.call('ticketSync',{attempt:old.attempt,status:'PAID'},f.player));
  await assert.rejects(f.pay(f.other,old.attempt));
  f.advance(16*60000);const current=await f.reserve(f.other);const p=await f.pay(f.other,current.attempt);
  assert.equal(p.payment,'PAID');assert.deepEqual(await f.pay(f.other,current.attempt),p);assert.equal((await f.call('ticketPage',{},null)).remaining,0);
  assert.equal((await f.pay(f.player,old.attempt)).payment,'PAID_NEEDS_RECONCILIATION');
  assert.equal((await f.store.list('ticketEvents/'+f.sid+'/outbox')).length,1);
  const g=await ticketFixture(makeStore);await g.open();const a=await g.reserve();await g.store.runTransaction(async tx=>tx.set('ticketProviderTest/'+a.attempt,{id:a.attempt,sessionId:g.sid,outcome:'SUCCESS',amount:1,currency:'EUR',at:10}));
  assert.equal((await g.call('ticketSync',{attempt:a.attempt},g.player)).payment,'PAID_NEEDS_RECONCILIATION');
  const b=await g.reserve(g.other);assert.equal((await g.pay(g.other,b.attempt,'FAILURE')).payment,'FAILED');
 });

 test('Galerie payée : collision atomique, conservation du billet, contrôle du stock et confidentialité',async()=>{
  const f=await ticketFixture(makeStore);await f.open();await assert.rejects(f.call('ticketGallery',{},f.player),{code:'TICKET_UNPAID'});
  for(const actor of [f.player,f.other]){const o=await f.reserve(actor);await f.pay(actor,o.attempt);}
  await f.role('courrier',{enabled:false});await assert.rejects(f.role('guide',{enabled:false}),{code:'TICKET_CAPACITY'});
  const g=await f.call('ticketGallery',{},f.player);assert.doesNotMatch(JSON.stringify(g),/startingInformation|préparation uniquement|gmNotes|biography|holder/);
  const p={roleId:'vigie',revision:g.revision,orderRevision:g.orderRevision,confirm:true};
  const results=await Promise.allSettled([f.cmd('ticketSelect',p,f.player),f.cmd('ticketSelect',p,f.other)]);
  assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const loser=results[0].status==='fulfilled'?f.other:f.player;
  const o=await f.call('ticketMine',{},loser);assert.equal(o.roleId,null);assert.equal(o.payment,'PAID');
  await assert.rejects(f.cmd('ticketSelect',{...p,roleId:'courrier'},loser));await assert.rejects(f.cmd('ticketSelect',{...p,uid:f.player.uid},loser));
 });

}
