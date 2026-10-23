import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {recipeMasterExample} from '../../src/shared/recipe-example.mjs';
import {masterExample} from '../../src/shared/master-examples.mjs';
import {scenarioCollections,cleanScenarioSnapshot} from '../../src/core/scenario-package.mjs';
import {moduleDraft,moduleFormRow,moduleMasterSheets} from '../../web/master-editor.mjs';
import {recipeBundleSheets} from '../../web/master-module-export.mjs';
import {globalMasterSheets} from '../../web/master-global-export.mjs';
import {masterDependencies} from '../../src/shared/master-dependencies.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';

const view=(f,extra={},actor=f.owner)=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'magasins',sheet:'Recettes',...extra},actor);
const file=(w,row)=>({Meta:w.meta,Recettes:[row]});
const edit=(id,patch,version='2')=>({Meta:recipeMasterExample().Meta,Recettes:[{id,operation:'MODIFIER',version,...patch}]});
export function masterRecipesSuite(fixture,prefix){
 test(`${prefix} SO-06b REC-SO-REC-01 : exemple adapté, références communes et import répété sans crédit ni lot`,async()=>{
  const f=await fixture(),sheets=recipeMasterExample();await f.apply(masterExample());
  const oldSession=await f.session(),oldBase=`sessions/${oldSession.id}`,oldState={};
  for(const c of ['items','inventory','accounts','characters','knowledge','groups'])oldState[c]=await f.store.list(`${oldBase}/${c}`);
  const base=`scenarios/${f.scenarioId}`,existing=await f.store.list(`${base}/items`),preview=await f.prepare(sheets,{module:'magasins'});
  assert.equal(preview.canApply,true);assert.equal(preview.counts.CREATE,20);assert.deepEqual(await f.store.list(`${base}/items`),existing);
  await f.apply(sheets,{module:'magasins'});assert.equal((await f.apply(sheets,{module:'magasins'})).unchanged,true);
  const recipes=await f.store.list(`${base}/recipes`);assert.equal(recipes.length,5);assert.equal(recipes.reduce((n,r)=>n+r.components.length,0),17);
  assert.equal((await f.store.list(`${base}/items`)).length,existing.length+15);
  for(const r of recipes){assert.equal(r.publicationState,'DRAFT');assert.equal(r.skillId,null);assert.equal(r.laboratoryTargetId,null);assert.equal(r.unlockKnowledgeId,null);}
  for(const collection of ['accounts','inventory','commodityPrices','fieldActions'])assert.equal((await f.store.list(`${base}/${collection}`)).length,0);
  assert.equal(recipes.find(r=>r.id==='TOXI-P05').effectId,null);
  for(const [c,expected] of Object.entries(oldState))assert.deepEqual(await f.store.list(`${oldBase}/${c}`),expected);
  assert.deepEqual(await f.store.list(`${oldBase}/recipes`),[]);
 });
 test(`${prefix} SO-06b : création, modification, copie et archivage dans le même Master`,async()=>{
  const f=await fixture();await f.apply(recipeMasterExample());let w=await view(f),draft=moduleDraft(w);
  let row=moduleFormRow(w,draft,{...draft.row,nom:'Formule privée',produit_id:'ANTIDOTE-ORD',composants:'ING-01:2;ING-10:1',prix_indicatif:'0'});
  await f.apply(file(w,row));const id=row.id;w=await view(f);
  const exported=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w,[w.rows.find(r=>r.row.id===id)])));
  assert.equal(exported.Recettes[0].composants,'ING-01:2;ING-10:1');assert.equal(exported.Recettes[0].prix_indicatif,'0');
  exported.Recettes[0].nom='Formule corrigée';await f.apply(exported);w=await view(f);
  draft=moduleDraft(w,id,'duplicate');row=moduleFormRow(w,draft,draft.row);assert.notEqual(row.id,id);assert.equal(row.publication,'DRAFT');await f.apply(file(w,row));
  w=await view(f);await f.apply(file(w,moduleFormRow(w,moduleDraft(w,id,'archive'),{})));w=await view(f);
  assert.equal(w.rows.find(r=>r.row.id===id).archived,true);
  draft=moduleDraft(w,id);await f.apply(file(w,moduleFormRow(w,draft,{...draft.row,composants:'',prix_indicatif:''})));
  const restored=await f.store.get(`scenarios/${f.scenarioId}/recipes/${id}`);assert.equal(restored.masterArchived,false);assert.deepEqual(restored.components,[]);assert.equal(restored.indicativePrice,null);
 });
 test(`${prefix} SO-06b : publication, effet libre, quantités et références invalides bloqués atomiquement`,async()=>{
  const f=await fixture();await f.apply(recipeMasterExample());const base=`scenarios/${f.scenarioId}`,before=await f.store.list(`${base}/recipes`);
  const patches=[{publication:'PUBLISHED',effet_id:'STAT-MALAISE-01'},{publication:'READY'},{publication:'PUBLISHED',effet_id:'UNIVERSAL-ANTIDOTE'},
   {publication:'PUBLISHED',niveau_minimum:'5'},{composants:'ING-01:0'},{composants:'ING-01:-1'},{composants:'ING-01:1.5'},{composants:'ING-01:1;ING-01:2'},
   {composants:'absent:1'},{composants:'ANTIDOTE-ORD:1'},{produit_id:'absent'},{competence_id:'TOXI-01-absente'},
   {connaissance_id:'absente'},{laboratoire_lieu_id:'absent'},{niveau_minimum:'6'},{effet_id:'<script>alert(1)</script>'},{prix_indicatif:'-1'},{cout_pa:'0'}];
  for(const patch of patches){const sheets=edit('TOXI-P01',patch),p=await f.prepare(sheets);assert.equal(p.canApply,false,JSON.stringify(patch));await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets,reason:'Test de rejet',confirmation:p.confirmation??'rejet'}),{code:'INVALID_MASTER'});}
  assert.deepEqual(await f.store.list(`${base}/recipes`),before);
  const malformed=recipeMasterExample();malformed.Objets[0].id='nouvel-ingredient';malformed.Recettes[0].composants='absent:1';assert.equal((await f.prepare(malformed)).canApply,false);assert.equal(await f.store.get(`${base}/items/nouvel-ingredient`),null);
 });
 test(`${prefix} SO-06b : dépendances réservées, archivage explicite et contrôle depuis l’ancien éditeur d’objets`,async()=>{
  const f=await fixture();await f.apply(recipeMasterExample());const base=`scenarios/${f.scenarioId}`,Meta=recipeMasterExample().Meta;
  const archive={Meta,Objets:[{id:'ING-04',operation:'ARCHIVER',version:'2'}]};assert.equal((await f.prepare(archive)).canApply,false);
  const item=await f.store.get(`${base}/items/ING-04`),revision=(await f.read('scenario',{scenarioId:f.scenarioId})).revision;
  await assert.rejects(f.cmd('saveItem',{...item,scenarioId:f.scenarioId,revision,consumable:false}),{code:'RECIPE_INGREDIENT'});
  assert.deepEqual(await f.store.get(`${base}/items/ING-04`),item);
  await f.apply({...archive,Recettes:[{id:'TOXI-P02',operation:'ARCHIVER',version:'2'}]});
  assert.equal((await f.store.get(`${base}/items/ING-04`)).masterArchived,true);
  assert.equal((await f.prepare(edit('TOXI-P02',{nom:'Réactivation invalide'},'3'))).canApply,false);
 });
 test(`${prefix} SO-06b : sous-Master et export global conservent les références sans catalogue parallèle`,async()=>{
  const f=await fixture();await f.apply(masterExample());await f.apply(recipeMasterExample());
  const w=await f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'magasins',bundle:true}),sheets=recipeBundleSheets(w);
  assert.equal(sheets.Recettes.length,5);assert.equal(sheets.Objets.length,14);assert.ok(!sheets.Objets.some(r=>r.id==='ING-03'||r.id==='kit'));
  assert.ok(masterDependencies(sheets,w.referenceIndex).every(r=>r.presence==='PRESENT'&&r.included==='ROW'));
  const roundtrip=readMasterXlsx(writeMasterXlsx(sheets));await f.apply(roundtrip);assert.equal((await f.apply(roundtrip)).unchanged,true);
  const global=await f.read('masterWorkspace',{scenarioId:f.scenarioId,bundle:true}),all=globalMasterSheets(global);assert.equal(global.bundles.length,6);assert.equal(all.Recettes.length,5);
  assert.ok(all.Objets.some(r=>r.id==='ING-03'));assert.equal((await f.prepare(all)).canApply,true);
 });
 test(`${prefix} SO-06b : double clic, réponse perdue et éditions concurrentes sans double création`,async()=>{
  const f=await fixture(),sheets=recipeMasterExample(),p=await f.prepare(sheets),input={scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};
  const results=await Promise.all([f.cmd('applyMasterImport',input),f.cmd('applyMasterImport',input)]);assert.deepEqual(results[0],results[1]);
  assert.deepEqual(await f.cmd('applyMasterImport',input),results[0]);assert.equal((await f.store.list(`scenarios/${f.scenarioId}/masterImports`)).length,1);
  const proposals=await Promise.all(['A','B'].map(async nom=>{const s=edit('TOXI-P01',{nom});return {scenarioId:f.scenarioId,sheets:s,reason:'Import de test',confirmation:(await f.prepare(s)).confirmation,requestId:randomUUID()};}));
  const outcome=await Promise.allSettled(proposals.map(i=>f.cmd('applyMasterImport',i)));assert.equal(outcome.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(f.cmd('applyMasterImport',{...input,reason:'Autre contenu'}),{code:'REQUEST_ID_REUSED'});
 });
 test(`${prefix} SO-06b : interruption avant commit sans état partiel et confirmation périmée refusée`,async()=>{
  const f=await fixture(),sheets=recipeMasterExample(),p=await f.prepare(sheets),input={scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()},run=f.store.runTransaction.bind(f.store);
  f.store.runTransaction=callback=>run(async tx=>{await callback(tx);throw new Error('Coupure simulée avant commit');});
  try{await assert.rejects(f.cmd('applyMasterImport',input),/Coupure simulée/);}finally{f.store.runTransaction=run;}
  for(const c of ['recipes','items','masterImports','masterRows'])assert.equal((await f.store.list(`scenarios/${f.scenarioId}/${c}`)).length,0);
  await f.cmd('applyMasterImport',input);const change=edit('TOXI-P01',{nom:'Version préparée'}),preview=await f.prepare(change);
  await f.apply(edit('TOXI-P02',{nom:'Édition concurrente'}));
  await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets:change,reason:'Import de test',confirmation:preview.confirmation}),{code:'STALE_REVISION'});
 });
 test(`${prefix} SO-06b : brouillons réservés au propriétaire et à la bonne destination`,async()=>{
  const f=await fixture();await f.apply(masterExample());await f.apply(recipeMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id};
  for(const role of ['MJ','RECEPTION']){
   const actor={...f.player,uid:randomUUID(),email:`${randomUUID()}@test.invalid`};
   await f.cmd('setStaff',{sessionId:s.id,revision:(await f.read('session',{sessionId:s.id})).revision,email:actor.email,role,active:true,reason:'Rôle de test'});
   await assert.rejects(view(f,extra,actor),{code:'FORBIDDEN'});
  }
  for(const actor of [f.player,{...f.owner,uid:randomUUID()},null]){
   await assert.rejects(view(f,{},actor));await assert.rejects(view(f,extra,actor));
   await assert.rejects(f.read('prepareMasterImport',{scenarioId:f.scenarioId,sheets:recipeMasterExample(),reason:'Lecture interdite'},actor));
  }
  const w=await view(f),other=(await f.cmd('createScenario',{title:'Autre destination'})).id;
  assert.equal((await f.prepare(moduleMasterSheets(w),{scenarioId:other})).canApply,false);
 });
 test(`${prefix} SO-06b : version figée, session et campagne conservent recettes, comptes et lots`,async()=>{
  const f=await fixture();await f.apply(masterExample());await f.apply(recipeMasterExample());const s=await f.session(),base=`sessions/${s.id}`,extra={scenarioId:undefined,sessionId:s.id};
  const initial=await f.store.list(`${base}/recipes`),inventory=await f.store.list(`${base}/inventory`),accounts=await f.store.list(`${base}/accounts`);
  await f.apply(edit('TOXI-P01',{nom:'Version future'}));assert.deepEqual(await f.store.list(`${base}/recipes`),initial);
  const sheets=moduleMasterSheets(await view(f,extra));await f.apply(sheets,extra);assert.equal((await f.apply(sheets,extra)).unchanged,true);
  assert.deepEqual(await f.store.list(`${base}/inventory`),inventory);assert.deepEqual(await f.store.list(`${base}/accounts`),accounts);
  const expected=await f.store.list(`${base}/recipes`),close={sessionId:s.id,reason:'Fin fictive',cancelOffers:false},p=await f.read('prepareCampaignClosure',close);await f.cmd('closeCampaignSession',{...close,confirmation:p.confirmation});
  const input={campaignId:s.campaignId,title:'Suite fictive',capacity:60,privacy:'Notice test',healthPolicy:'PRESERVE',reason:'Continuité'},n=await f.read('prepareCampaignEpisode',input);let b=await f.cmd('beginCampaignEpisode',{...input,confirmation:n.confirmation});
  while(b.status!=='READY')b=await f.cmd('advanceCampaignEpisode',{campaignId:s.campaignId,buildId:b.buildId??(await f.read('campaign',{campaignId:s.campaignId})).activeBuildId});
  assert.deepEqual(await f.store.list(`sessions/${b.id}/recipes`),expected);assert.deepEqual(await f.store.list(`sessions/${b.id}/inventory`),inventory);
  for(const a of await f.store.list(`sessions/${b.id}/accounts`))assert.equal(a.balance,accounts.find(old=>old.id===a.id).balance);
 });
 test(`${prefix} SO-06b : archives complètes, anciennes archives acceptées et aucune donnée de jeu importée`,async()=>{
  const f=await fixture();await f.apply(masterExample());await f.apply(recipeMasterExample());
  const {manifest}=await f.read('prepareScenarioExport',{scenarioId:f.scenarioId});assert.equal(manifest.records.recipes.length,5);
  const input={manifest,title:'Copie isolée'},p=await f.read('prepareScenarioImport',input),job=await f.cmd('beginScenarioImport',{...input,confirmation:p.confirmation}),copy=await f.read('commitScenarioImport',{importId:job.id});
  assert.deepEqual(await f.store.list(`scenarios/${copy.id}/recipes`),manifest.records.recipes);
  const old=structuredClone(manifest);delete old.records.recipes;assert.deepEqual(cleanScenarioSnapshot(old).records.recipes,[]);
  const tampered=structuredClone(manifest);tampered.records.recipes[0].publicationState='PUBLISHED';assert.throws(()=>cleanScenarioSnapshot(tampered),{code:'RECIPE_PUBLICATION_UNAVAILABLE'});
  tampered.records.recipes[0].publicationState='DRAFT';tampered.records.recipes[0].doses=[{id:'ne-pas-importer'}];assert.equal(cleanScenarioSnapshot(tampered).records.recipes[0].doses,undefined);
  assert.ok(scenarioCollections.includes('recipes'));
 });
 test(`${prefix} SO-06b : lecture après lancement, import fermé et historique conservé`,async()=>{
  const f=await fixture();await f.apply(masterExample());await f.apply(recipeMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id};
  await f.cmd('setStage',{sessionId:s.id,revision:(await f.read('session',{sessionId:s.id})).revision,stage:'BRIEFING'});
  const w=await view(f,extra);assert.equal(w.editable,false);assert.equal(w.rows.length,5);
  await assert.rejects(f.prepare(moduleMasterSheets(w),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
}
