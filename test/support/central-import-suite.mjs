import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralFixture} from './central-master-suite.mjs';
import {readCentralXlsx,writeCentralXlsx} from '../../web/central-xlsx.mjs';
export const centralItemRow={id:'ingredient',operation:'CREER',revision:0,nom:'Ingrédient fictif',description:'Exemple',categorie:'Ingrédient',unite:'unité',type:'STACKABLE',consommable:'OUI',volume_unitaire:1,legalite:'UNSPECIFIED',pillable:'NON',notes_mj:'Privé'};
export const centralRecipeRow={id:'formula',operation:'CREER',revision:0,nom:'Formule fictive',type:'SCENARIO',niveau_minimum:1,produit_id:'dose',composants:'ingredient:2',competence_id:'skill',effet_id:'effect',laboratoire_lieu_id:'lab',connaissance_id:'knowledge',prix_indicatif:0};
export async function importFixture(makeStore){
 const f=await centralFixture(makeStore);
 const exportFile=(workshop='M1',ids=[],actor=f.owner)=>f.read('exportCentralDraft',actor,{campaignId:f.cid,workshop,ids});
 const file=async(workshop='M1',rows=[centralItemRow],actor=f.owner)=>{const e=await exportFile(workshop,[],actor);e.sheets[workshop==='M1'?'Objets':'Recettes']=rows;return {campaignId:f.cid,workshop,fileName:'Préparation.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};};
 const prepare=(input,actor=f.owner)=>f.read('prepareCentralImport',actor,input);
 const apply=(input,p,extra={},actor=f.owner)=>f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Import synthétique',...extra},actor);
 return {...f,exportFile,file,prepare,apply};
}
export function centralImportSuite(makeStore,prefix='Excel central C1d'){
 test(`${prefix} : XLSX réel, aperçu sans écriture, lot atomique natif sans ressources`,async()=>{
  const f=await importFixture(makeStore),session=await f.store.get(`sessions/${f.sid}`),input=await f.file('M1',[centralItemRow,{...centralItemRow,id:'dose',nom:'Dose'}]),p=await f.prepare(input);
  assert.deepEqual(p.errors,[]);assert.equal(p.changes.length,2);assert.equal(p.changes[0].row,2);assert.equal(await f.store.get(f.base),null);
  const result=await f.apply(input,p);assert.equal(result.draftRevision,1);assert.equal(result.changed,2);const d=await f.view();assert.equal(d.changes.length,2);assert.equal(d.history.length,2);
  for(const c of d.changes){assert.equal(c.source,'XLSX');assert.equal(c.revision,1);assert.equal(c.data.revision,1);assert.equal(c.data.publicationState,'DRAFT');assert.equal(c.provenance.fileName,input.fileName);assert.equal(c.provenance.schemaVersion,1);assert.ok(c.requestId);assert.equal(c.provenance.batchId,result.batchId);}
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),session);for(const k of ['items','characters','inventory','accounts','ledger','actionPoints'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[]);
  assert.deepEqual(await f.store.list(`campaigns/${f.cid}/versions`),[]);
 });
 test(`${prefix} : export sélectionné, réimport identique sans nouvelle révision`,async()=>{
  const f=await importFixture(makeStore);await f.save();const before=await f.view(),e=await f.exportFile('M1',['ingredient']);const input={campaignId:f.cid,workshop:'M1',fileName:'Retour.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))},p=await f.prepare(input);
  assert.deepEqual(p.errors,[]);assert.equal(p.changes[0].operation,'INCHANGE');const r=await f.apply(input,p);assert.equal(r.changed,0);assert.equal(r.draftRevision,1);assert.deepEqual(await f.view(),before);
  await assert.rejects(f.exportFile('M1',['absent']),{code:'CENTRAL_EXPORT_STALE'});await assert.rejects(f.exportFile('M1',['ingredient','ingredient']),{code:'INVALID_CENTRAL_IMPORT'});
 });
 test(`${prefix} : lot rejoué, nouveau requestId et fichier renommé ne doublent pas`,async()=>{
  const f=await importFixture(makeStore),input=await f.file(),p=await f.prepare(input),extra={requestId:randomUUID()},r=await f.apply(input,p,extra);
  assert.deepEqual(await f.apply(input,p,extra),r);await f.save({draftRevision:1,itemRevision:1});assert.deepEqual(await f.apply({...input,fileName:'renommé.xlsx'},p),r);
  assert.deepEqual((await f.prepare(input)).alreadyApplied,r);assert.equal((await f.view()).draft.revision,2);assert.equal((await f.view()).history.length,2);
  const changed=structuredClone(input);changed.sheets.Objets[0].nom='Autre';await assert.rejects(f.apply(changed,p,extra),{code:'REQUEST_ID_REUSED'});await assert.rejects(f.prepare(changed),{code:'CENTRAL_BATCH_REUSED'});
 });
 test(`${prefix} : erreurs localisées refusent tout le lot, aucune ligne partielle`,async()=>{
  const f=await importFixture(makeStore),input=await f.file('M1',[centralItemRow,{...centralItemRow,id:'second',consommable:'peut-être'}]),p=await f.prepare(input);
  assert.equal(p.confirmation,null);assert.equal(p.errors[0].sheet,'Objets');assert.equal(p.errors[0].row,3);assert.equal(p.errors[0].column,'consommable');assert.equal(p.errors[0].id,'second');await assert.rejects(f.apply(input,p),{code:'INVALID_CENTRAL_IMPORT'});assert.equal(await f.store.get(f.base),null);
  for(const patch of [{id:'../interdit'},{revision:-1},{operation:'PUBLIER'},{nom:'!EFFACER'},{volume_unitaire:1.2},{billes_par_recharge:0},{consommable:'NON',billes_par_recharge:10}]){const bad=await f.file('M1',[{...centralItemRow,...patch}]);assert.ok((await f.prepare(bad)).errors.length,JSON.stringify(patch));}
 });
 test(`${prefix} : métadonnées liées à campagne, profil, base, module et format`,async()=>{
  const f=await importFixture(makeStore),input=await f.file();
  for(const [key,value] of Object.entries({format:'gn-engine-master',version:'2',schema_version:'2',type:'CAMPAGNE',campaign_id:'other',scenario_id:'historical',rule_profile:'OTHER',central_base_version:'published',draft_id:'other',module_type:'M4',import_batch_id:'../x',draft_revision:'-1'})){
   const v=structuredClone(input);v.sheets.Meta[0][key]=value;const p=await f.prepare(v);assert.ok(p.errors.some(e=>e.sheet==='Meta'),key);await assert.rejects(f.apply(v,p),{code:'INVALID_CENTRAL_IMPORT'});
  }
  assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : champs et onglets inconnus, objets, doublons et tailles refusés`,async()=>{
  const f=await importFixture(makeStore),input=await f.file();
  for(const patch of [v=>v.sheets.Objets[0].stock='',v=>v.sheets.Recettes=[],v=>v.sheets.Objets[0].nom={},v=>v.sheets.Objets.push({...v.sheets.Objets[0]}),v=>v.sheets.Meta.push({...v.sheets.Meta[0]}),v=>v.sheets.Objets=Array.from({length:101},(_,i)=>({...centralItemRow,id:`x${i}`}))]){const v=structuredClone(input);patch(v);const p=await f.prepare(v);assert.ok(p.errors.length);await assert.rejects(f.apply(v,p),{code:'INVALID_CENTRAL_IMPORT'});}
  await assert.rejects(f.prepare({...input,stock:1}),{code:'INVALID_CENTRAL_IMPORT'});await assert.rejects(f.prepare({...input,sheets:{...input.sheets,Objets:[{...centralItemRow,notes_mj:'x'.repeat(1024*1024)}]}}),{code:'INVALID_CENTRAL_IMPORT'});
 });
 test(`${prefix} : blanc conserve, effacement explicite, absence ne supprime pas`,async()=>{
  const f=await importFixture(makeStore);await f.save();const input=await f.file('M1',[{id:'ingredient',operation:'MODIFIER',revision:1,nom:'',description:'!EFFACER',volume_unitaire:'!EFFACER',notes_mj:'!EFFACER'}]),p=await f.prepare(input);assert.deepEqual(p.errors,[]);await f.apply(input,p);
  let d=await f.view();assert.equal(d.changes[0].data.name,'Ingrédient synthétique');assert.equal(d.changes[0].data.description,'');assert.equal(d.changes[0].data.unitVolume,null);assert.equal(d.changes[0].data.gmNotes,'');
  const empty=await f.file('M1',[]);await f.apply(empty,await f.prepare(empty));d=await f.view();assert.equal(d.changes.length,1);assert.equal(d.draft.revision,2);
 });
 test(`${prefix} : archive et restauration explicites, export archivé neutre`,async()=>{
  const f=await importFixture(makeStore);await f.save();const input=await f.file('M1',[{id:'ingredient',operation:'ARCHIVER',revision:1}]);await f.apply(input,await f.prepare(input));let d=await f.view();assert.equal(d.changes[0].operation,'ARCHIVE');
  const e=await f.exportFile('M1',['ingredient']),neutral={campaignId:f.cid,workshop:'M1',fileName:'archive.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};assert.equal((await f.prepare(neutral)).changes[0].operation,'INCHANGE');
  const bad=await f.file('M1',[{id:'ingredient',operation:'MODIFIER',revision:2,nom:'Renommé'}]);assert.ok((await f.prepare(bad)).errors.length);
  const restore=await f.file('M1',[{id:'ingredient',operation:'RESTAURER',revision:2}]);await f.apply(restore,await f.prepare(restore));d=await f.view();assert.equal(d.changes[0].operation,'UPSERT');assert.equal(d.changes[0].data.revision,3);assert.equal(d.history.length,3);
 });
 test(`${prefix} : aperçu périmé après édition web/M2 et nouvelle confirmation requise`,async()=>{
  const f=await importFixture(makeStore),input=await f.file(),p=await f.prepare(input);await f.configure();await assert.rejects(f.apply(input,p),{code:'STALE_REVISION'});
  input.sheets.Meta[0].draft_revision='1';await assert.rejects(f.apply(input,p),{code:'CENTRAL_IMPORT_STALE'});const fresh=await f.prepare(input);await f.apply(input,fresh);assert.equal((await f.view()).draft.revision,2);assert.equal((await f.view('M2')).changes.length,1);
 });
 test(`${prefix} : concurrent import et web, un seul gagnant et reprise explicite`,async()=>{
  const f=await importFixture(makeStore),input=await f.file(),p=await f.prepare(input),r=await Promise.allSettled([f.apply(input,p),f.save()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.view()).history.length,1);
 });
 test(`${prefix} : deux confirmations simultanées du même lot ne doublent pas`,async()=>{
  const f=await importFixture(makeStore),input=await f.file(),p=await f.prepare(input),r=await Promise.all([f.apply(input,p),f.apply(input,p)]);assert.deepEqual(r[0],r[1]);assert.equal((await f.view()).history.length,1);
 });
 test(`${prefix} : lecture seule, rôle session et révocation avant reçus`,async()=>{
  const f=await importFixture(makeStore),input=await f.file();await assert.rejects(f.prepare(input,f.mj),{code:'FORBIDDEN'});await f.grant({editWorkshops:[]});assert.ok((await f.exportFile('M1',[],f.mj)).sheets);await assert.rejects(f.prepare(input,f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1});const p=await f.prepare(input,f.mj),extra={requestId:randomUUID()};await assert.rejects(f.apply(input,p,{},f.owner),{code:'CENTRAL_IMPORT_STALE'});await f.apply(input,p,extra,f.mj);
  await f.grant({revision:2,active:false});await assert.rejects(f.apply(input,p,extra,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.exportFile('M1',[],f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : changement des droits invalide une confirmation encore autorisée`,async()=>{
  const f=await importFixture(makeStore);await f.grant();const input=await f.file(),p=await f.prepare(input,f.mj);await f.grant({revision:1,readWorkshops:['M1','M4']});await assert.rejects(f.apply(input,p,{},f.mj),{code:'CENTRAL_IMPORT_STALE'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : M4 sans lecture M1 ne lit ni ne révèle les modèles`,async()=>{
  const base=makeStore();let guarded=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(tx=>cb({...tx,list:async(path,filter,options)=>{if(guarded&&path.endsWith('/changes'))assert.notDeepEqual(filter,['workshop','M1']);return tx.list(path,filter,options);}}))};
  const f=await importFixture(()=>store);await f.save();await f.grant({readWorkshops:['M4'],editWorkshops:['M4']});guarded=true;
  const input=await f.file('M4',[centralRecipeRow],f.mj),p=await f.prepare(input,f.mj);assert.deepEqual(p.errors,[]);assert.equal(p.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').length,2);assert.doesNotMatch(JSON.stringify(p),/Note M1 privée|Ingrédient synthétique/);await f.apply(input,p,{},f.mj);
  const d=await f.view('M4',f.mj);assert.equal(d.changes[0].data.indicativePrice,0);assert.equal(d.changes[0].data.masterArchived,false);assert.equal(d.changes[0].data.components[0].quantity,2);
 });
 test(`${prefix} : M4 références différées et corrections M1 natives`,async()=>{
  const f=await importFixture(makeStore),input=await f.file('M4',[centralRecipeRow]),p=await f.prepare(input);assert.equal(p.diagnostics.filter(x=>x.code==='REFERENCE_MISSING').length,2);assert.equal(p.diagnostics[0].sheet,'Recettes');assert.equal(p.diagnostics[0].row,2);assert.equal(p.diagnostics[0].column,'produit_id');await f.apply(input,p);
  const items=await f.file('M1',[centralItemRow,{...centralItemRow,id:'dose'}]);await f.apply(items,await f.prepare(items));const d=await f.view('M4');assert.equal(d.diagnostics.some(x=>x.code==='REFERENCE_MISSING'),false);assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_PENDING').length,4);
  const e=await f.exportFile('M4',['formula']),round={campaignId:f.cid,workshop:'M4',fileName:'recettes.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))};assert.equal((await f.prepare(round)).changes[0].operation,'INCHANGE');
 });
 test(`${prefix} : validation native des composants et archives de recettes`,async()=>{
  const f=await importFixture(makeStore);for(const patch of [{composants:'x:1;x:2'},{composants:'x:0'},{produit_id:'x',composants:'x:1'},{niveau_minimum:6},{composants:'x:1:2'}]){const input=await f.file('M4',[{...centralRecipeRow,...patch}]);assert.ok((await f.prepare(input)).errors.length);}
  const input=await f.file('M4',[centralRecipeRow]);await f.apply(input,await f.prepare(input));const archived=await f.file('M4',[{id:'formula',operation:'ARCHIVER',revision:1}]);await f.apply(archived,await f.prepare(archived));assert.equal((await f.view('M4')).changes[0].data.masterArchived,true);
 });
 test(`${prefix} : cycle incompatible bloque également le reçu d’import`,async()=>{
  const f=await importFixture(makeStore),input=await f.file(),p=await f.prepare(input),extra={requestId:randomUUID()};await f.apply(input,p,extra);const c=await f.store.get(`campaigns/${f.cid}`);await f.store.runTransaction(async tx=>tx.set(`campaigns/${f.cid}`,{...c,master:{...c.master,activeVersionId:'published'}}));await assert.rejects(f.apply(input,p,extra),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
 });
 test(`${prefix} : confirmation liée au contenu et révision de chaque définition`,async()=>{
  const f=await importFixture(makeStore),input=await f.file(),p=await f.prepare(input);const changed=structuredClone(input);changed.sheets.Objets[0].nom='Autre';await assert.rejects(f.apply(changed,p),{code:'CENTRAL_IMPORT_STALE'});await assert.rejects(f.apply(input,p,{reason:''}),{code:'INVALID_CENTRAL_IMPORT'});await assert.rejects(f.apply(input,p,{confirmation:null}),{code:'CENTRAL_IMPORT_STALE'});
  await f.save();const stale=await f.file('M1',[{id:'ingredient',revision:0,operation:'MODIFIER',nom:'Autre'}]);assert.equal((await f.prepare(stale)).errors[0].column,'revision');
 });
 test(`${prefix} : cent lignes atomiques et limite cumulative archives comprises`,async()=>{
  const f=await importFixture(makeStore),input=await f.file('M1',Array.from({length:100},(_,i)=>({...centralItemRow,id:`item${i}`}))),p=await f.prepare(input);assert.deepEqual(p.errors,[]);assert.equal((await f.apply(input,p)).changed,100);assert.equal((await f.store.list(`${f.base}/history`)).length,100);
  const first=(await f.view()).changes[0];await f.store.runTransaction(async tx=>{for(let i=100;i<250;i++)tx.set(`${f.base}/changes/item_item${i}`,{...first,id:`item_item${i}`,entityId:`item${i}`,operation:'ARCHIVE',data:{...first.data,id:`item${i}`}});});
  const over=await f.file('M1',[centralItemRow]),bad=await f.prepare(over);assert.ok(bad.errors.some(e=>e.message.includes('250')));await assert.rejects(f.apply(over,bad),{code:'INVALID_CENTRAL_IMPORT'});assert.equal((await f.view()).draft.revision,1);
 });
 test(`${prefix} : texte littéral réservé et préfixes de formule survivent au XLSX`,async()=>{
  const f=await importFixture(makeStore);await f.save({item:{name:'!EFFACER',description:'!!Texte',category:'=1+1',unit:'@unité',kind:'STACKABLE',consumable:false,gmNotes:'!EFFACER'}});
  const e=await f.exportFile('M1',['ingredient']),input={campaignId:f.cid,workshop:'M1',fileName:'littéral.xlsx',sheets:readCentralXlsx(writeCentralXlsx(e.sheets))},p=await f.prepare(input);assert.deepEqual(p.errors,[]);assert.equal(p.changes[0].operation,'INCHANGE');
 });
 test(`${prefix} : interruption transactionnelle puis reprise sans historique partiel`,async()=>{
  const base=makeStore();let fail=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw new Error('INTERRUPTION');return r;})},f=await importFixture(()=>store),input=await f.file(),p=await f.prepare(input);fail=true;await assert.rejects(f.apply(input,p),/INTERRUPTION/);fail=false;assert.equal(await base.get(f.base),null);assert.deepEqual(await base.list(`${f.base}/imports`),[]);assert.deepEqual(await base.list(`${f.base}/history`),[]);await f.apply(input,p);assert.equal((await f.view()).history.length,1);
 });
}
