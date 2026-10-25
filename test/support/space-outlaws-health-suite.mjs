import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {actionsFixture} from './space-outlaws-actions-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';

export async function healthFixture(makeStore,options={}){
 const f=await actionsFixture(makeStore,{classId:'MED',helper:true,...options});await f.stage('EN_JEU');
 const me=await f.actionRead('mySession'),other=await f.actionRead('mySession',{},f.other);
 const cid=me.character.id,tid=other.character.id;
 const damage=async(amount=1,actor=f.other,patch={})=>{const input={amount,damageKind:'ORDINARY',counted:true,secondsSinceDown:0,...patch},p=await f.actionRead('prepareDamage',input,actor);return f.actionCmd('applyDamage',{...input,reportedAt:p.reportedAt,confirmation:p.confirmation},actor);};
 const careInput=async(targetId=tid,actor=f.player,profileId=options.classId==='MEC'?'SO-MEC-02':'SO-MED-02')=>{
  const d=await f.actionRead('personTarget',{targetId},actor),p=d.profiles.find(p=>p.id===profileId);assert.ok(p,`profile ${profileId}`);
  return {targetId,profileId,supplyLots:Object.fromEntries(p.supplies.map(x=>[x.itemId,d.lots.find(l=>l.item.id===x.itemId&&l.status==='AVAILABLE'&&l.quantity>0)?.id]))};
 };
 const startCare=async(targetId=tid,actor=f.player,profileId)=>{const input=await careInput(targetId,actor,profileId),p=await f.actionRead('preparePersonAction',input,actor);return f.actionCmd('startPersonAction',{...input,confirmation:p.confirmation,present:true},actor);};
 const finishCare=(a,actor=f.player,patch={})=>f.actionCmd('finishPersonAction',{actionId:a.id,present:true,...patch},actor);
 const cancelCare=(a,actor=f.player)=>f.actionCmd('cancelPersonAction',{actionId:a.id,reason:'Interruption de la scène'},actor);
 const health=async(actor=f.other)=>(await f.actionRead('myHealth',{},actor)).health;
 return {...f,cid,tid,damage,careInput,startCare,finishCare,cancelCare,health};
}
export function spaceOutlawsHealthSuite(makeStore,prefix='Santé SPACE OUTLAWS'){
 test(`${prefix} : soins de terrain, 1 PA et une fourniture réelle, réessai sans double coût`,async()=>{
  const f=await healthFixture(makeStore);await f.damage();const a=await f.startCare();assert.equal(a.remainingMs,105000);assert.equal((await f.points()).reserved,1);const stock=await f.actionRead('myInventory');assert.equal(stock.lots.filter(l=>l.status==='FIELD_RESERVED').length,1);
  await assert.rejects(f.finishCare(a),{code:'FIELD_TOO_EARLY'});f.advance(105000);const requestId=randomUUID(),r=await f.finishCare(a,f.player,{requestId});assert.equal(r.result.restored,1);assert.equal((await f.health()).hp,3);assert.equal((await f.points()).available,4);assert.deepEqual(await f.finishCare(a,f.player,{requestId}),r);assert.deepEqual((await f.finishCare(a)).result,r.result);
  const lot=(await f.store.list(`sessions/${f.sid}/inventory`)).find(l=>l.holderId===f.cid&&l.item.id==='kit_medical-supplies');assert.equal(lot.quantity,1);assert.equal(lot.transferable,false);assert.equal((await f.store.get(`sessions/${f.sid}/accounts/${accountId(f.cid)}`)).protectedCredits,200);
 });
 test(`${prefix} : secours communs à 0 PA, zéro PV rendu, sans compétence ni fourniture`,async()=>{
  const f=await healthFixture(makeStore,{classId:'COM'});await f.damage(100);const a=await f.startCare(f.tid,f.player,'SO-STABILIZE');assert.equal(a.cost,0);assert.equal(a.remainingMs,60000);f.advance(60000);const r=await f.finishCare(a);assert.equal(r.result.stabilized,true);assert.equal((await f.health()).status,'STABILIZED');assert.equal((await f.health()).hp,0);assert.equal((await f.points()).available,5);await f.stage('FINISHED');assert.equal((await f.health()).hp,0);
 });
 test(`${prefix} : soin direct stabilise à 60 s et relève à 105 s, convalescence de jeu`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(3);f.advance(180000);const a=await f.startCare();f.advance(120000);const r=await f.finishCare(a);assert.equal(r.result.hp,1);assert.equal((await f.health()).convalescenceMs,600000);await assert.rejects(f.startCare(f.tid,f.other),{code:'OUT_OF_COMBAT'});await assert.rejects(f.start({},f.other),{code:'OUT_OF_COMBAT'});await f.stage('PAUSE');f.advance(600000);assert.equal((await f.health()).convalescenceMs,600000);await f.stage('EN_JEU');f.advance(600000);assert.equal((await f.health()).convalescenceMs,0);
 });
 test(`${prefix} : interruption avant/après la minute conserve le bon état et restitue le stock`,async()=>{
  for(const seconds of [59,60,70]){const f=await healthFixture(makeStore);await f.damage(3);const a=await f.startCare();f.advance(seconds*1000);await f.cancelCare(a);assert.equal((await f.health()).status,seconds<60?'URGENT':'STABILIZED');assert.equal((await f.points()).available,5);const l=(await f.actionRead('myInventory')).lots.find(l=>l.item.id==='kit_medical-supplies');assert.equal(l.quantity,2);assert.equal(l.status,'AVAILABLE');const next=await f.startCare();assert.equal(next.remainingMs,105000);}
 });
 test(`${prefix} : délai patient commun, aucun délai personnel, auto-soin N1 permis au-dessus de zéro`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(2);const a=await f.startCare();f.advance(105000);await f.finishCare(a);await assert.rejects(f.startCare(f.tid,f.other),{code:'PATIENT_COOLDOWN_ACTIVE'});await f.damage(1,f.player);const self=await f.startCare(f.cid);f.advance(105000);await f.finishCare(self);assert.equal((await f.health(f.player)).hp,3);assert.equal((await f.points()).available,3);
  const g=await healthFixture(makeStore,{classId:'COM'});const target=await g.actionRead('personTarget',{targetId:g.tid});assert.ok(target.profiles.every(p=>p.id==='SO-STABILIZE'));
 });
 test(`${prefix} : humanoïdes et droïdes utilisent uniquement leur protocole compatible`,async()=>{
  const f=await healthFixture(makeStore,{classId:'MEC',nature:'DROID'});await f.damage(3);const a=await f.startCare();f.advance(105000);await f.finishCare(a);assert.equal((await f.health()).hp,1);assert.equal((await f.points()).available,4);
  const g=await healthFixture(makeStore,{classId:'MED',nature:'DROID'});await g.damage(3);const input={profileId:'SO-MED-02',targetId:g.tid};await assert.rejects(g.actionRead('preparePersonAction',input),{code:'PATIENT_NATURE_MISMATCH'});
 });
 test(`${prefix} : protection unique, touches déjà groupées, sabre ignore la protection`,async()=>{
  const f=await healthFixture(makeStore,{classId:'COM'});await f.damage();assert.equal((await f.health()).protection,0);assert.equal((await f.health()).hp,4);await f.damage(2);assert.equal((await f.health()).hp,2);
  const g=await healthFixture(makeStore,{classId:'COM'});await g.damage(1,g.other,{damageKind:'LASER'});assert.equal((await g.health()).protection,1);assert.equal((await g.health()).hp,0);
  await assert.rejects(g.damage(),{code:'NO_DAMAGE_POSSIBLE'});
 });
 test(`${prefix} : déclaration tardive et confirmation différée ne redémarrent pas la survie`,async()=>{
  const f=await healthFixture(makeStore);const input={amount:3,damageKind:'ORDINARY',counted:true,secondsSinceDown:200},p=await f.actionRead('prepareDamage',input,f.other);f.advance(20000);await f.actionCmd('applyDamage',{...input,reportedAt:p.reportedAt,confirmation:p.confirmation},f.other);assert.equal((await f.health()).remainingMs,80000);f.advance(20000);await assert.rejects(f.startCare(),{code:'SO_SURVIVAL_TOO_LATE'});f.advance(60000);assert.equal((await f.health()).status,'EXPIRED');await assert.rejects(f.startCare(),{code:'SO_SURVIVAL_EXPIRED'});
 });
 test(`${prefix} : pause ordinaire conserve urgence et secours réels, pas les soins ordinaires`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(3);await f.stage('PAUSE');f.advance(10000);assert.equal((await f.health()).remainingMs,290000);const a=await f.startCare(f.tid,f.player,'SO-STABILIZE');f.advance(60000);await f.finishCare(a);assert.equal((await f.health()).status,'STABILIZED');
 });
 test(`${prefix} : STOP suspend temps vital et de jeu, seul MJ peut reprendre`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(3);const a=await f.startCare();f.advance(30000);await f.actionCmd('stopSafety',{reason:'Arrêt de sécurité'},f.other);const h=await f.health();f.advance(900000);assert.equal((await f.health()).remainingMs,h.remainingMs);assert.equal((await f.actionRead('myPersonActions')).actions[0].remainingMs,75000);await assert.rejects(f.finishCare(a),{code:'SO_SAFETY_STOP'});await assert.rejects(f.stage('EN_JEU'),{code:'SO_SAFETY_STOP'});const s=await f.actionRead('session',{},f.owner);await assert.rejects(f.actionCmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.player),{code:'FORBIDDEN'});await f.actionCmd('resumeSafety',{revision:s.revision,reason:'Danger écarté'},f.owner);f.advance(75000);await f.finishCare(a);assert.equal((await f.health()).hp,1);
 });
 test(`${prefix} : mortalité échue et clôture contrôlée, sans renaissance ni héritage`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(3);await assert.rejects(f.stage('FINISHED'),{code:'SO_SURVIVAL_OPEN'});f.advance(300000);const d=await f.actionRead('survivalAdmin',{},f.owner),patient=d.characters.find(c=>c.id===f.tid),input={characterId:f.tid,healthRevision:patient.healthRevision,reason:'Délai sans secours vérifié'};await assert.rejects(f.actionCmd('confirmSurvivalDeath',input),{code:'FORBIDDEN'});await f.actionCmd('confirmSurvivalDeath',input,f.owner);assert.equal((await f.health()).status,'DEAD');await assert.rejects(f.startCare(),{code:'SO_PATIENT_DEAD'});await f.stage('FINISHED');const wallet=await f.store.get(`sessions/${f.sid}/accounts/${accountId(f.tid)}`);assert.equal(wallet.protectedCredits,200);
 });
 test(`${prefix} : patient verrouillé, une seule réservation malgré concurrence`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(2);const i=await f.careInput(),p=await f.actionRead('preparePersonAction',i),j=await f.careInput(f.tid,f.other),q=await f.actionRead('preparePersonAction',j,f.other);const r=await Promise.allSettled([f.actionCmd('startPersonAction',{...i,confirmation:p.confirmation,present:true}),f.actionCmd('startPersonAction',{...j,confirmation:q.confirmation,present:true},f.other)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await f.store.list(`sessions/${f.sid}/personActions`)).length,1);await assert.rejects(f.stage('FINISHED'),{code:'PERSON_ACTIONS_OPEN'});
 });
 test(`${prefix} : blessure interrompt le soin mais conserve une stabilisation déjà acquise`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(3);const a=await f.startCare();f.advance(70000);await f.damage(1,f.player);f.advance(40000);await assert.rejects(f.finishCare(a),{code:'SO_CARE_INTERRUPTED'});await f.cancelCare(a);assert.equal((await f.health()).status,'STABILIZED');assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : révocation avant résultat, annulation MJ libère PA et lot`,async()=>{
  const f=await healthFixture(makeStore);await f.damage();const a=await f.startCare();f.advance(105000);await f.actionCmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.finishCare(a),{code:'INVALID_RECIPIENT'});await f.actionCmd('cancelPersonActionMJ',{actionId:a.id,reason:'Intervention annulée'},f.owner);assert.equal((await f.points()).available,5);
 });
 test(`${prefix} : anciens soins immédiats, corrections et captures restent bloqués`,async()=>{
  const f=await healthFixture(makeStore);await f.damage();await assert.rejects(f.actionRead('prepareTreatment',{skillId:'MED-02',targetId:f.tid}),{code:'SO_GAMEPLAY_NOT_OPEN'});const s=await f.actionRead('session',{},f.owner),h=await f.health();await assert.rejects(f.actionCmd('correctHealth',{characterId:f.tid,revision:s.revision,healthRevision:h.revision,hp:3,maxHp:100,outOfCombat:false,reason:'Contourner'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.actionCmd('declareCapture',{confirmed:true}),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : interruption transactionnelle ne consomme ni soin ni fourniture`,async()=>{
  const raw=makeStore();let fail=false;const wrapped={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})};const f=await healthFixture(()=>wrapped);await f.damage();const a=await f.startCare();f.advance(105000);fail=true;await assert.rejects(f.finishCare(a),/INTERRUPTION/);fail=false;assert.equal((await f.health()).hp,2);assert.equal((await f.points()).reserved,1);await f.finishCare(a);assert.equal((await f.health()).hp,3);
 });
 test(`${prefix} : N1 ne relève pas à zéro, durées N1 à N5 et auto-soin sans dépassement`,async()=>{
  for(const [level,seconds] of [[1,120],[2,105],[3,90],[4,75],[5,60]]){
   const f=await healthFixture(makeStore),path=`sessions/${f.sid}/characters/${f.cid}`;
   await f.store.runTransaction(async tx=>{const c=await tx.get(path);tx.set(path,{...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='MED-02'?{...k,level}:k)}});});
   await f.damage(3);if(level===1)await assert.rejects(f.startCare(),{code:'FIELD_SKILL_REQUIRED'});
   await f.damage(1,f.player);const a=await f.startCare(f.cid);assert.equal(a.remainingMs,seconds*1000);f.advance(seconds*1000);await f.finishCare(a);assert.equal((await f.health(f.player)).hp,3);
  }
 });
 test(`${prefix} : point de stabilisation acquis avant une blessure, pas avant 60 secondes`,async()=>{
  const f=await healthFixture(makeStore);await f.damage(3);const a=await f.startCare();f.advance(59000);await f.damage(1,f.player);f.advance(60000);await f.cancelCare(a);assert.equal((await f.health()).status,'URGENT');
 });
 test(`${prefix} : STOP depuis pause reste en pause, autorité MJ révoquée avant réessai`,async()=>{
  const f=await healthFixture(makeStore);await f.role();await f.stage('PAUSE');const requestId=randomUUID();await f.actionCmd('stopSafetyMJ',{requestId,reason:'Sécurité'},f.mj);const s=await f.actionRead('session',{},f.owner);await f.actionCmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);assert.equal((await f.actionRead('session',{},f.owner)).stage,'PAUSE');const current=await f.actionRead('session',{},f.owner);await f.actionCmd('setStaff',{email:f.mj.email,role:'MJ',active:false,revision:current.revision,reason:'Révocation'},f.owner);await assert.rejects(f.actionCmd('stopSafetyMJ',{requestId,reason:'Sécurité'},f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : ancienne version scellée conserve son périmètre sans soins implicites`,async()=>{
  const f=await actionsFixture(makeStore,{release:false}),released=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${released.versionId}`;
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {healthVersion,careProfiles,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});
  await f.birth(await f.birthPreview());await f.stage('EN_JEU');assert.equal((await f.actionRead('mySession')).session.spaceOutlaws.healthVersion,undefined);assert.deepEqual(await f.store.list(`sessions/${f.sid}/personProfiles`),[]);await assert.rejects(f.actionRead('prepareDamage',{amount:1}),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });

}
