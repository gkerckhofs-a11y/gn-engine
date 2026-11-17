import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {droidWorkFixture} from './space-droid-work-suite.mjs';
import {droidModules,droidModuleWork} from '../../src/shared/space-droid-modules.mjs';
import {accountId,moneyState} from '../../src/core/economy-state.mjs';
import {shopAccountId} from '../../src/core/space-outlaws-shop-state.mjs';
import {personTargetHtml,personMineHtml,personAdminHtml} from '../../web/person-actions.mjs';
import {droidWorkshopEditor} from '../../web/droid-modules.mjs';

export async function droidServiceFixture(makeStore,{code='DR-03',damaged=false,capacity=1,allowProtected=true}={}){
 const f=await droidWorkFixture(makeStore,{self:true,level:0,code,damaged});
 await f.store.runTransaction(async tx=>{
  const s=await tx.get(f.base),a=await tx.get(`${f.base}/accounts/${accountId(f.cid)}`),l=await tx.get(`${f.base}/inventory/module`);
  tx.set(`${f.base}/accounts/${a.id}`,{...a,balance:500,protectedCredits:200});
  tx.set(`${f.base}/shops/workshop`,{id:'workshop',versionId:s.versionId,name:'Atelier PNJ de recette',locationTargetId:'scene',revision:1});
  tx.set(`${f.base}/accounts/${shopAccountId('workshop')}`,{id:shopAccountId('workshop'),sessionId:s.id,ownerType:'SHOP',shopId:'workshop',status:'ACTIVE',balance:0,reserved:0,revision:1});
  tx.set(`${f.base}/inventory/module`,{...l,moduleState:{...l.moduleState,status:damaged?'DAMAGED':'OPERATIONAL',protectionCharge:0}});
 });
 for(const operation of ['INSTALL','REMOVE','REPAIR']){
  const old=await f.get(`personProfiles/${f.profiles[operation]}`);
  await f.actionCmd('savePersonProfile',{profileId:old.id,revision:old.revision,profile:{kind:'DROID_MODULE',moduleOperation:operation,clinicTargetId:'scene',partsItemId:'parts25',publicationState:'PUBLISHED',pnj:{shopId:'workshop',capacity,allowProtected}},reason:'Prestations PNJ préparées pour la recette'},f.owner);
 }
 const input=(operation='INSTALL',patch={})=>({...f.input(operation),useProtected:true,...patch});
 const prepare=(operation='INSTALL',patch={},actor=f.player)=>f.actionRead('preparePersonAction',input(operation,patch),actor);
 const start=async(operation='INSTALL',patch={},actor=f.player)=>{const p=await prepare(operation,patch,actor);return f.actionCmd('startPersonAction',{...input(operation,patch),confirmation:p.confirmation,present:true},actor);};
 return {...f,input,prepare,startModule:start,wallet:()=>f.get(`accounts/${accountId(f.cid)}`),till:()=>f.get(`accounts/${shopAccountId('workshop')}`),profile:op=>f.get(`personProfiles/${f.profiles[op]}`)};
}
export function droidServiceSuite(makeStore,prefix='Prestations PNJ droïdes'){
 test(`${prefix} : règlement atomique, aucune recette ni réparation après une interruption transactionnelle`,async()=>{
  const raw=makeStore();let fail=false;
  const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:fn=>raw.runTransaction(async tx=>{const result=await fn(tx);if(fail)throw Error('INTERRUPTION_PNJ');return result;})};
  const f=await droidServiceFixture(()=>wrapped,{damaged:true}),a=await f.startModule('REPAIR');f.advance(a.remainingMs);
  const wallet=await f.wallet(),till=await f.till(),stock=await f.profile('REPAIR'),ledger=await f.store.list(`${f.base}/ledger`);fail=true;
  await assert.rejects(f.finishCare(a),/INTERRUPTION_PNJ/);fail=false;
  assert.deepEqual(await f.wallet(),wallet);assert.deepEqual(await f.till(),till);assert.deepEqual(await f.profile('REPAIR'),stock);assert.deepEqual(await f.store.list(`${f.base}/ledger`),ledger);assert.equal((await f.get('inventory/parts')).quantity,20);assert.equal((await f.get('inventory/module')).moduleState.status,'DAMAGED');
  await f.finishCare(a);assert.equal((await f.till()).reserved,0);assert.equal((await f.get('inventory/parts')).quantity,16);
 });
 test(`${prefix} : pause, STOP et épisode suivant sans renouvellement de capacité ni double règlement`,async()=>{
  const {episodeHarness}=await import('./space-episodes-suite.mjs');
  const f=await droidServiceFixture(makeStore),e=await episodeHarness(f),a=await f.startModule();await e.stage('PAUSE');
  const closure=await e.read('prepareCampaignClosure',e.closeInput());assert.equal(closure.canClose,false);assert.ok(closure.blocks.some(b=>b.kind==='PERSON_ACTION'));
  f.advance(a.remainingMs);await e.stage('EN_JEU');await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});
  await f.actionCmd('stopSafetyMJ',{reason:'Arrêt de sécurité de recette'},f.owner);f.advance(a.remainingMs);await assert.rejects(f.finishCare(a),{code:'SESSION_NOT_RUNNING'});
  const s=await e.get('');await f.actionCmd('resumeSafety',{revision:s.revision,reason:'Reprise autorisée'},f.owner);await f.finishModule(a);
  const p=await f.profile('INSTALL'),till=await f.till(),module=await f.get('inventory/module');await e.close();await e.resume(await e.begin());
  assert.deepEqual(await e.get(`personProfiles/${p.id}`),p);assert.equal((await e.get(`accounts/${till.id}`)).balance,100);assert.equal((await e.get(`accounts/${till.id}`)).reserved,0);assert.deepEqual(await e.get('inventory/module'),module);assert.equal((await e.get('')).spaceOutlaws.droidServicesVersion,1);
  const d=await e.read('personTarget',{targetId:f.cid},f.player);assert.equal(d.profiles.find(x=>x.id===p.id).pnj.available,0);assert.match(personTargetHtml(d),/disabled>Vérifier/);
 });
 test(`${prefix} : six modules, tarifs natifs et ressources réelles sans compétence client`,async()=>{
  for(const m of droidModules){
   const f=await droidServiceFixture(makeStore,{code:m.code}),initial=await f.wallet();
   const q=await f.prepare();assert.equal(q.cost,0);assert.equal(q.payment.amount,m.level*50);assert.equal(q.durationSeconds,m.level===1?300:600);
   await f.finishModule(await f.startModule());const lot=await f.get('inventory/module');assert.equal(lot.status,'INSTALLED');
   await f.actionCmd('damageDroidModule',{moduleLotId:lot.id,revision:lot.revision,reason:'Incident préparé'},f.owner);
   const repair=await f.prepare('REPAIR');assert.equal(repair.payment.amount,m.level*50);assert.equal(repair.supplies[0].quantity,droidModuleWork(m.code,'REPAIR').partsValue/25);
   await f.finishModule(await f.startModule('REPAIR'));assert.equal((await f.get(`characters/${f.cid}`)).droidModules[0].status,'OPERATIONAL');
   await f.finishModule(await f.startModule('REMOVE'));assert.equal((await f.get('inventory/module')).status,'AVAILABLE');assert.equal((await f.get('inventory/module')).moduleState.protectionCharge,0);
   const total=m.level*100+50,a=await f.wallet(),b=await f.till();assert.equal(a.balance+a.protectedCredits,initial.balance+initial.protectedCredits-total);assert.equal(b.balance,total);assert.equal(b.reserved,0);assert.equal((await f.points()).available,5);assert.equal((await f.get('inventory/parts')).quantity,20-repair.supplies[0].quantity);assert.equal(f.rollCount(),0);
  }
 });
 test(`${prefix} : réservation mixte, caisse bloquée, annulation et reçus sans double remboursement`,async()=>{
  const f=await droidServiceFixture(makeStore,{damaged:true});await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,protectedCredits:75}));
  const before=await f.wallet(),a=await f.startModule('REPAIR');assert.equal(a.payment.amount,100);assert.equal(a.payment.protectedAmount,75);assert.equal((await f.wallet()).balance,before.balance-25);assert.equal((await f.wallet()).protectedCredits,0);assert.equal(moneyState(await f.till()).available,0);assert.equal((await f.profile('REPAIR')).serviceStock.reserved,1);
  await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});
  const requestId=randomUUID(),input={actionId:a.id,reason:'Interruption de la prestation',requestId},r=await f.actionCmd('cancelPersonAction',input);assert.deepEqual(await f.actionCmd('cancelPersonAction',input),r);
  const after=await f.wallet();assert.equal((await f.get(`personActions/${a.id}`)).droidPayment.status,'REFUNDED');assert.equal(after.balance,before.balance);assert.equal(after.protectedCredits,before.protectedCredits);assert.equal((await f.till()).balance,0);assert.equal((await f.till()).reserved,0);assert.equal((await f.profile('REPAIR')).serviceStock.remaining,1);assert.equal((await f.profile('REPAIR')).serviceStock.reserved,0);assert.equal((await f.get('inventory/parts')).quantity,20);assert.equal((await f.get('inventory/module')).moduleState.status,'DAMAGED');
  const b=await f.startModule('REPAIR');f.advance(b.remainingMs);const requestId2=randomUUID(),done=await f.finishCare(b,f.player,{requestId:requestId2});assert.deepEqual(await f.finishCare(b,f.player,{requestId:requestId2}),done);assert.equal((await f.get(`personActions/${b.id}`)).droidPayment.status,'PAID');assert.equal((await f.profile('REPAIR')).serviceStock.remaining,0);assert.equal((await f.till()).balance,100);assert.equal((await f.till()).reserved,0);assert.equal((await f.get('inventory/module')).status,'AVAILABLE');
 });
 test(`${prefix} : dernière prestation disputée, une seule réservation et aucun prélèvement adverse`,async()=>{
  const f=await droidServiceFixture(makeStore);
  await f.edit(`characters/${f.tid}`,c=>({...c,nature:'DROID'}));await f.store.runTransaction(async tx=>{const l=await tx.get(`${f.base}/inventory/module`),a=await tx.get(`${f.base}/accounts/${accountId(f.tid)}`);tx.set(`${f.base}/inventory/other-module`,{...l,id:'other-module',ownerId:f.tid,holderId:f.tid,location:{kind:'CHARACTER',id:f.tid}});tx.set(`${f.base}/accounts/${a.id}`,{...a,balance:500});});
  const one=f.input(),two=f.input('INSTALL',{targetId:f.tid,moduleLotId:'other-module'}),q1=await f.actionRead('preparePersonAction',one),q2=await f.actionRead('preparePersonAction',two,f.other);
  const r=await Promise.allSettled([f.actionCmd('startPersonAction',{...one,present:true,confirmation:q1.confirmation}),f.actionCmd('startPersonAction',{...two,present:true,confirmation:q2.confirmation},f.other)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);
  assert.equal((await f.profile('INSTALL')).serviceStock.reserved,1);assert.equal((await f.till()).reserved,100);const loser=r[0].status==='rejected'?f.cid:f.tid;assert.equal((await f.get(`accounts/${accountId(loser)}`)).protectedCredits,200);assert.equal((await f.get(`accounts/${accountId(loser)}`)).balance,500);
 });
 test(`${prefix} : offre modifiée, crédits insuffisants, protection non autorisée et ancien manifeste refusés`,async()=>{
  const f=await droidServiceFixture(makeStore,{allowProtected:false});await assert.rejects(f.prepare(),{code:'SO_PROTECTED_PURCHASE'});const q=await f.prepare('INSTALL',{useProtected:false});
  const p=await f.profile('INSTALL');await f.actionCmd('savePersonProfile',{profileId:p.id,revision:p.revision,profile:{...p,pnj:{shopId:'workshop',capacity:2,allowProtected:false}},reason:'Nouvelle capacité préparée'},f.owner);
  await assert.rejects(f.actionCmd('startPersonAction',{...f.input('INSTALL',{useProtected:false}),present:true,confirmation:q.confirmation}),{code:'STALE_REVISION'});
  await f.edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:0}));await assert.rejects(f.prepare('INSTALL',{useProtected:false}),{code:'INSUFFICIENT_FUNDS'});assert.equal((await f.till()).balance,0);assert.equal((await f.profile('INSTALL')).serviceStock.reserved,0);
  await f.edit('',s=>{const {droidServicesVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});await assert.rejects(f.prepare('INSTALL',{useProtected:false}),{code:'SO_GAMEPLAY_NOT_OPEN'});
  assert.ok(!(await f.actionRead('personTarget',{targetId:f.cid})).profiles.some(p=>p.pnj));
 });
 test(`${prefix} : atelier hors service et accès révoqué, remboursement MJ et capacité conservée`,async()=>{
  const f=await droidServiceFixture(makeStore),a=await f.startModule(),p=await f.profile('INSTALL');
  await assert.rejects(f.actionCmd('savePersonProfile',{profileId:p.id,revision:p.revision,profile:{...p,pnj:{shopId:'workshop',capacity:3,allowProtected:true}},reason:'Ne pas effacer une réservation'},f.owner),{code:'FIELD_TARGET_BUSY'});
  await f.edit('fieldStates/scene',x=>({...x,status:'OFFLINE',offlineUntilGameMs:null}));f.advance(a.remainingMs);await assert.rejects(f.finishCare(a),{code:'FIELD_UNAVAILABLE'});
  await f.actionCmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.finishCare(a),{code:'FORBIDDEN'});
  await f.actionCmd('cancelPersonActionMJ',{actionId:a.id,reason:'Accès révoqué et atelier indisponible'},f.owner);assert.equal((await f.wallet()).protectedCredits,200);assert.equal((await f.profile('INSTALL')).serviceStock.remaining,1);assert.equal((await f.till()).balance,0);assert.equal((await f.get('inventory/module')).status,'AVAILABLE');
 });
 test(`${prefix} : interface et propriétaire, tarif affiché avant accord et aucune dotation automatique`,async()=>{
  const f=await droidServiceFixture(makeStore),d=await f.actionRead('personTarget',{targetId:f.cid});assert.match(personTargetHtml(d),/Utiliser mes crédits protégés/);assert.match(personTargetHtml(d),/Atelier PNJ de recette/);
  const foreign=await f.actionRead('personTarget',{targetId:f.cid},f.other);assert.ok(!foreign.profiles.some(p=>p.pnj));await assert.rejects(f.prepare('INSTALL',{targetId:f.tid}),{code:'SO_DROID_CONSENT'});
  await assert.rejects(f.actionCmd('savePersonProfile',{profile:{kind:'DROID_MODULE'},reason:'Tentative joueur'}),{code:'FORBIDDEN'});
  const admin=await f.actionRead('personAdmin',{},f.owner);assert.match(droidWorkshopEditor(await f.profile('INSTALL'),admin),/Prestations PNJ encore disponibles/);assert.match(personAdminHtml(admin),/prestation PNJ/);
  const a=await f.startModule();assert.match(personMineHtml(await f.actionRead('myPersonActions')),/100 Cr de main-d’œuvre/);assert.equal(a.payment.status,'HELD');await f.cancelCare(a);
  await f.edit('inventory/module',l=>({...l,ownerId:f.tid}));await assert.rejects(f.prepare(),{code:'SO_DROID_MODULE'});assert.equal((await f.store.list(`${f.base}/inventory`)).filter(l=>l.item?.droidModule).length,1);
 });
}
