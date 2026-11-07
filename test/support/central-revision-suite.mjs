import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {entryFixture} from './space-outlaws-entry-suite.mjs';
import {centralTestKnowledge} from './central-knowledge-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';

export function centralRevisionSuite(makeStore,prefix='Master Vn+1'){
 test(`${prefix} : ouverture concurrente sans copie ni changement de la naissance préparée`,async()=>{
  const f=await entryFixture(makeStore),campaign=`campaigns/${f.campaignId}`,session=`sessions/${f.sid}`;
  const intent={baseVersionId:'unknown',pointerRevision:1,reason:'Préparer la suite'};
  await assert.rejects(f.cc('openCentralRevision',intent),{code:'SO_RELEASE_REQUIRED'});
  const {versionId}=await f.release(await f.releasePreview()),birth=await f.birthPreview();
  const before=await f.store.get(campaign),beforeSession=await f.store.get(session),sealed=await f.store.get(f.base);
  const published=await f.central('centralMaster');
  assert.deepEqual(published.draft,{status:'PUBLISHED',baseVersionId:versionId,pointerRevision:1});
  const input={...intent,baseVersionId:versionId};
  await assert.rejects(f.cc('openCentralRevision',{...input,pointerRevision:2}),{code:'STALE_REVISION'});
  const results=await Promise.all([f.cc('openCentralRevision',input),f.cc('openCentralRevision',input)]);
  assert.deepEqual(results[0],results[1]);
  const path=`${campaign}/masterDrafts/${results[0].id}`,draft=await f.store.get(path);
  assert.equal(draft.reason,intent.reason);
  assert.equal(draft.revision,0);
  assert.deepEqual(await f.store.list(`${path}/changes`),[]);
  assert.equal((await f.store.list(`${campaign}/masterDrafts`)).length,2);
  assert.deepEqual(await f.store.get(campaign),before);
  assert.deepEqual(await f.store.get(session),beforeSession);
  assert.deepEqual(await f.store.get(f.base),sealed);
  await f.birth(birth);
  assert.equal((await f.store.get(session)).versionId,versionId);
 });

 test(`${prefix} : modification et archivage hérités avec historique et version publiée intacte`,async()=>{
  const f=await entryFixture(makeStore),campaign=`campaigns/${f.campaignId}`,session=`sessions/${f.sid}`;
  const {versionId}=await f.release(await f.releasePreview());
  await f.birth(await f.birthPreview());
  const current=await f.read('session');
  await f.cmd('setStage',{revision:current.revision,stage:'EN_JEU'});
  const before=await f.store.get(session),versions=await f.store.list(`${campaign}/versions`);
  const pages=await f.store.list(`${campaign}/versions/${versionId}/pages`);
  const {id:draftId}=await f.cc('openCentralRevision',{baseVersionId:versionId,pointerRevision:1,reason:'Préparer les ateliers'});
  const view=()=>f.central('centralMaster',{workshop:'M1'});
  const original=await view(),[item,other]=original.changes.filter(c=>c.type==='item');
  const save={draftId,draftRevision:0,itemId:item.entityId,itemRevision:item.data.revision,item:{...centralTestItem,name:'Bien révisé'},reason:'Renommer',requestId:randomUUID()};
  await assert.rejects(f.cc('saveCentralItem',{...save,draftId:'initial'}),{code:'STALE_REVISION'});
  const {draftId:ignored,...oldClient}=save;
  await assert.rejects(f.cc('saveCentralItem',oldClient),{code:'STALE_REVISION'});
  const archive={draftId,draftRevision:0,itemId:other.entityId,itemRevision:other.data.revision,reason:'Archiver'};
  const concurrent=await Promise.allSettled([f.cc('saveCentralItem',save),f.cc('archiveCentralItem',archive)]);
  assert.equal(concurrent.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(concurrent.find(result=>result.status==='rejected').reason.code,'STALE_REVISION');
  if(concurrent[0].status==='rejected')await f.cc('saveCentralItem',{...save,draftRevision:1});
  else{
   assert.deepEqual(await f.cc('saveCentralItem',save),concurrent[0].value);
   await f.cc('archiveCentralItem',{...archive,draftRevision:1});
  }
  const edited=await view();
  assert.equal(edited.draft.revision,2);
  assert.equal(edited.changes.find(c=>c.id===item.id).data.name,'Bien révisé');
  assert.equal(edited.changes.find(c=>c.id===other.id).operation,'ARCHIVE');
  assert.deepEqual(edited.changes.filter(c=>c.id!==item.id&&c.id!==other.id),original.changes.filter(c=>c.id!==item.id&&c.id!==other.id));
  assert.deepEqual(edited.history.find(h=>h.change.id===item.id).before,item);
  assert.equal((await f.store.list(`${campaign}/masterDrafts/${draftId}/changes`)).length,2);
  assert.deepEqual(await f.store.get(session),before);
  assert.deepEqual(await f.store.list(`${campaign}/versions`),versions);
  assert.deepEqual(await f.store.list(`${campaign}/versions/${versionId}/pages`),pages);
  assert.equal((await f.store.get(campaign)).master.activeVersionId,versionId);
 });

 test(`${prefix} : délégation par atelier, révocation avant reçu et outils initiaux isolés`,async()=>{
  const f=await entryFixture(makeStore);
  await f.grant(0,{readWorkshops:['M1'],editWorkshops:['M1']});
  const {versionId}=await f.release(await f.releasePreview()),intent={baseVersionId:versionId,pointerRevision:1,reason:'Préparer M1'};
  await assert.rejects(f.cc('openCentralRevision',intent,f.mj),{code:'FORBIDDEN'});
  await assert.rejects(f.central('centralMaster',{},f.mj),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
  const {id:draftId}=await f.cc('openCentralRevision',intent);
  const d=await f.central('centralMaster',{},f.mj);
  assert.equal(d.workshop,'M1');
  assert.ok(d.changes.every(c=>c.workshop==='M1'));
  assert.equal((await f.read('dashboard',f.mj)).centralCampaigns[0].id,f.campaignId);
  await assert.rejects(f.central('centralMaster',{workshop:'M2'},f.mj),{code:'FORBIDDEN'});
  for(const action of ['exportCentralDraft','prepareCentralImport','previewCentralSnapshot']){
   await assert.rejects(f.central(action),{code:'CENTRAL_REVISION_WEB_ONLY'});
  }
  const check=(actor,patch={})=>f.central('checkCentralDraft',{draftId,draftRevision:0,...patch},actor);
  await assert.rejects(check(f.mj),{code:'FORBIDDEN'});
  await f.grant(1,{readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:['M1'],checkCentral:true});
  assert.equal((await check(f.mj)).authority.kind,'DELEGATED');
  await assert.rejects(check(f.owner,{draftId:'initial'}),{code:'STALE_REVISION'});
  const input={draftId,draftRevision:0,itemId:'new',itemRevision:0,item:centralTestItem,reason:'Nouveau modèle',requestId:randomUUID()};
  await f.cc('saveCentralItem',input,f.mj);
  await f.grant(2,{active:false});
  await assert.rejects(check(f.mj),{code:'FORBIDDEN'});
  await assert.rejects(f.cc('saveCentralItem',input,f.mj),{code:'FORBIDDEN'});
  await assert.rejects(f.read('dashboard',f.mj),{code:'FORBIDDEN'});
 });

 test(`${prefix} : diff net et références affectées sur les définitions héritées`,async()=>{
  const f=await entryFixture(makeStore);
  const {versionId}=await f.release(await f.releasePreview());
  const {id:draftId}=await f.cc('openCentralRevision',{baseVersionId:versionId,pointerRevision:1,reason:'Comparer la suite'});
  const check=draftRevision=>f.central('checkCentralDraft',{draftId,draftRevision});
  const baseline=await check(0);
  assert.equal(baseline.scope,'REVISION_DRAFT_PREPARATION');
  assert.equal(baseline.draft.baseVersionId,versionId);
  assert.equal(baseline.totals.invalid,0);
  assert.deepEqual(baseline.diff,[]);
  assert.deepEqual(baseline.referenceChanges,[]);
  const view=await f.central('centralMaster',{workshop:'M1'}),item=view.changes.find(c=>c.type==='item');
  const path=`campaigns/${f.campaignId}/masterDrafts/${draftId}`;
  const archive={draftId,draftRevision:0,itemId:item.entityId,itemRevision:item.data.revision,reason:'Retirer du catalogue'};
  const [read,write]=await Promise.allSettled([check(0),f.cc('archiveCentralItem',archive)]);
  assert.equal(write.status,'fulfilled');
  if(read.status==='fulfilled')assert.equal(read.value.fingerprint,baseline.fingerprint);
  else assert.equal(read.reason.code,'STALE_REVISION');
  const after=await check(1);
  assert.equal(after.status,'CORRECTIONS_REQUIRED');
  assert.equal(after.publicationAvailable,false);
  assert.deepEqual(after.diff.map(d=>[d.id,d.operation,d.fields]),[[item.entityId,'ARCHIVE',[]]]);
  assert.ok(after.referenceChanges.some(e=>e.from.type==='classKit'&&e.to.id===item.entityId&&e.previousStatus==='RESOLVED'&&e.status==='ARCHIVED'));
  assert.ok(after.diagnostics.some(d=>d.reference===item.entityId&&d.code==='REFERENCE_ARCHIVED'));
  assert.equal((await f.store.list(`${path}/changes`)).length,1);
  assert.deepEqual(await f.store.list(`${path}/checks`),[]);
  const {name,description,category,unit,kind,consumable,unitVolume,legality,pillable,gmNotes,laserRecharge,shipModule}=item.data;
  await f.cc('saveCentralItem',{...archive,draftRevision:1,itemRevision:item.data.revision+1,item:{name,description,category,unit,kind,consumable,unitVolume,legality,pillable,gmNotes,...(laserRecharge?{laserRecharge}:{}),...(shipModule?{shipModule}:{})}});
  const restored=await check(2);
  assert.deepEqual(restored.diff,[]);
  assert.deepEqual(restored.referenceChanges,[]);
  assert.notEqual(restored.fingerprint,baseline.fingerprint);
 });

 test(`${prefix} : restauration, ajout et retrait de références, accès et QR sans valeurs privées`,async()=>{
  const f=await entryFixture(makeStore),m2=await f.view(),characterId=m2.changes.find(c=>c.type==='character').entityId;
  const {draft}=await f.central('centralMaster',{workshop:'M1'});
  const knowledge={...centralTestKnowledge,title:'Indice V1',body:'TEXTE_PRIVE_V1',qrAudience:'SELECTED',qrEnabled:true,qrCharacterIds:[characterId],initialCharacterIds:[]};
  await f.cc('saveCentralKnowledge',{knowledgeId:'intel',knowledgeRevision:0,draftRevision:draft.revision,knowledge,reason:'Indice'});
  await f.cc('saveCentralItem',{itemId:'reserve',itemRevision:0,draftRevision:draft.revision+1,item:centralTestItem,reason:'Modèle de réserve'});
  await f.cc('archiveCentralItem',{itemId:'reserve',itemRevision:1,draftRevision:draft.revision+2,reason:'Archive initiale'});
  const {versionId}=await f.release(await f.releasePreview());
  const {id:draftId}=await f.cc('openCentralRevision',{baseVersionId:versionId,pointerRevision:1,reason:'Préparer les contenus'});
  await f.cc('saveCentralKnowledge',{draftId,knowledgeId:'intel',knowledgeRevision:1,draftRevision:0,knowledge:{...knowledge,body:'TEXTE_PRIVE_V2',shareMode:'COPY',qrEnabled:false,qrCharacterIds:[],initialCharacterIds:[characterId]},reason:'Revoir la diffusion'});
  await f.cc('saveCentralItem',{draftId,itemId:'reserve',itemRevision:2,draftRevision:1,item:centralTestItem,reason:'Restaurer le modèle'});
  await f.cc('saveCentralItem',{draftId,itemId:'new',itemRevision:0,draftRevision:2,item:centralTestItem,reason:'Ajouter un modèle'});
  const r=await f.central('checkCentralDraft',{draftId,draftRevision:3}),updated=r.diff.find(d=>d.id==='intel');
  assert.deepEqual(r.diff.map(d=>[d.id,d.operation]),[['new','ADD'],['reserve','RESTORE'],['intel','UPDATE']]);
  assert.deepEqual(updated.visibilityFields,['initialCharacterIds','shareMode']);
  assert.deepEqual(updated.qrFields,['qrCharacterIds','qrEnabled']);
  assert.deepEqual(updated.privateFields,['body','initialCharacterIds','qrCharacterIds']);
  assert.ok(r.referenceChanges.some(e=>e.field==='qrCharacterIds.0'&&e.status===null&&e.previousStatus==='RESOLVED'));
  assert.ok(r.referenceChanges.some(e=>e.field==='initialCharacterIds.0'&&e.status==='RESOLVED'&&e.previousStatus===null));
  assert.doesNotMatch(JSON.stringify(r),/TEXTE_PRIVE_V[12]/);
  const path=`campaigns/${f.campaignId}/masterDrafts/${draftId}/changes/item_reserve`,old=await f.store.get(path);
  await f.store.runTransaction(async tx=>tx.set(path,{...old,revision:draft.revision+1}));
  const invalid=await f.central('checkCentralDraft',{draftId,draftRevision:3});
  assert.equal(invalid.totals.invalid,1);
  assert.ok(invalid.diagnostics.some(d=>d.code==='INVALID_RECORD'&&d.entityId==='reserve'));
  assert.ok(!invalid.diff.some(d=>d.id==='reserve'));
 });

 test(`${prefix} : version source endommagée refusée à la réouverture et au contrôle`,async()=>{
  const f=await entryFixture(makeStore);
  const {versionId}=await f.release(await f.releasePreview()),campaign=`campaigns/${f.campaignId}`;
  const {id:draftId}=await f.cc('openCentralRevision',{baseVersionId:versionId,pointerRevision:1,reason:'Version source'});
  const path=`${campaign}/versions/${versionId}/pages/0`,page=await f.store.get(path);
  await f.store.runTransaction(async tx=>tx.set(path,{...page,entries:[]}));
  await assert.rejects(f.cc('openCentralRevision',{baseVersionId:versionId,pointerRevision:1,reason:'Version source'}),{code:'SO_VERSION_INVALID'});
  await assert.rejects(f.central('checkCentralDraft',{draftId,draftRevision:0}),{code:'SO_VERSION_INVALID'});
  assert.equal((await f.store.list(`${campaign}/masterDrafts`)).length,2);
 });
}
