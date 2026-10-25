import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralSpaceFixture} from './central-space-suite.mjs';
import {centralTestCharacter} from './central-characters-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {reconciliationFixture} from './admission-m2-reconciliation-suite.mjs';
import {centralSnapshotLimits} from '../../src/core/central-snapshots.mjs';
import {createWorkflow} from '../../src/core/workflow.mjs';
import {cleanScenarioPackage} from '../../src/core/scenario-package.mjs';
import {centralSnapshotFile} from '../../web/central-snapshots.mjs';
const workshops=['M1','M2','M3','M4','M5','M6','M7'];
export async function centralSnapshotsFixture(makeStore,{full=false}={}){
 const f=await centralSpaceFixture(makeStore);
 if(full){await f.save();await f.saveCharacter({draftRevision:1});await f.saveSpace('shipModel',{draftRevision:2});await f.recipe(3);await f.saveShop({draftRevision:4});await f.saveKnowledge({draftRevision:5});await f.saveMission({draftRevision:6});await f.configure(7);}
 const preview=(revision=full?8:0,actor=f.owner,extra={})=>f.read('previewCentralSnapshot',actor,{campaignId:f.cid,draftRevision:revision,...extra});
 const capture=(p,extra={},actor=f.owner)=>f.cmd('captureCentralSnapshot',{campaignId:f.cid,draftRevision:p.draftRevision,confirmation:p.confirmation,reason:'Point de contrôle synthétique',...extra},actor);
 const saved=(id,actor=f.owner)=>f.read('centralSnapshot',actor,{campaignId:f.cid,snapshotId:id});
 const list=(actor=f.owner)=>f.read('listCentralSnapshots',actor,{campaignId:f.cid});
 return {...f,preview,capture,saved,list};
}
export function centralSnapshotsSuite(makeStore,prefix='Instantanés centraux C2n'){
 test(`${prefix} : aperçu sans écriture puis capture atomique des sept ateliers et du rapport`,async()=>{
  const f=await centralSnapshotsFixture(makeStore,{full:true}),before=await f.store.list(`${f.base}/changes`),campaign=await f.store.get(`campaigns/${f.cid}`),session=await f.store.get(`sessions/${f.sid}`),p=await f.preview();assert.equal(p.records,8);assert.equal(p.report.status,'CORRECTIONS_REQUIRED');assert.equal(p.publicationAvailable,false);assert.deepEqual(await f.store.list(`${f.base}/checks`),[]);
  const out=await f.capture(p),d=await f.saved(out.id);assert.deepEqual(d.report,p.report);assert.deepEqual(new Set(d.changes.map(x=>x.workshop)),new Set(workshops));assert.equal(d.snapshot.status,'SEALED');assert.equal(d.sourceIsCurrentRevision,true);assert.deepEqual([...d.changes].sort((a,b)=>a.id.localeCompare(b.id)),[...before].sort((a,b)=>a.id.localeCompare(b.id)));assert.deepEqual(await f.store.get(`campaigns/${f.cid}`),campaign);assert.deepEqual(await f.store.get(`sessions/${f.sid}`),session);assert.deepEqual(await f.store.list(`${f.base}/changes`),before);assert.equal((await f.list()).snapshots.length,1);assert.equal(d.publicationAvailable,false);
 });
 test(`${prefix} : copie immuable après retouche et archive, nouvelle capture indépendante`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);await f.save();const first=await f.capture(await f.preview(1)),old=await f.saved(first.id);await f.save({draftRevision:1,itemRevision:1,item:{...centralTestItem,name:'Nom modifié'}});await f.cmd('archiveCentralItem',{campaignId:f.cid,itemId:'ingredient',draftRevision:2,itemRevision:2,reason:'Archive distincte'});const d=await f.saved(first.id);assert.deepEqual(d.changes,old.changes);assert.deepEqual(d.report,old.report);assert.equal(d.sourceIsCurrentRevision,false);assert.equal(d.currentDraftRevision,3);const next=await f.capture(await f.preview(3));assert.notEqual(next.id,first.id);assert.equal((await f.saved(next.id)).changes[0].operation,'ARCHIVE');assert.equal((await f.list()).snapshots.length,2);
 });
 test(`${prefix} : même requête ou nouvelle requête identique retrouve la capture historique`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);await f.save();const p=await f.preview(1),requestId=randomUUID(),out=await f.capture(p,{requestId});assert.deepEqual(await f.capture(p,{requestId}),out);await f.save({draftRevision:1,itemRevision:1});assert.deepEqual(await f.capture(p),out);assert.deepEqual(await f.capture(p,{requestId}),out);assert.equal((await f.list()).snapshots.length,1);await assert.rejects(f.capture(p,{requestId,reason:'Autre contenu'}),{code:'REQUEST_ID_REUSED'});
 });
 test(`${prefix} : deux captures concurrentes identiques ne doublent pas les pages ou l’audit`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);await f.save();const p=await f.preview(1),out=await Promise.all([f.capture(p),f.capture(p)]);assert.deepEqual(out[0],out[1]);assert.equal((await f.store.list(`campaigns/${f.cid}/history`)).filter(x=>x.action==='captureCentralSnapshot').length,1);assert.equal((await f.list()).snapshots.length,1);
 });
 test(`${prefix} : modification concurrente donne une ancienne copie complète ou un conflit`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);await f.save();const p=await f.preview(1),out=await Promise.allSettled([f.capture(p),f.save({draftRevision:1,itemRevision:1,item:{...centralTestItem,name:'Après'}})]);assert.equal(out[1].status,'fulfilled');if(out[0].status==='fulfilled'){const d=await f.saved(out[0].value.id);assert.equal(d.snapshot.draftRevision,1);assert.equal(d.changes[0].data.name,centralTestItem.name);assert.equal(d.currentDraftRevision,2);}else assert.equal(out[0].reason.code,'STALE_REVISION');
 });
 test(`${prefix} : ancien aperçu rejeté après édition, métadonnées ou autorité modifiées`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);await f.save();const p=await f.preview(1);await f.save({draftRevision:1,itemRevision:1});await assert.rejects(f.capture(p),{code:'STALE_REVISION'});const q=await f.preview(2),path=`sessions/${f.sid}`,s=await f.store.get(path);await f.store.runTransaction(async tx=>tx.set(path,{...s,revision:s.revision+1}));await assert.rejects(f.capture(q),{code:'CENTRAL_SNAPSHOT_STALE'});assert.equal((await f.list()).snapshots.length,0);
 });
 test(`${prefix} : attendre conserve le consentement, heure réelle enregistrée à la capture`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);let at=1000001;const w=createWorkflow({store:f.store,ownerEmail:f.owner.email,now:()=>at}),input={campaignId:f.cid,draftRevision:0};const p=await w.dispatch('previewCentralSnapshot',f.owner,input);at+=60000;const out=await w.dispatch('captureCentralSnapshot',f.owner,{...input,confirmation:p.confirmation,reason:'Capture après lecture',requestId:randomUUID()});const d=await f.saved(out.id);assert.equal(d.header.createdAt,at);assert.equal(d.report.checkedAt,at);assert.notEqual(d.report.checkedAt,p.report.checkedAt);
 });
 test(`${prefix} : contrôleur délégué lit mais ne capture pas et ne gagne aucun droit`,async()=>{
  const f=await centralSnapshotsFixture(makeStore),out=await f.capture(await f.preview());await f.grant({readWorkshops:workshops,editWorkshops:[],checkCentral:true});assert.equal((await f.list(f.mj)).canCapture,false);assert.equal((await f.saved(out.id,f.mj)).snapshot.id,out.id);await assert.rejects(f.preview(0,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.capture(await f.preview(),{},f.mj),{code:'FORBIDDEN'});await assert.rejects(f.read('admissionAdmin',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : toutes lectures refusées sans contrôle global et avant contenu`,async()=>{
  const f=await centralSnapshotsFixture(makeStore),out=await f.capture(await f.preview());await f.grant({readWorkshops:workshops,editWorkshops:[]});const run=f.store.runTransaction.bind(f.store),reads=[];f.store.runTransaction=fn=>run(tx=>fn({...tx,list:async(...args)=>{reads.push(args[0]);return tx.list(...args);}}));for(const actor of [f.mj,f.player,null]){await assert.rejects(f.list(actor));await assert.rejects(f.saved(out.id,actor));}assert.deepEqual(reads,[]);
 });
 test(`${prefix} : révocation contrôlée avant ancienne lecture et téléchargement`,async()=>{
  const f=await centralSnapshotsFixture(makeStore),out=await f.capture(await f.preview());await f.grant({readWorkshops:workshops,editWorkshops:[],checkCentral:true});await f.saved(out.id,f.mj);await f.grant({revision:1,active:false,checkCentral:false});await assert.rejects(f.saved(out.id,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.list(f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : aucune donnée civile ou politique d’admission copiée depuis I3c`,async()=>{
  const f=await reconciliationFixture(makeStore),p=await f.central('previewCentralSnapshot',{draftRevision:2}),out=await f.cc('captureCentralSnapshot',{draftRevision:2,confirmation:p.confirmation,reason:'Fiction seule'}),d=await f.central('centralSnapshot',{snapshotId:out.id});for(const text of [f.player.uid,f.player.email,'Souhait privé sans mandat','Règles fictives de recette','consentHash','invitationHash','m2Preparation','m2Reconciliation'])assert.ok(!JSON.stringify(d).includes(text),text);assert.equal(d.changes.find(c=>c.type==='character').data.biography,'Récit fictif privé');
 });
 test(`${prefix} : provenance native invalide bloque la capture sans données partielles`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);await f.save();await f.inject('item_ingredient',{source:'FORGED'});await assert.rejects(f.preview(1),{code:'CENTRAL_SNAPSHOT_INVALID_SOURCE'});assert.deepEqual(await f.store.list(`${f.base}/checks`),[]);
 });
 test(`${prefix} : page absente ou altérée refusée, jamais reconstruite depuis le brouillon`,async()=>{
  for(const mode of ['missing','content','identity']){const f=await centralSnapshotsFixture(makeStore);await f.save();const out=await f.capture(await f.preview(1)),path=`${f.base}/checks/${out.id}/pages/0`,page=await f.store.get(path);if(mode==='missing'){const run=f.store.runTransaction.bind(f.store);f.store.runTransaction=fn=>run(tx=>fn({...tx,get:key=>key===path?Promise.resolve(null):tx.get(key)}));}else await f.store.runTransaction(async tx=>tx.set(path,mode==='content'?{...page,entries:[]}:{...page,snapshotId:'other'}));await assert.rejects(f.saved(out.id),{code:'CENTRAL_SNAPSHOT_INVALID'});assert.equal((await f.view()).changes.length,1);}
 });
 test(`${prefix} : manifeste corrompu ou étranger refusé`,async()=>{
  const f=await centralSnapshotsFixture(makeStore),out=await f.capture(await f.preview()),path=`${f.base}/checks/${out.id}`,h=await f.store.get(path);await f.store.runTransaction(async tx=>tx.set(path,{...h,records:99}));await assert.rejects(f.saved(out.id),{code:'CENTRAL_SNAPSHOT_INVALID'});await assert.rejects(f.list(),{code:'CENTRAL_SNAPSHOT_INVALID'});const other=await f.create({creationId:randomUUID()});await assert.rejects(f.read('centralSnapshot',f.owner,{campaignId:other.campaignId,snapshotId:out.id}),{code:'CENTRAL_SNAPSHOT_NOT_FOUND'});
 });
 test(`${prefix} : interruption avant commit puis réessai sans capture partielle`,async()=>{
  const raw=makeStore();let fail=false;const f=await centralSnapshotsFixture(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:fn=>raw.runTransaction(async tx=>{const out=await fn(tx);if(fail)throw Error('INTERRUPTION');return out;})}));await f.save();const p=await f.preview(1),requestId=randomUUID();fail=true;await assert.rejects(f.capture(p,{requestId}),/INTERRUPTION/);fail=false;assert.deepEqual(await f.store.list(`${f.base}/checks`),[]);const out=await f.capture(p,{requestId});assert.equal((await f.saved(out.id)).snapshot.records,1);
 });
 test(`${prefix} : pages multiples et Unicode conservés exactement`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);const biography='🚀'.repeat(10000);for(let i=0;i<7;i++)await f.saveCharacter({characterId:`c${i}`,draftRevision:i,character:{...centralTestCharacter,biography,relations:[]}});const p=await f.preview(7);assert.ok(p.pages>1);const d=await f.saved((await f.capture(p)).id);assert.ok(d.changes.every(c=>c.data.biography===biography));assert.equal(d.changes.length,7);
 });
 test(`${prefix} : budget global refuse plutôt que tronquer`,async()=>{
  const raw=makeStore();let oversize=false;const f=await centralSnapshotsFixture(()=>({get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:fn=>raw.runTransaction(tx=>fn({...tx,list:async(...args)=>{const out=await tx.list(...args);if(oversize&&args[0].endsWith('/changes'))return Array.from({length:100},(_,i)=>({...out[0],id:`character_c${i}`,entityId:`c${i}`,data:{...out[0].data,id:`c${i}`}}));return out;}}))}));await f.saveCharacter({character:{...centralTestCharacter,biography:'x'.repeat(19000),roleplay:'y'.repeat(9000),playerSecrets:'z'.repeat(19000),gmNotes:'n'.repeat(19000),relations:[]}});oversize=true;await assert.rejects(f.preview(1),{code:'CENTRAL_SNAPSHOT_LIMIT'});oversize=false;assert.equal((await f.list()).snapshots.length,0);assert.equal(centralSnapshotLimits.bytes,6*1024*1024);
 });
 test(`${prefix} : paramètres stricts et rapport seul ne publient ni ne restaurent`,async()=>{
  const f=await centralSnapshotsFixture(makeStore),p=await f.preview();for(const extra of [{publish:true},{changes:[]},{snapshotId:'forged'},{reason:' '},{reason:'x'.repeat(501)},{confirmation:'forged'}])await assert.rejects(f.capture(p,extra),{code:'INVALID_CENTRAL_SNAPSHOT'});const d=await f.saved((await f.capture(p)).id),file=JSON.parse(centralSnapshotFile(d));assert.throws(()=>cleanScenarioPackage(file));for(const collection of ['characters','accounts','inventory','ledger','skills','groups'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${collection}`),[]);assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);assert.deepEqual(await f.store.list('campaignBuilds',['campaignId',f.cid]),[]);
 });
 test(`${prefix} : cycle courant revérifié avant reçus et contenu ancien`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);await f.save();const p=await f.preview(1),requestId=randomUUID(),out=await f.capture(p,{requestId}),d=await f.store.get(f.base);await f.store.runTransaction(async tx=>tx.set(f.base,{...d,status:'BUILDING'}));await assert.rejects(f.saved(out.id),{code:'CENTRAL_DRAFT_UNAVAILABLE'});await assert.rejects(f.capture(p,{requestId}),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
 });
 test(`${prefix} : ancien propriétaire sans autorité ne récupère pas son reçu`,async()=>{
  const f=await centralSnapshotsFixture(makeStore),p=await f.preview(),requestId=randomUUID();await f.capture(p,{requestId});const path=`campaigns/${f.cid}`,c=await f.store.get(path);await f.store.runTransaction(async tx=>tx.set(path,{...c,ownerUid:f.mj.uid}));await assert.rejects(f.capture(p,{requestId}),{code:'FORBIDDEN'});await assert.rejects(f.list(),{code:'FORBIDDEN'});
 });
 test(`${prefix} : liste bornée et ancien instantané toujours lisible par son lien`,async()=>{
  const f=await centralSnapshotsFixture(makeStore);let first;for(let i=0;i<21;i++){await f.save({draftRevision:i,itemRevision:i});const out=await f.capture(await f.preview(i+1));first??=out;}const list=await f.list();assert.equal(list.snapshots.length,20);assert.equal(list.hasMore,true);assert.equal((await f.saved(first.id)).snapshot.draftRevision,1);
 });
}
