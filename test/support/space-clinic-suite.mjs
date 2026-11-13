import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {healthFixture} from './space-outlaws-health-suite.mjs';
import {actionMenuItems} from '../../web/player-action-menu.mjs';
import {personAdminHtml,personTargetHtml} from '../../web/person-actions.mjs';
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

export async function workshopFixture(makeStore,{level=2,kind='CLINIC_SAFE'}={}){
 const f=await healthFixture(makeStore,{classId:'MEC',nature:'DROID'}),base=`sessions/${f.sid}`;
 const edit=(p,fn)=>f.store.runTransaction(async tx=>tx.set(`${base}/${p}`,fn(await tx.get(`${base}/${p}`))));
 await edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='MEC-02'?{...s,level}:s)}}));
 const profile={kind,patientNature:'DROID',clinicTargetId:'scene',publicationState:'PUBLISHED'};
 const saved=await f.actionCmd('savePersonProfile',{profile,reason:'Atelier équipé de recette'},f.owner);
 const input=()=>f.careInput(f.tid,f.player,saved.id);
 const startWorkshop=async()=>{const i=await input(),p=await f.actionRead('preparePersonAction',i);return f.actionCmd('startPersonAction',{...i,present:true,confirmation:p.confirmation});};
 return {...f,edit,profile,pid:saved.id,input,startWorkshop};
}
export function workshopSuite(makeStore,prefix='Révision intégrale droïde'){
 test(`${prefix} : sûr/accéléré N2 à N5, consommations uniques, protection et modules conservés`,async()=>{
  for(const kind of ['CLINIC_SAFE','CLINIC_FAST'])for(let level=2;level<=5;level++){
   const f=await workshopFixture(makeStore,{level,kind}),base=`sessions/${f.sid}`;await f.damage(2);
   await f.edit(`characters/${f.tid}`,c=>({...c,protection:1,modules:[{id:'fixture-damaged',status:'DAMAGED'}],convalescentUntilGameMs:9000000}));
   const inventory=await f.store.list(`${base}/inventory`),parts=inventory.find(l=>l.holderId===f.cid&&l.item.id==='kit_parts'),component=inventory.find(l=>l.holderId===f.cid&&l.item.id==='kit_repair-supplies');
   assert.equal(parts.item.consumable,false);const target=await f.actionRead('personTarget',{targetId:f.tid});assert.ok(personTargetHtml(target).includes(`value="${parts.id}"`));f.setDie(6);const a=await f.startWorkshop(),seconds=kind==='CLINIC_SAFE'?300-(level-2)*30:180-(level-2)*15;
   assert.equal(a.remainingMs,seconds*1000);f.advance(seconds*1000-1);await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});f.advance(1);const r=await f.finishCare(a);await f.finishCare(a);
   assert.equal(r.result.hp,3);assert.equal((await f.health()).convalescenceMs,0);assert.equal((await f.health()).protection,1);assert.deepEqual((await f.store.get(`${base}/characters/${f.tid}`)).modules,[{id:'fixture-damaged',status:'DAMAGED'}]);
   assert.equal((await f.store.get(`${base}/inventory/${parts.id}`)).quantity,0);assert.equal((await f.store.get(`${base}/inventory/${component.id}`)).quantity,component.quantity-1);assert.equal((await f.points()).available,4);
   const items=actionMenuItems(await f.actionRead('mySession'));assert.ok(items.some(i=>i.id==='MEC-02-workshop-safe'));assert.ok(!items.some(i=>i.id==='MED-03-safe'));
  }
 });
 test(`${prefix} : accéléré échoué puis continuation sans second coût ni restauration de protection`,async()=>{
  const f=await workshopFixture(makeStore,{kind:'CLINIC_FAST'});await f.damage(3);const a=await f.startWorkshop();f.advance(180000);const r=await f.finishCare(a);assert.equal(r.status,'CONTINUING');assert.equal(r.remainingMs,120000);assert.equal((await f.health()).status,'STABILIZED');f.advance(120000);await f.finishCare(a);assert.equal((await f.health()).hp,3);assert.equal((await f.health()).protection,0);assert.equal((await f.points()).available,4);
 });
 test(`${prefix} : références, niveau, atelier et nature contrôlés sans aptitude médicale accordée`,async()=>{
  const f=await workshopFixture(makeStore);await f.damage();
  await f.edit('fieldStates/scene',s=>({...s,status:'OFFLINE'}));await assert.rejects(f.startWorkshop(),{code:'FIELD_UNAVAILABLE'});await f.edit('fieldStates/scene',s=>({...s,status:'ONLINE'}));
  await f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(s=>s.id==='MEC-01'?{...s,level:1}:s)}}));await assert.rejects(f.startWorkshop(),{code:'FIELD_SKILL_REQUIRED'});
  await f.edit(`characters/${f.tid}`,c=>({...c,nature:'HUMANOID',public:{...c.public,nature:'HUMANOID'}}));await assert.rejects(f.actionRead('preparePersonAction',{profileId:f.pid,targetId:f.tid}),{code:'FIELD_SKILL_REQUIRED'});
  const g=await workshopFixture(makeStore);await g.damage();await g.edit(`characters/${g.tid}`,c=>({...c,nature:'HUMANOID',public:{...c.public,nature:'HUMANOID'}}));await assert.rejects(g.actionRead('preparePersonAction',{profileId:g.pid,targetId:g.tid}),{code:'PATIENT_NATURE_MISMATCH'});
  await g.edit('personProfiles/SO-MEC-02',p=>({...p,partsItemId:null}));await assert.rejects(g.actionCmd('savePersonProfile',{profile:g.profile,reason:'Sans référence publiée'},g.owner),{code:'FIELD_REFERENCE'});
 });
 test(`${prefix} : ancienne version médicale sans atelier toujours lisible, aucun ajout implicite`,async()=>{
  const f=await actionsFixture(makeStore,{classId:'MEC',release:false}),released=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${released.versionId}`;
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {workshopVersion,manifestDigest,...old}=await tx.get(path);old.careProfiles=old.careProfiles.map(({partsItemId,...p})=>p);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});
  await f.birth(await f.birthPreview());await f.stage('EN_JEU');assert.equal((await f.actionRead('mySession')).session.spaceOutlaws.workshopVersion,undefined);assert.ok(!actionMenuItems(await f.actionRead('mySession')).some(i=>i.id.startsWith('MEC-02-workshop')));
  await assert.rejects(f.actionCmd('savePersonProfile',{profile:{kind:'CLINIC_SAFE',patientNature:'DROID',clinicTargetId:'scene',publicationState:'PUBLISHED'},reason:'Pas de migration implicite'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : confirmation périmée et double démarrage ne réservent pas deux lots`,async()=>{
  const f=await workshopFixture(makeStore);await f.damage();const i=await f.input(),p=await f.actionRead('preparePersonAction',i);
  const results=await Promise.allSettled([1,2].map(()=>f.actionCmd('startPersonAction',{...i,confirmation:p.confirmation,present:true})));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.points()).reserved,1);
  await f.cancelCare(results.find(r=>r.status==='fulfilled').value);await assert.rejects(f.actionCmd('startPersonAction',{...i,confirmation:p.confirmation,present:true}),{code:'STALE_REVISION'});
 });
 test(`${prefix} : annulation avant résolution libère composant, pièces et PA`,async()=>{
  const f=await workshopFixture(makeStore);await f.damage(2);const a=await f.startWorkshop();f.advance(299000);await f.cancelCare(a);assert.equal((await f.health()).hp,1);assert.equal((await f.points()).available,5);const lots=await f.store.list(`sessions/${f.sid}/inventory`);assert.equal(lots.find(l=>l.holderId===f.cid&&l.item.id==='kit_parts').quantity,1);assert.equal(lots.find(l=>l.holderId===f.cid&&l.item.id==='kit_repair-supplies').quantity,2);
 });
}
