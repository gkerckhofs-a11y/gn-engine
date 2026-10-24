import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralFixture,centralTestItem} from './central-master-suite.mjs';
import {centralLimits} from '../../src/core/central-master.mjs';
import {recipeInput} from '../../src/core/recipe-state.mjs';

export const centralTestRecipe={name:'Formule synthétique',description:'Données fictives',kind:'SCENARIO',minLevel:1,productItemId:'dose',components:[{itemId:'ingredient',quantity:2}],skillId:'skill-test',effectId:'effect-test',laboratoryTargetId:'lab-test',unlockKnowledgeId:'knowledge-test',indicativePrice:7,gmNotes:'Note M4 privée'};
async function fixture(makeStore){
 const f=await centralFixture(makeStore);
 const saveRecipe=(extra={},actor=f.owner)=>f.cmd('saveCentralRecipe',{campaignId:f.cid,recipeId:'formula',draftRevision:0,recipeRevision:0,recipe:centralTestRecipe,reason:'Préparer la formule',...extra},actor);
 return {...f,saveRecipe};
}
export function centralRecipesSuite(makeStore,prefix='Recettes centrales C1c'){
 test(`${prefix} : préparer avant M1, diagnostics sans définition implicite ni ressource`,async()=>{
  const f=await fixture(makeStore),before=await f.store.get(`sessions/${f.sid}`);await f.saveRecipe();const d=await f.view('M4');
  assert.deepEqual(d.changes[0].data,recipeInput({...centralTestRecipe,publicationState:'DRAFT'},'formula'));
  assert.equal(d.publicationAvailable,false);assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_MISSING').length,3);
  assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_PENDING').length,3);assert.equal(d.diagnostics[0].source,'WEB');assert.equal(d.diagnostics[0].draftRevision,1);
  assert.deepEqual((await f.view('M1')).changes,[]);assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);
  for(const kind of ['recipes','items','inventory','accounts','ledger','actionPoints','knowledge','characters','fieldTargets'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[],kind);
  assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);
 });
 test(`${prefix} : M4 puis M1 résout les liens sans réécrire la recette`,async()=>{
  const f=await fixture(makeStore);await f.saveRecipe();const old=await f.store.get(`${f.base}/changes/recipe_formula`);
  await f.save({draftRevision:1});await f.save({draftRevision:2,itemId:'dose',item:{...centralTestItem,name:'Dose synthétique'}});
  const d=await f.view('M4');assert.equal(d.draft.revision,3);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_MISSING').map(x=>x.reference),['knowledge-test']);assert.equal(d.references.items.length,2);
  assert.equal(d.references.items.every(x=>x.source==='WEB'),true);assert.doesNotMatch(JSON.stringify(d),/Note M1 privée/);assert.deepEqual(await f.store.get(`${f.base}/changes/recipe_formula`),old);
  assert.equal(d.history.length,1);assert.equal((await f.view('M1')).history.length,2);
 });
 test(`${prefix} : M1 et M2 puis M4 conservent les mêmes révisions et admissions`,async()=>{
  const f=await fixture(makeStore);await f.save();await f.configure(1);const old=await f.store.get(`${f.base}/changes/speciesCatalogue_player`);
  await f.saveRecipe({draftRevision:2});assert.deepEqual(await f.store.get(`${f.base}/changes/speciesCatalogue_player`),old);assert.equal((await f.read('admissionAdmin',f.owner,{sessionId:f.sid})).draftRevision,3);
  const d=await f.view('M4');assert.doesNotMatch(JSON.stringify(d),/species-test|Règles fictives/);assert.deepEqual(d.diagnostics.filter(x=>x.code==='REFERENCE_MISSING').map(x=>x.reference),['dose','knowledge-test']);
 });
 test(`${prefix} : références incompatibles, archivées puis restaurées`,async()=>{
  const f=await fixture(makeStore);await f.save({item:{...centralTestItem,kind:'INDIVIDUAL'}});await f.saveRecipe({draftRevision:1});
  assert.equal((await f.view('M4')).diagnostics.some(x=>x.code==='RECIPE_INGREDIENT'),true);
  await f.cmd('archiveCentralItem',{campaignId:f.cid,itemId:'ingredient',draftRevision:2,itemRevision:1,reason:'Archive synthétique'});
  assert.equal((await f.view('M4')).diagnostics.some(x=>x.code==='REFERENCE_ARCHIVED'),true);
  await f.save({draftRevision:3,itemRevision:2});assert.equal((await f.view('M4')).diagnostics.some(x=>x.reference==='ingredient'),false);
  await f.save({draftRevision:4,itemId:'dose',item:{...centralTestItem,laserRecharge:{pelletsPerUnit:5}}});
  assert.equal((await f.view('M4')).diagnostics.some(x=>x.code==='RECIPE_PRODUCT'),true);
 });
 test(`${prefix} : délégation M4 ne révèle ni M1 ni M2, contrôle selon droits courants`,async()=>{
  const f=await fixture(makeStore);await f.save();await f.configure(1);await f.grant({readWorkshops:['M4'],editWorkshops:['M4']});await f.saveRecipe({draftRevision:2},f.mj);
  const d=await f.view('M4',f.mj);assert.deepEqual(d.references,{itemsReadable:false,items:[],knowledgeReadable:false,knowledge:[]});assert.equal(d.diagnostics.filter(x=>x.code==='REFERENCE_NOT_CHECKED').length,3);
  assert.doesNotMatch(JSON.stringify(d),/Ingrédient synthétique|Note M1 privée|species-test/);
  await assert.rejects(f.view('M1',f.mj),{code:'FORBIDDEN'});await assert.rejects(f.save({draftRevision:3,itemRevision:1},f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1,readWorkshops:['M1','M4'],editWorkshops:['M4']});const readable=await f.view('M4',f.mj);assert.equal(readable.references.items.length,1);assert.equal(readable.diagnostics.some(x=>x.reference==='ingredient'),false);
  await f.grant({revision:2,readWorkshops:['M4'],editWorkshops:['M4']});assert.deepEqual((await f.view('M4',f.mj)).references.items,[]);
 });
 test(`${prefix} : refus MJ session, M1 seul, lecture seule et privilèges forgés`,async()=>{
  const f=await fixture(makeStore);await f.cmd('setStaff',{sessionId:f.sid,revision:1,email:f.mj.email,role:'MJ',active:true,reason:'Session seulement'});
  await assert.rejects(f.saveRecipe({},f.mj),{code:'FORBIDDEN'});await f.grant();await assert.rejects(f.saveRecipe({},f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1,readWorkshops:['M4'],editWorkshops:[]});await assert.rejects(f.saveRecipe({},f.mj),{code:'FORBIDDEN'});assert.equal((await f.view('M4',f.mj)).rights.editWorkshops.length,0);
  await assert.rejects(f.grant({revision:2,readWorkshops:['M1'],editWorkshops:['M4']}),{code:'INVALID_CENTRAL_GRANT'});
  await assert.rejects(f.saveRecipe({},null),{code:'LOGIN_REQUIRED'});await assert.rejects(f.saveRecipe({},f.player),{code:'FORBIDDEN'});
 });
 test(`${prefix} : révocation M4 vérifiée avant reçu et autre campagne refusée`,async()=>{
  const f=await fixture(makeStore);await f.grant({readWorkshops:['M4'],editWorkshops:['M4']});const input={requestId:randomUUID()};await f.saveRecipe(input,f.mj);
  const other=await f.create({creationId:randomUUID()});await assert.rejects(f.saveRecipe({campaignId:other.campaignId},f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:1,readWorkshops:['M4'],editWorkshops:[]});await assert.rejects(f.saveRecipe(input,f.mj),{code:'FORBIDDEN'});
  await f.grant({revision:2,active:false,readWorkshops:['M4'],editWorkshops:[]});await assert.rejects(f.view('M4',f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : M1 et M4 concurrents, rechargement requis puis deux changements conservés`,async()=>{
  const f=await fixture(makeStore),r=await Promise.allSettled([f.save(),f.saveRecipe()]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  if(r[0].status==='rejected')await f.save({draftRevision:1});else await f.saveRecipe({draftRevision:1});
  assert.equal((await f.view('M4')).draft.revision,2);assert.equal((await f.store.list(`${f.base}/changes`)).length,2);
 });
 test(`${prefix} : deux éditeurs M4 ne mélangent pas leurs formules`,async()=>{
  const f=await fixture(makeStore),r=await Promise.allSettled([f.saveRecipe(),f.saveRecipe({recipe:{...centralTestRecipe,name:'Autre formule',gmNotes:'Autre note'}})]);
  assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');const d=await f.view('M4'),v=d.changes[0].data;
  assert.equal(d.history.length,1);assert.equal(v.gmNotes,v.name==='Autre formule'?'Autre note':centralTestRecipe.gmNotes);
 });
 test(`${prefix} : double clic, réponse perdue et collision de requestId`,async()=>{
  const f=await fixture(makeStore),input={requestId:randomUUID()},r=await Promise.all([f.saveRecipe(input),f.saveRecipe(input)]);assert.deepEqual(r[0],r[1]);assert.deepEqual(await f.saveRecipe(input),r[0]);
  assert.equal((await f.view('M4')).history.length,1);await assert.rejects(f.saveRecipe({...input,recipe:{...centralTestRecipe,name:'Autre intention'}}),{code:'REQUEST_ID_REUSED'});
 });
 test(`${prefix} : interruption avant commit, reprise et archive/restauration auditées`,async()=>{
  const base=makeStore();let fail=false;const guarded={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw new Error('INTERRUPTION');return r;})};
  const f=await fixture(()=>guarded),input={requestId:randomUUID()};fail=true;await assert.rejects(f.saveRecipe(input),/INTERRUPTION/);fail=false;assert.equal(await base.get(f.base),null);assert.equal((await base.get(`campaigns/${f.cid}`)).master,undefined);
  await f.saveRecipe(input);const a={campaignId:f.cid,recipeId:'formula',draftRevision:1,recipeRevision:1,reason:'Archive test',requestId:randomUUID()};const r=await f.cmd('archiveCentralRecipe',a);assert.deepEqual(await f.cmd('archiveCentralRecipe',a),r);
  let d=await f.view('M4');assert.equal(d.changes[0].data.masterArchived,true);assert.deepEqual(d.diagnostics,[]);
  await f.saveRecipe({draftRevision:2,recipeRevision:2});d=await f.view('M4');assert.equal(d.changes[0].data.masterArchived,false);assert.equal(d.history.length,3);assert.equal(d.history[0].before.operation,'ARCHIVE');
 });
 test(`${prefix} : valeurs invalides et champs arbitraires refusés sans perte silencieuse`,async()=>{
  const f=await fixture(makeStore);
  for(const patch of [{publicationState:'PUBLISHED'},{masterArchived:true},{stock:9},{effect:{code:'x'}},{mediaImages:{}},{components:[{itemId:'x',quantity:1,stock:3}]}])await assert.rejects(f.saveRecipe({recipe:{...centralTestRecipe,...patch}}),{code:'INVALID_CENTRAL_MASTER'});
  for(const patch of [{minLevel:6},{components:[{itemId:'a',quantity:0}]},{components:[{itemId:'a',quantity:1},{itemId:'a',quantity:2}]},{components:[{itemId:'dose',quantity:1}]},{components:Array.from({length:21},(_,i)=>({itemId:`i${i}`,quantity:1}))}])await assert.rejects(f.saveRecipe({recipe:{...centralTestRecipe,...patch}}),{code:'INVALID_RECIPE'});
  await assert.rejects(f.saveRecipe({recipe:{...centralTestRecipe,effectId:'../script'}}),{code:'INVALID_ID'});await assert.rejects(f.saveRecipe({sessionId:f.sid}),{code:'INVALID_CENTRAL_MASTER'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : formule incomplète préparée avec alertes, cycle publié refusé avant reçu`,async()=>{
  const f=await fixture(makeStore),input={requestId:randomUUID(),recipe:{name:'À compléter',kind:'SCENARIO',minLevel:1,components:[]}};await f.saveRecipe(input);assert.equal((await f.view('M4')).diagnostics.length,5);
  const c=await f.store.get(`campaigns/${f.cid}`);await f.store.runTransaction(async tx=>tx.set(`campaigns/${f.cid}`,{...c,master:{...c.master,activeVersionId:'future'}}));await assert.rejects(f.saveRecipe(input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
 });
 test(`${prefix} : borne M4 incluant archives, édition existante toujours possible`,async()=>{
  const f=await fixture(makeStore);await f.saveRecipe();const c=(await f.view('M4')).changes[0];
  await f.store.runTransaction(async tx=>{for(let i=1;i<centralLimits.recipes;i++)tx.set(`${f.base}/changes/recipe_limit${i}`,{...c,id:`recipe_limit${i}`,entityId:`limit${i}`,operation:'ARCHIVE',data:{...c.data,id:`limit${i}`,masterArchived:true}});});
  await assert.rejects(f.saveRecipe({draftRevision:1,recipeId:'overflow'}),{code:'CENTRAL_LIMIT'});await f.saveRecipe({draftRevision:1,recipeRevision:1});assert.equal((await f.store.list(`${f.base}/changes`)).length,centralLimits.recipes);
 });
}
