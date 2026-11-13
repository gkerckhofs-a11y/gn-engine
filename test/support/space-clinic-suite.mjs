import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {healthFixture} from './space-outlaws-health-suite.mjs';
import {actionMenuItems} from '../../web/player-action-menu.mjs';
import {personAdminHtml} from '../../web/person-actions.mjs';
export async function clinicFixture(makeStore,{level=2,kind='CLINIC_SAFE',...options}={}){
 const f=await healthFixture(makeStore,options),base=`sessions/${f.sid}`;
 const edit=(p,fn)=>f.store.runTransaction(async tx=>tx.set(`${base}/${p}`,fn(await tx.get(`${base}/${p}`))));
 await edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='MED-03'?{...s,level}:s)}}));
 const lots=await f.store.list(`${base}/inventory`),kit=lots.find(l=>l.holderId===f.cid&&l.item.id==='kit_medical-supplies'),item={...kit.item,id:'bacta',name:'Dose de bacta',versionId:(await f.actionRead('mySession')).session.spaceOutlaws.versionId};
 await f.store.runTransaction(async tx=>{tx.set(`${base}/items/bacta`,{...item,publicationState:'PUBLISHED'});tx.set(`${base}/inventory/bacta`,{...kit,id:'bacta',item,quantity:10});});
 const profile={kind,clinicTargetId:'scene',bactaId:'bacta',publicationState:'PUBLISHED'};
 const saved=await f.actionCmd('savePersonProfile',{profile,reason:'Clinique équipée de recette'},f.owner);
 const input=async()=>f.careInput(f.tid,f.player,saved.id);
 const start=async(patch={})=>{const i={...await input(),...patch},p=await f.actionRead('preparePersonAction',i);return f.actionCmd('startPersonAction',{...i,present:true,confirmation:p.confirmation});};
 return {...f,edit,profile,pid:saved.id,input,startClinic:start};
}
export function clinicSuite(makeStore,prefix='Clinique Space Outlaws'){
 test(`${prefix} : protocole sûr N2 à N5, coût et fournitures uniques, PV maximum sans protection`,async()=>{
  for(let level=2;level<=5;level++){
   const f=await clinicFixture(makeStore,{level});await f.damage(2);const before=await f.health();
   const own=await f.actionRead('mySession');assert.ok(actionMenuItems(own).some(i=>i.kind==='CLINIC_SAFE'));
   const admin=await f.actionRead('personAdmin',{},f.owner);assert.match(personAdminHtml(admin),/data-kind="CLINIC_SAFE"/);
   const a=await f.startClinic(),duration=300-(level-2)*30;assert.equal(a.remainingMs,duration*1000);assert.equal((await f.points()).reserved,1);f.advance(duration*1000-1);await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});f.advance(1);
   const r=await f.finishCare(a);assert.equal(r.result.hp,3);assert.equal((await f.health()).protection,before.protection);assert.equal((await f.points()).available,4);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/bacta`)).quantity,9);assert.deepEqual((await f.finishCare(a)).result,r.result);
  }
 });
 test(`${prefix} : accéléré échoué, deux minutes sans second coût, annulation sans soin ni remboursement`,async()=>{
  for(const cancel of [false,true]){
   const f=await clinicFixture(makeStore,{kind:'CLINIC_FAST'});await f.damage(2);const a=await f.startClinic();f.advance(180000);const r=await f.finishCare(a);assert.equal(r.status,'CONTINUING');assert.equal(r.remainingMs,120000);assert.equal(r.result.roll,1);assert.equal((await f.points()).available,4);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/bacta`)).quantity,9);assert.equal((await f.health()).hp,1);
   if(cancel){await f.cancelCare(a);assert.equal((await f.health()).hp,1);}else{f.setDie(6);f.advance(120000);const done=await f.finishCare(a);assert.equal(done.result.roll,1);assert.equal(done.result.completedAfterContinuation,true);assert.equal((await f.health()).hp,3);}
   assert.equal((await f.points()).available,4);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/bacta`)).quantity,9);
  }
 });
 test(`${prefix} : patient à zéro stabilisé, continuation et pause utilisent la même horloge réelle`,async()=>{
  const f=await clinicFixture(makeStore,{kind:'CLINIC_FAST'});await f.damage(3);await f.stage('PAUSE');const a=await f.startClinic();f.advance(180000);const r=await f.finishCare(a);assert.equal(r.status,'CONTINUING');assert.equal(r.remainingMs,120000);assert.equal((await f.health()).status,'STABILIZED');f.advance(119999);await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});f.advance(1);await f.finishCare(a);assert.equal((await f.health()).hp,3);assert.equal((await f.health()).convalescenceMs,0);
 });
 test(`${prefix} : MED-02 délai conservé mais non bloquant, aucune convalescence après clinique`,async()=>{
  const f=await clinicFixture(makeStore);await f.damage(3);const a=await f.startCare();f.advance(105000);await f.finishCare(a);const path=`sessions/${f.sid}/characters/${f.tid}/cooldowns/field-care`,before=await f.store.get(path);const b=await f.startClinic();f.advance(300000);await f.finishCare(b);assert.deepEqual(await f.store.get(path),before);assert.equal((await f.health()).hp,3);assert.equal((await f.health()).convalescenceMs,0);
 });
 test(`${prefix} : lieu, compétences et absence de soin biologique sur droïde contrôlés côté serveur`,async()=>{
  const f=await clinicFixture(makeStore);await f.damage();const input=await f.input();await assert.rejects(f.actionRead('preparePersonAction',{...input,targetId:f.cid}),{code:'INVALID_RECIPIENT'});
  await f.edit('fieldStates/scene',s=>({...s,status:'OFFLINE'}));await assert.rejects(f.startClinic(),{code:'FIELD_UNAVAILABLE'});await f.edit('fieldStates/scene',s=>({...s,status:'ONLINE'}));
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='MED-02'?{...s,level:1}:s)}}));await assert.rejects(f.startClinic(),{code:'FIELD_SKILL_REQUIRED'});
  const g=await clinicFixture(makeStore,{nature:'DROID'});await g.damage();await assert.rejects(g.actionRead('preparePersonAction',{profileId:g.pid,targetId:g.tid}),{code:'PATIENT_NATURE_MISMATCH'});
 });
 test(`${prefix} : N1 indisponible, concurrence et réessai identique sans double débit`,async()=>{
  const f=await clinicFixture(makeStore,{level:1});await f.damage();await assert.rejects(f.actionRead('preparePersonAction',{profileId:f.pid,targetId:f.tid}),{code:'FIELD_SKILL_REQUIRED'});assert.ok(!actionMenuItems(await f.actionRead('mySession')).some(i=>i.kind==='CLINIC_SAFE'));
  const g=await clinicFixture(makeStore);await g.damage();const input=await g.input(),p=await g.actionRead('preparePersonAction',input),body={...input,present:true,confirmation:p.confirmation,requestId:randomUUID()},rs=await Promise.allSettled([g.actionCmd('startPersonAction',body),g.actionCmd('startPersonAction',{...body,requestId:randomUUID()})]);assert.equal(rs.filter(r=>r.status==='fulfilled').length,1);g.advance(300000);const a=rs.find(r=>r.status==='fulfilled').value,r=await g.finishCare(a);await g.finishCare(a);assert.equal(r.result.hp,3);assert.equal((await g.points()).available,4);
 });
 test(`${prefix} : arrêt de sécurité, annulation avant résolution et interdiction de configuration joueur`,async()=>{
  const f=await clinicFixture(makeStore);await f.damage();await assert.rejects(f.actionCmd('savePersonProfile',{profile:f.profile,reason:'Injection'}),{code:'FORBIDDEN'});const a=await f.startClinic();await f.actionCmd('stopSafety',{reason:'Arrêt'});f.advance(600000);await assert.rejects(f.finishCare(a),{code:'SESSION_NOT_RUNNING'});await f.cancelCare(a);assert.equal((await f.points()).available,5);assert.equal((await f.store.get(`sessions/${f.sid}/inventory/bacta`)).quantity,10);
 });
}
