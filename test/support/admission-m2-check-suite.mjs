import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {reconciliationFixture} from './admission-m2-reconciliation-suite.mjs';
import {admissionM2Fixture} from './admission-m2-suite.mjs';
import {admissionFixture,admissionTestSettings,admissionTestProposal} from './admissions-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {admissionM2CheckLimits} from '../../src/core/admission-m2-check.mjs';
import {hash} from '../../src/core/workflow.mjs';
const check=(f,actor=f.owner,input={})=>f.read('checkAdmissionM2',actor,input);
const codes=d=>d.diagnostics.map(x=>x.code);
const set=(f,path,value)=>f.store.runTransaction(async tx=>tx.set(path,value));
export function admissionM2CheckSuite(makeStore,prefix='Contrôle dossiers M2 I3c'){
 test(`${prefix} : instantané privé complet sans écriture ni activation`,async()=>{
  const f=await reconciliationFixture(makeStore),before=await f.read('session'),central=await f.view(),r=await f.record(),d=await check(f);
  assert.equal(d.scope,'ADMISSION_M2_PREPARATION');assert.equal(d.status,'NO_DETECTED_ERROR');assert.equal(d.totals.approved,1);assert.equal(d.totals.matched,1);assert.equal(d.rows[0].characterId,f.initial.characterId);assert.equal(d.publicationAvailable,false);assert.equal(d.birthAvailable,false);assert.match(d.fingerprint,/^[a-f0-9]{64}$/);assert.equal((await check(f)).fingerprint,d.fingerprint);
  assert.deepEqual(await f.read('session'),before);assert.deepEqual(await f.view(),central);assert.deepEqual(await f.record(),r);for(const secret of [f.player.uid,f.player.email,admissionTestProposal.friends,admissionTestProposal.background,r.admission.invitationHash,r.admission.consentHash,'Décision synthétique'])assert.ok(!JSON.stringify(d).includes(secret),secret);
 });
 test(`${prefix} : dossier approuvé sans M2 et dossier en attente distincts`,async()=>{
  const f=await admissionM2Fixture(makeStore),d=await check(f);assert.deepEqual(codes(d),['ADMISSION_M2_NOT_PREPARED']);assert.equal(d.rows[0].status,'BLOCKED');await f.review('WAITLIST');const waiting=await check(f);assert.equal(waiting.status,'NO_DETECTED_ERROR');assert.equal(waiting.totals.notRequired,1);assert.equal(waiting.totals.approved,0);
 });
 test(`${prefix} : tous les écarts identité et plan, sans comparaison bloquante des récits`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.edit({...centralTestCharacter,nature:'DROID',creationPlan:{classId:'INF',speciesId:'droid-test',secondaryId:'ROG-03'}});const d=await check(f);assert.deepEqual(d.rows[0].differences,['displayName','nature','classId','speciesId','secondaryId']);assert.deepEqual(d.rows[0].warnings,['BIOGRAPHY_DIFFERENT']);assert.ok(codes(d).includes('ADMISSION_M2_DIVERGED'));await f.reconcile(await f.check());const after=await check(f);assert.equal(after.status,'NO_DETECTED_ERROR');assert.deepEqual(after.rows[0].warnings,['BIOGRAPHY_DIFFERENT']);assert.equal((await f.character()).data.biography,centralTestCharacter.biography);
 });
 test(`${prefix} : réessai historique I3b ne masque pas une divergence actuelle`,async()=>{
  const f=await reconciliationFixture(makeStore),p=await f.check();await f.reconcile(p);const d=await check(f);await f.review('CHANGE_CLASS',{classId:'ROG',secondaryId:'MED-02'});await f.reconcile(p);const after=await check(f);assert.notEqual(after.fingerprint,d.fingerprint);assert.deepEqual(after.rows[0].differences,['classId']);assert.equal(after.byClass.find(x=>x.classId==='ROG').observed,1);
 });
 test(`${prefix} : dossier retiré lié actif signalé, archive explicitement exclue`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.review('WITHDRAW');assert.deepEqual(codes(await check(f)),['UNAPPROVED_M2_ACTIVE']);await f.archive();const d=await check(f);assert.equal(d.status,'NO_DETECTED_ERROR');assert.equal(d.totals.excluded,1);assert.equal((await f.character()).operation,'ARCHIVE');
 });
 test(`${prefix} : archive du personnage approuvé bloque sans restauration`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.archive();assert.deepEqual(codes(await check(f)),['ADMISSION_M2_ARCHIVED']);assert.equal((await f.character()).operation,'ARCHIVE');
 });
 test(`${prefix} : consentement et espèce relus même si les révisions dossier M2 concordent`,async()=>{
  for(const cause of ['consent','species']){const f=await reconciliationFixture(makeStore);await f.reconcile(await f.check());const settings=structuredClone(admissionTestSettings);if(cause==='consent')settings.instructions='Nouvelles consignes';else settings.species[0].available=false;await f.configure(settings,1,2);const d=await check(f);assert.ok(codes(d).includes(cause==='consent'?'ADMISSION_CONSENT_STALE':'INVALID_ADMISSION_CHOICE'));assert.equal(d.totals.matched,0);}
 });
 test(`${prefix} : fermeture et invitation révoquée ne retirent pas une confirmation`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.configure({...admissionTestSettings,open:false},1,2);const inv=(await f.admin()).invitations[0];await f.cmd('revokeAdmissionInvitation',{invitationId:inv.id,reason:'Fermer le lien'});f.time(999999999);assert.equal((await check(f)).status,'NO_DETECTED_ERROR');
 });
 test(`${prefix} : lecture M2 et rôle MJ indépendants, sans édition obligatoire`,async()=>{
  const f=await reconciliationFixture(makeStore);for(const actor of [null,f.player,f.other])await assert.rejects(check(f,actor));await f.role();await assert.rejects(check(f,f.mj),{code:'FORBIDDEN'});await f.grant(0,{editWorkshops:[]});assert.equal((await f.read('admissionAdmin',f.mj)).canCheckM2,true);assert.equal((await f.read('admissionAdmin',f.mj)).canPrepareM2,false);assert.equal((await check(f,f.mj)).totals.matched,1);await assert.rejects(f.check(f.mj),{code:'FORBIDDEN'});await f.role(true,'RECEPTION');await assert.rejects(check(f,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : contrôleur central seul ne lit jamais les dossiers, révocations immédiates`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.grant(0,{readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:[],checkCentral:true});await assert.rejects(check(f,f.mj),{code:'FORBIDDEN'});assert.equal((await f.central('checkCentralDraft',{draftRevision:2},f.mj)).publicationAvailable,false);await f.role();await check(f,f.mj);await f.grant(1,{active:false,checkCentral:false});await assert.rejects(check(f,f.mj),{code:'FORBIDDEN'});await f.grant(2);await f.role(false);await assert.rejects(check(f,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : refus avant requête M2 sans lecture, aucun accès aux autres ateliers`,async()=>{
  const raw=makeStore(),paths=[];const f=await reconciliationFixture(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(tx=>cb({...tx,list:async(...args)=>{paths.push(args);return tx.list(...args);}}))}));await f.role();paths.length=0;await assert.rejects(check(f,f.mj),{code:'FORBIDDEN'});assert.equal(paths.some(([p])=>p.includes('/changes')),false);await f.grant(0,{editWorkshops:[]});paths.length=0;await check(f,f.mj);assert.ok(paths.some(([p,filter])=>p.endsWith('/changes')&&filter[0]==='workshop'&&filter[1]==='M2'));assert.equal(paths.some(([p,filter])=>p.endsWith('/changes')&&(!filter||filter[1]!=='M2')),false);
 });
 test(`${prefix} : compteur global cohérent mais distribution réelle corrompue signalée`,async()=>{
  const f=await reconciliationFixture(makeStore),path=`sessions/${f.sid}/admission/occupancy`,o=await f.store.get(path);await set(f,path,{...o,byClass:{...o.byClass,COM:0,ROG:1}});const d=await check(f);assert.ok(codes(d).includes('ADMISSION_ACCOUNTING_CONFLICT'));assert.equal(d.byClass.find(x=>x.classId==='COM').observed,1);assert.equal(d.byClass.find(x=>x.classId==='COM').confirmed,0);assert.deepEqual((await f.store.get(path)).byClass,{...o.byClass,COM:0,ROG:1});
 });
 test(`${prefix} : verrou désactivé, orphelin et doublon détectés sans réparation`,async()=>{
  for(const mode of ['missing','orphan','duplicate']){const f=await reconciliationFixture(makeStore),a=(await f.record()).admission,path=`sessions/${f.sid}/admissionIdentities/${a.confirmation.identityKey}`,lock=await f.store.get(path);if(mode==='missing')await set(f,path,{...lock,active:false});else await set(f,`sessions/${f.sid}/admissionIdentities/${hash(randomUUID())}`,{...lock,uid:mode==='orphan'?f.other.uid:lock.uid});assert.ok(codes(await check(f)).includes('ADMISSION_IDENTITY_INDEX_CONFLICT'));}
 });
 test(`${prefix} : dépassement exceptionnel conservé, absence ou faux motif refusé`,async()=>{
  const f=await reconciliationFixture(makeStore),path=`sessions/${f.sid}`,session=await f.store.get(path);await set(f,path,{...session,capacity:1});
  let d=await f.admin(),s=await f.read('session');await f.begin(f.token,f.other,{sessionRevision:s.revision,draftRevision:d.draftRevision});await f.save({sessionRevision:s.revision,draftRevision:d.draftRevision,proposal:{...admissionTestProposal,firstName:'Autre'}},f.other);
  await f.cmd('reviewAdmission',{uid:f.other.uid,revision:2,policyRevision:d.policyRevision,draftRevision:d.draftRevision,decision:'OVERRIDE_APPROVE',reason:'Exception de capacité explicite'});
  const p=await f.read('previewAdmissionM2',f.owner,{uid:f.other.uid});await f.cmd('prepareAdmissionM2',{uid:f.other.uid,confirmation:p.confirmation,reason:'Préparer le second dossier'});
  d=await check(f);assert.equal(d.totals.exceptions,1);assert.equal(d.status,'NO_DETECTED_ERROR');assert.equal(d.totals.approved,2);
  const rp=`sessions/${f.sid}/registrations/${hash(f.other.uid)}`,r=await f.store.get(rp);await set(f,rp,{...r,admission:{...r.admission,confirmation:{...r.admission.confirmation,exception:false,exceptionReason:null}}});assert.ok(codes(await check(f)).includes('ADMISSION_QUOTA_WITHOUT_EXCEPTION'));
  await set(f,rp,{...r,admission:{...r.admission,confirmation:{...r.admission.confirmation,exceptionReason:''}}});assert.ok(codes(await check(f)).includes('INVALID_ADMISSION_RECORD'));
 });
 test(`${prefix} : corruption du lien et de la définition refusée sans copie`,async()=>{
  const f=await reconciliationFixture(makeStore),r=await f.record(),old=await f.character();await set(f,f.path,{...r,admission:{...r.admission,m2Preparation:{...r.admission.m2Preparation,characterId:`admission_${'a'.repeat(64)}`}}});assert.ok(codes(await check(f)).includes('ADMISSION_M2_LINK_BROKEN'));await set(f,f.path,r);await set(f,f.changePath,{...old,data:{...old.data,credits:200}});const d=await check(f);assert.ok(codes(d).includes('INVALID_M2_DEFINITION'));assert.ok(codes(d).includes('ADMISSION_M2_LINK_BROKEN'));assert.equal((await f.view()).changes.filter(x=>x.type==='character').length,1);
 });
 test(`${prefix} : orphelin issu d’admission bloqué, fiche indépendante non assimilée à un joueur`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.cc('saveCentralCharacter',{characterId:'independent',characterRevision:0,draftRevision:2,character:{...centralTestCharacter,relations:[]},reason:'Fiction indépendante'});assert.equal((await check(f)).status,'NO_DETECTED_ERROR');const r=await f.record(),{m2Preparation,...a}=r.admission;await set(f,f.path,{...r,admission:a});const d=await check(f);assert.ok(codes(d).includes('ORPHAN_ADMISSION_M2'));assert.ok(codes(d).includes('ADMISSION_M2_NOT_PREPARED'));
 });
 test(`${prefix} : cycle et paramètres stricts, aucun ancien rapport comme confirmation`,async()=>{
  const f=await reconciliationFixture(makeStore);for(const input of [{uid:f.player.uid},{requestId:randomUUID()},{confirmation:'old'},{draftRevision:2},{publish:true}])await assert.rejects(check(f,f.owner,input),{code:'INVALID_ADMISSION'});const d=await f.store.get(f.base);await set(f,f.base,{...d,status:'BUILDING'});await assert.rejects(check(f),{code:'ADMISSION_DRAFT_UNAVAILABLE'});
 });
 test(`${prefix} : contrôle concurrent au changement de classe sans état hybride`,async()=>{
  const f=await reconciliationFixture(makeStore);const [d]=await Promise.all([check(f),f.review('CHANGE_CLASS',{classId:'ROG',secondaryId:'MED-02'})]);assert.equal(d.totals.approved,1);const changed=d.byClass.find(x=>x.classId==='ROG').observed===1;assert.deepEqual(d.rows[0].differences,changed?['classId']:[]);assert.equal(d.byClass.find(x=>x.classId==='COM').confirmed,changed?0:1);assert.deepEqual((await check(f)).rows[0].differences,['classId']);
 });
 test(`${prefix} : retrait concurrent au contrôle, puis lecture actuelle toujours bloquée`,async()=>{
  const f=await reconciliationFixture(makeStore);const [d]=await Promise.all([check(f),f.review('WITHDRAW')]);assert.ok(d.totals.approved===0||d.totals.approved===1);assert.equal(d.rows[0].status,d.totals.approved?'MATCHED':'BLOCKED');assert.deepEqual(codes(await check(f)),['UNAPPROVED_M2_ACTIVE']);
 });
 test(`${prefix} : édition M2 concurrente lue avant ou après, jamais avec une révision hybride`,async()=>{
  const f=await reconciliationFixture(makeStore);const [d]=await Promise.all([check(f),f.edit({displayName:'Nom retouché'})]);const changed=d.snapshot.draftRevision===3;assert.equal(d.rows[0].characterRevision,changed?2:1);assert.deepEqual(d.rows[0].differences,changed?['displayName']:[]);assert.deepEqual((await check(f)).rows[0].differences,['displayName']);
 });
 test(`${prefix} : révocation concurrente sérialisée, toutes les lectures suivantes refusées`,async()=>{
  const f=await reconciliationFixture(makeStore);await f.role();await f.grant(0,{editWorkshops:[]});const out=await Promise.allSettled([check(f,f.mj),f.grant(1,{active:false})]);assert.equal(out[1].status,'fulfilled');if(out[0].status==='fulfilled')assert.equal(out[0].value.totals.matched,1);else assert.equal(out[0].reason.code,'FORBIDDEN');await assert.rejects(check(f,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : refus intégral aux limites de lignes et octets, sans résultat tronqué`,async()=>{
  const raw=makeStore();let mode=null;const f=await reconciliationFixture(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(tx=>cb({...tx,list:async(...args)=>{const out=await tx.list(...args);if(mode==='rows'&&args[0].endsWith('/registrations'))return Array.from({length:admissionM2CheckLimits.registrations+1},()=>out[0]);if(mode==='bytes'&&args[0].endsWith('/registrations'))return [{...out[0],email:'x'.repeat(admissionM2CheckLimits.sourceBytes)}];return out;}}))}));for(mode of ['rows','bytes'])await assert.rejects(check(f),{code:'ADMISSION_M2_CHECK_LIMIT'});mode=null;assert.equal((await check(f)).status,'NO_DETECTED_ERROR');
 });
 test(`${prefix} : absence de configuration explicitée, aucun dossier reste un contrôle vide`,async()=>{
  const f=await admissionFixture(makeStore);await assert.rejects(check(f),{code:'ADMISSION_NOT_CONFIGURED'});await f.configure();const d=await check(f);assert.equal(d.status,'NO_DETECTED_ERROR');assert.equal(d.totals.registrations,0);assert.equal(d.birthAvailable,false);
 });
}
