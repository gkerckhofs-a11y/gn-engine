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
 const role=async(id,extra={})=>cmd('ticketRole',{roleId:id,confirm:true,reason:'Paramétrage synthétique',revision:(await call('ticketDesk')).event.revision,teaser:'Une rencontre au port avec '+id,style:'Enquête',early:'Pour votre préparation uniquement : '+id,portrait:['vigie','guide','courrier'].indexOf(id),enabled:true,options:{weaponApplicable:true,startingInformation:''},...extra});
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

 test('Pré-jeu limité et naissance au briefing, réessais sans deuxième kit ni droits d’un autre compte',async()=>{
  const f=await ticketFixture(makeStore);await f.open();const a=await f.reserve();await f.pay(f.player,a.attempt);
  const g=await f.call('ticketGallery',{},f.player);await f.cmd('ticketSelect',{roleId:'vigie',confirm:true,revision:g.revision,orderRevision:g.orderRevision},f.player);
  const pre=await f.call('ticketPreparation',{},f.player);assert.equal(pre.live,false);assert.equal(pre.name,'Nora Venn');
  assert.doesNotMatch(JSON.stringify(pre),/gmNotes|playerSecrets|Note M2|objectif/i);await assert.rejects(f.call('ticketPreparation',{},f.other));
  await assert.rejects(f.cmd('ticketActivate',{},f.player));await assert.rejects(f.cmd('ticketBriefing',{confirm:true},f.player));
  assert.equal((await f.store.list('sessions/'+f.sid+'/accounts')).length,0);
  assert.ok((await f.cmd('ticketReadBrief',{},f.player)).readAt);
  await f.cmd('ticketBriefing',{confirm:true});await f.cmd('ticketBriefing',{confirm:true});
  assert.equal((await f.cmd('ticketActivate',{},f.player)).alreadyBorn,true);
  const me=await f.call('mySession',{},f.player);assert.equal(me.character.id,'vigie');assert.equal(me.character.hp,4);assert.equal(me.actionPoints.available,5);
  assert.equal((await f.store.list('sessions/'+f.sid+'/characters')).length,1);const accounts=await f.store.list('sessions/'+f.sid+'/accounts');assert.equal(accounts.filter(x=>x.protectedCredits===200).length,1);
  assert.equal((await f.store.get('sessions/'+f.sid)).accepted,1);assert.equal((await f.call('ticketPreparation',{},f.player)).live,true);
 });

 test('Accueil, droits de réception, geste commercial, correction après exposition, remboursement et reprise',async()=>{
  const f=await ticketFixture(makeStore);await f.open(2);
  await f.cmd('setStaff',{revision:1,email:f.mj.email,role:'RECEPTION',active:true,reason:'Accueil fictif'});
  const o=await f.reserve();const correction=async(operation,extra={},actor=f.owner)=>{
   const d=await f.call('ticketDesk'),row=d.rows[0];return f.cmd('ticketCorrect',{key:row.key,orderRevision:row.revision,operation,reason:'Décision de recette',confirm:true,...extra},actor);
  };
  const desk=await f.call('ticketDesk',{},f.mj);assert.equal(desk.edit,false);assert.equal(desk.rows[0].name,'Joueur fictif');assert.ok(!('key' in desk.rows[0]));
  assert.doesNotMatch((await f.call('ticketExport',{},f.mj)).csv,/@|prix|email|\bEUR\b/i);
  await assert.rejects(correction('GIFT',{},f.mj),{code:'FORBIDDEN'});await correction('GIFT');
  assert.equal((await f.call('ticketDesk')).stats.paid,0);assert.equal((await f.call('ticketDesk')).stats.gifts,1);
  await correction('REMIND');assert.equal((await f.store.list('ticketEvents/'+f.sid+'/outbox')).filter(x=>x.kind==='ROLE_REMINDER').length,1);
  await correction('REASSIGN',{roleId:'vigie'});await f.call('ticketPreparation',{},f.player);
  await assert.rejects(correction('REASSIGN',{roleId:'guide'}),{code:'TICKET_EXPOSURE'});await correction('REASSIGN',{roleId:'guide',acknowledgeExposure:true});
  assert.equal((await f.call('ticketPreparation',{},f.player)).name,'Sol Barde');
  await correction('CANCEL',{acknowledgeExposure:true});await assert.rejects(f.call('ticketPreparation',{},f.player));
  await f.pay(f.player,o.attempt);let d=await f.call('ticketDesk');assert.equal(d.exceptions.length,1);
  const input={requestId:randomUUID(),orderRevision:d.rows[0].revision,exceptionId:o.attempt};
  await correction('REFUND_EXCEPTION',input);await correction('REFUND_EXCEPTION',input);
  assert.equal((await f.call('ticketDesk')).exceptions.length,0);assert.equal((await f.call('ticketPage',{},null)).remaining,2);
  const fresh=await f.reserve();await f.pay(f.player,fresh.attempt);await correction('REASSIGN',{roleId:'vigie'});
  await f.cmd('ticketBriefing',{confirm:true});await correction('REFUND',{acknowledgeExposure:true});
  assert.equal((await f.call('ticketMine',{},f.player)).payment,'REFUNDED');await assert.rejects(f.call('ticketPreparation',{},f.player));
  assert.ok(!(await f.call('mySession',{},f.player)).character);assert.equal((await f.store.get('sessions/'+f.sid)).accepted,1);
 });

}
