import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralCharactersFixture,centralTestCharacter} from './central-characters-suite.mjs';
import {centralTestRecipe} from './central-recipes-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';

export async function centralCheckFixture(makeStore){
 const f=await centralCharactersFixture(makeStore);
 const check=(draftRevision=0,actor=f.owner,extra={})=>f.read('checkCentralDraft',actor,{campaignId:f.cid,draftRevision,...extra});
 const recipe=(draftRevision=0,patch={})=>f.cmd('saveCentralRecipe',{campaignId:f.cid,recipeId:'formula',recipeRevision:0,draftRevision,recipe:centralTestRecipe,reason:'Formule de contrôle',...patch});
 const inject=async(id,patch)=>{const p=`${f.base}/changes/${id}`,old=await f.store.get(p);await f.store.runTransaction(async tx=>tx.set(p,{...old,...patch}));};
 return {...f,check,recipe,inject};
}
export function centralCheckSuite(makeStore,prefix='Contrôle central C2a'){
 test(`${prefix} : brouillon vide, sept couvertures et aucune autorisation de publication`,async()=>{
  const f=await centralCheckFixture(makeStore),before=await f.store.get(`campaigns/${f.cid}`),r=await f.check();
  assert.equal(r.status,'NO_DETECTED_ERROR');assert.equal(r.publicationAvailable,false);assert.equal(r.scope,'INITIAL_DRAFT_PREPARATION');assert.equal(r.workshops.length,7);assert.equal(r.remainingChecks.length,3);assert.deepEqual(r.diff,[]);assert.match(r.fingerprint,/^[a-f0-9]{64}$/);
  assert.equal(await f.store.get(f.base),null);assert.deepEqual(await f.store.get(`campaigns/${f.cid}`),before);assert.deepEqual(await f.store.list(`${f.base}/checks`),[]);
 });
 test(`${prefix} : propriétaire seul malgré toutes les délégations d’atelier`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant({readWorkshops:['M1','M2','M3','M4','M5','M6','M7'],editWorkshops:['M1','M2','M4']});
  await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.check(0,f.player),{code:'FORBIDDEN'});await assert.rejects(f.check(0,null),{code:'LOGIN_REQUIRED'});
  await assert.rejects(f.check(0,{...f.owner,emailVerified:false}),{code:'LOGIN_REQUIRED'});
  await f.grant({active:false,revision:1});await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : refus avant lecture du contenu pour un délégué`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.grant();const run=f.store.runTransaction.bind(f.store),reads=[];
  f.store.runTransaction=fn=>run(tx=>fn({...tx,list:async(...args)=>{reads.push(args[0]);return tx.list(...args);}}));
  await assert.rejects(f.check(0,f.mj),{code:'FORBIDDEN'});assert.deepEqual(reads,[]);
 });
 test(`${prefix} : diagnostic global M1 M2 M4 et absence de textes privés dans le résumé`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();await f.saveCharacter({draftRevision:1});await f.recipe(2);const r=await f.check(3);
  assert.equal(r.totals.records,3);assert.equal(r.totals.invalid,0);assert.equal(r.diff.length,3);assert.ok(r.diff.every(x=>x.operation==='ADD'&&!x.publicAccessCreated&&!x.resourcesCreated));
  assert.equal(r.edges.find(e=>e.to.id==='ingredient').status,'RESOLVED');assert.equal(r.edges.find(e=>e.to.id==='dose').status,'MISSING');assert.equal(r.edges.find(e=>e.to.id==='target').status,'MISSING');assert.equal(r.edges.find(e=>e.to.id==='effect-test').status,'NOT_CHECKED');
  assert.equal(r.diagnostics.filter(x=>x.code==='REFERENCE_MISSING').length,3);assert.equal(r.diagnostics.filter(x=>x.code==='REFERENCE_PENDING').length,3);assert.equal(r.status,'CORRECTIONS_REQUIRED');
  assert.doesNotMatch(JSON.stringify(r),/Secret de fiction|Biographie fictive|Note M[124] privée|Objectif réservé|Relation privée orientée/);assert.ok(r.diff.find(x=>x.type==='character').privateFields.includes('playerSecrets'));
 });
 test(`${prefix} : résolution après édition sans réécriture de la source`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.saveCharacter();const source=await f.store.get(`${f.base}/changes/character_character`),before=await f.check(1);
  await f.saveCharacter({characterId:'target',draftRevision:1,character:{...centralTestCharacter,relations:[]}});const after=await f.check(2);
  assert.equal(after.edges[0].status,'RESOLVED');assert.deepEqual(after.diagnostics,[]);assert.notEqual(after.fingerprint,before.fingerprint);assert.deepEqual(await f.store.get(`${f.base}/changes/character_character`),source);assert.equal(after.publicationAvailable,false);
 });
 test(`${prefix} : archives exclues, liens entrants signalés puis restaurés`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();await f.recipe(1);await f.cmd('archiveCentralItem',{campaignId:f.cid,itemId:'ingredient',draftRevision:2,itemRevision:1,reason:'Essai archive'});
  let r=await f.check(3);assert.equal(r.diff.find(x=>x.id==='ingredient').operation,'EXCLUDED');assert.equal(r.edges.find(e=>e.to.id==='ingredient').status,'ARCHIVED');assert.ok(r.diagnostics.some(d=>d.reference==='ingredient'&&d.code==='REFERENCE_ARCHIVED'));
  await f.save({draftRevision:3,itemRevision:2});r=await f.check(4);assert.equal(r.edges.find(e=>e.to.id==='ingredient').status,'RESOLVED');
 });
 test(`${prefix} : nature et type d’ingrédient réellement validés`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save({item:{...centralTestItem,consumable:false}});await f.recipe(1);await f.saveCharacter({draftRevision:2,character:{...centralTestCharacter,nature:null,relations:[]}});const r=await f.check(3);
  assert.ok(r.diagnostics.some(d=>d.code==='RECIPE_INGREDIENT'));assert.ok(r.diagnostics.some(d=>d.code==='NATURE_REQUIRED'));assert.equal(r.totals.invalid,0);
 });
 test(`${prefix} : provenance XLSX localisée dans le rapport global`,async()=>{
  const f=await centralCheckFixture(makeStore);const {sheets}=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M4',ids:[]});
  sheets.Recettes=[{id:'formula',operation:'CREER',revision:0,nom:'Formule fichier',type:'SCENARIO',niveau_minimum:1,produit_id:'absent',composants:'ingredient:2'}];
  const input={campaignId:f.cid,workshop:'M4',sheets,fileName:'préparation.xlsx'},p=await f.read('prepareCentralImport',f.owner,input);assert.deepEqual(p.errors,[]);
  await f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Fichier synthétique'});const r=await f.check(1),d=r.diagnostics.find(x=>x.reference==='absent');
  assert.equal(d.fileName,'préparation.xlsx');assert.equal(d.sheet,'Recettes');assert.equal(d.row,2);assert.equal(d.column,'produit_id');assert.equal(d.batchId,sheets.Meta[0].import_batch_id);assert.equal(r.diff[0].location.source,'XLSX');
 });
 test(`${prefix} : catalogue partagé, aucune lecture des candidatures ou politiques`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.configure();const run=f.store.runTransaction.bind(f.store),reads=[];
  f.store.runTransaction=fn=>run(tx=>fn({...tx,get:async(p)=>{reads.push(p);return tx.get(p);},list:async(...args)=>{reads.push(args[0]);return tx.list(...args);}}));
  const r=await f.check(1);assert.equal(r.diff[0].type,'speciesCatalogue');assert.equal(r.totals.invalid,0);assert.doesNotMatch(JSON.stringify(r),/Règles fictives|quotas|friends|firstName|email/);
  assert.ok(reads.every(p=>[`${f.base}/changes`,f.base,`campaigns/${f.cid}`,`sessions/${f.sid}`].includes(p)),JSON.stringify(reads));
 });
 test(`${prefix} : campagne voisine et instance de session ne résolvent aucun lien`,async()=>{
  const f=await centralCheckFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.saveCharacter();
  await f.cmd('saveCentralCharacter',{campaignId:other.campaignId,characterId:'target',draftRevision:0,characterRevision:0,character:{...centralTestCharacter,relations:[]},reason:'Autre campagne'});
  await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/characters/target`,{id:'target',public:{displayName:'Instance à ignorer'}}));
  const r=await f.check(1);assert.equal(r.edges[0].status,'MISSING');assert.doesNotMatch(JSON.stringify(r),/Instance à ignorer/);
 });
 test(`${prefix} : révision attendue et champs étrangers refusés`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();await assert.rejects(f.check(0),{code:'STALE_REVISION'});
  await assert.rejects(f.check(1,f.owner,{publish:true}),{code:'INVALID_CENTRAL_MASTER'});await assert.rejects(f.check(1,f.owner,{requestId:'fake'}),{code:'INVALID_CENTRAL_MASTER'});
 });
 test(`${prefix} : double lecture stable, secret modifié et retour à l’ancien texte changent l’empreinte`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.saveCharacter();const a=await f.check(1);assert.deepEqual(await f.check(1),a);
  await f.saveCharacter({draftRevision:1,characterRevision:1,character:{...centralTestCharacter,playerSecrets:'Nouveau secret'}});const b=await f.check(2);assert.notEqual(a.fingerprint,b.fingerprint);
  await f.saveCharacter({draftRevision:2,characterRevision:2});assert.notEqual(a.fingerprint,(await f.check(3)).fingerprint);
 });
 test(`${prefix} : contrôle concurrent et édition ne produisent aucun mélange`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();const first=await f.check(1);
  const [read,write]=await Promise.allSettled([f.check(1),f.save({draftRevision:1,itemRevision:1,item:{...centralTestItem,name:'Nouvelle édition'}})]);assert.equal(write.status,'fulfilled');
  if(read.status==='fulfilled'){assert.equal(read.value.fingerprint,first.fingerprint);assert.equal(read.value.diff[0].name,centralTestItem.name);}else assert.equal(read.reason.code,'STALE_REVISION');
  const final=await f.check(2);assert.equal(final.diff[0].name,'Nouvelle édition');assert.notEqual(final.fingerprint,first.fingerprint);
 });
 test(`${prefix} : formes natives corrompues refusées sans arrêter les autres diagnostics`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();await f.saveCharacter({draftRevision:1});await f.recipe(2);
  const item=await f.store.get(`${f.base}/changes/item_ingredient`);await f.inject('item_ingredient',{data:{...item.data,startingCredits:200}});
  const r=await f.check(3);assert.equal(r.totals.invalid,1);assert.equal(r.edges.find(e=>e.to.id==='ingredient').status,'INVALID');assert.ok(r.diagnostics.some(d=>d.code==='REFERENCE_INVALID'));assert.ok(r.diagnostics.some(d=>d.reference==='target'));assert.doesNotMatch(JSON.stringify(r),/startingCredits/);
 });
 test(`${prefix} : publication ou autorité injectée dans la fiction détectée`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.saveCharacter();const c=await f.store.get(`${f.base}/changes/character_character`);
  for(const data of [{...c.data,publicationState:'PUBLISHED'},{...c.data,public:{...c.data.public,publicationState:'PUBLISHED'}},{...c.data,objectives:c.data.objectives.map(x=>({...x,published:true}))},{...c.data,assignedUid:'intruder'},{...c.data,contentRevision:0}]){
   await f.inject(c.id,{data});const r=await f.check(1);assert.equal(r.totals.invalid,1);assert.equal(r.diff.length,0);assert.equal(r.diagnostics[0].code,'INVALID_RECORD');
  }
 });
 test(`${prefix} : propriétaire d’atelier, provenance et types inconnus vérifiés`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();const c=await f.store.get(`${f.base}/changes/item_ingredient`);
  for(const patch of [{workshop:'M2'},{type:'unknown'},{revision:2},{source:'XLSX'},{data:{...c.data,revision:0}}]){
   await f.inject(c.id,{...c,...patch});const r=await f.check(1);assert.equal(r.totals.invalid,1);assert.equal(r.diagnostics[0].code,'INVALID_RECORD');
  }
 });
 test(`${prefix} : limite de lecture explicite, aucun rapport tronqué`,async()=>{
  const f=await centralCheckFixture(makeStore),run=f.store.runTransaction.bind(f.store);
  f.store.runTransaction=fn=>run(tx=>fn({...tx,list:async(path,filter,options)=>{if(path===`${f.base}/changes`){assert.equal(options.limit,1260);return Array.from({length:1260},()=>({}));}return tx.list(path,filter,options);}}));
  await assert.rejects(f.check(),{code:'CENTRAL_CHECK_LIMIT'});
 });
 test(`${prefix} : garde de cycle et autorité revérifiées après un rapport`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();await f.check(1);const c=await f.store.get(`campaigns/${f.cid}`);
  await f.store.runTransaction(async tx=>tx.set(`campaigns/${f.cid}`,{...c,master:{...c.master,activeVersionId:'published'}}));await assert.rejects(f.check(1),{code:'CENTRAL_DRAFT_UNAVAILABLE'});
  await f.store.runTransaction(async tx=>tx.set(`campaigns/${f.cid}`,{...c,ownerUid:'other-owner'}));await assert.rejects(f.check(1),{code:'FORBIDDEN'});
 });
 test(`${prefix} : rapport sans écriture économique, de version ou de reçu`,async()=>{
  const f=await centralCheckFixture(makeStore);await f.save();await f.saveCharacter({draftRevision:1});const before={campaign:await f.store.get(`campaigns/${f.cid}`),session:await f.store.get(`sessions/${f.sid}`),draft:await f.store.get(f.base),history:await f.store.list(`${f.base}/history`)};
  const run=f.store.runTransaction.bind(f.store);f.store.runTransaction=fn=>run(tx=>fn({...tx,set:()=>{assert.fail('Un contrôle ne doit rien écrire');}}));await f.check(2);
  assert.deepEqual(await f.store.get(`campaigns/${f.cid}`),before.campaign);assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before.session);assert.deepEqual(await f.store.get(f.base),before.draft);assert.deepEqual(await f.store.list(`${f.base}/history`),before.history);
  for(const kind of ['characters','inventory','accounts','ledger','actionPoints','knowledge','ships'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[]);assert.deepEqual(await f.store.list('scenarios',['ownerUid',f.owner.uid]),[]);
 });
}
