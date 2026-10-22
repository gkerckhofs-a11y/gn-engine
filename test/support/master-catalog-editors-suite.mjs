import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {masterExample} from '../../src/shared/master-examples.mjs';
import {masterSheets} from '../../src/shared/master-schema.mjs';
import {moduleDraft,moduleFormRow,moduleMasterSheets} from '../../web/master-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
import {groupAccountId} from '../../src/core/economy-state.mjs';

const sheets=['Competences','Classes','Groupes'];
const collection={Competences:'skills',Classes:'classes',Groupes:'groups'};
const view=(f,sheet,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet,...extra});
const payload=(w,row)=>({Meta:w.meta,[w.sheet]:[row]});
export function masterCatalogEditorsSuite(fixture,prefix){
 test(`${prefix} : catalogues sélectionnés par feuille, accès propriétaire et contrat historique conservés`,async()=>{
  const f=await fixture();await f.apply(masterExample());
  for(const sheet of sheets){
   const w=await view(f,sheet);assert.equal(w.sheet,sheet);assert.equal(w.module,'personnages');assert.ok(w.rows.length);
   for(const {row} of w.rows)assert.ok(Object.keys(row).every(k=>masterSheets[sheet].includes(k)));
   await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet},f.player),{code:'FORBIDDEN'});
  }
  for(const sheet of ['Routes','Membres','__proto__','',null,{}])await assert.rejects(view(f,sheet),{code:'INVALID_MASTER_SHEET'});
  await assert.rejects(view(f,'Classes',{module:'spatioport'}),{code:'INVALID_MASTER_SHEET'});
  await assert.rejects(view(f,'Classes',{module:undefined}),{code:'INVALID_MASTER_SHEET'});
  assert.equal((await view(f,undefined)).sheet,'Personnages');
  assert.ok((await f.read('masterWorkspace',{scenarioId:f.scenarioId})).tariffs);
 });
 test(`${prefix} : catalogues créés, exportés, modifiés, dupliqués et archivés par le même import`,async()=>{
  const f=await fixture();await f.apply(masterExample());
  for(const sheet of sheets){
   let w=await view(f,sheet);const draft=moduleDraft(w),values={...draft.row,nom:'Définition de test',...(sheet==='Classes'?{competences:'savoir:3'}:{})},row=moduleFormRow(w,draft,values);
   const p=await f.prepare(payload(w,row),{module:'personnages'});assert.equal(p.canApply,true);assert.equal(p.counts.CREATE,1);
   assert.equal(await f.store.get(`scenarios/${f.scenarioId}/${collection[sheet]}/${row.id}`),null);
   await f.apply(payload(w,row),{module:'personnages'});assert.equal((await f.apply(payload(w,row),{module:'personnages'})).unchanged,true);
   w=await view(f,sheet);const selected=w.rows.find(e=>e.row.id===row.id),file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w,[selected])));
   file[sheet][0].nom='Définition corrigée';await f.apply(file,{module:'personnages'});
   w=await view(f,sheet);const copy=moduleDraft(w,row.id,'duplicate'),copyRow=moduleFormRow(w,copy,copy.row);
   assert.notEqual(copyRow.id,row.id);assert.equal(copyRow.publication,'DRAFT');await f.apply(payload(w,copyRow),{module:'personnages'});
   w=await view(f,sheet);await f.apply(payload(w,moduleFormRow(w,moduleDraft(w,row.id,'archive'),{})),{module:'personnages'});
   w=await view(f,sheet);const archived=w.rows.find(e=>e.row.id===row.id);assert.equal(archived.archived,true);
   assert.equal(moduleMasterSheets(w,[archived])[sheet][0].operation,'ARCHIVER');
   const restore=moduleDraft(w,row.id),restoreRow=moduleFormRow(w,restore,restore.row);await f.apply(payload(w,restoreRow),{module:'personnages'});
   assert.equal((await view(f,sheet)).rows.find(e=>e.row.id===row.id).archived,false);
  }
 });
 test(`${prefix} : soins configurables et export fidèle, conversion passive sans paramètres actifs`,async()=>{
  const f=await fixture();await f.apply(masterExample());
  const before=await f.store.get(`scenarios/${f.scenarioId}/characters/pilote`);
  let w=await view(f,'Competences'),d=moduleDraft(w,'medecine');
  let row=moduleFormRow(w,d,{...d.row,soin_pv:'4',usages:'7',recuperation_secondes:'30',portee_recuperation:'PATIENT',consommable_quantite:'2'});
  await f.apply(payload(w,row));
  let skill=await f.store.get(`scenarios/${f.scenarioId}/skills/medecine`);
  assert.equal(skill.healing.amount,4);assert.equal(skill.healing.uses,7);assert.equal(skill.healing.cooldownSeconds,30);assert.equal(skill.healing.cooldownScope,'PATIENT');assert.equal(skill.healing.consumable.quantity,2);
  w=await view(f,'Competences');const file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));
  assert.equal(file.Competences.find(r=>r.id==='medecine').usages,'7');
  assert.ok(!file.Competences.find(r=>r.id==='savoir').soin_pv);
  await f.apply(file);assert.equal((await f.apply(file)).unchanged,true);
  w=await view(f,'Competences');d=moduleDraft(w,'medecine');
  row=moduleFormRow(w,d,{...d.row,type:'ACTIVE_SELF',usages:'',consommable_id:''});
  assert.ok(!Object.hasOwn(row,'consommable_quantite'));await f.apply(payload(w,row));
  skill=await f.store.get(`scenarios/${f.scenarioId}/skills/medecine`);assert.equal(skill.healing.uses,null);assert.equal(skill.healing.consumable,null);
  w=await view(f,'Competences');d=moduleDraft(w,'medecine');row=moduleFormRow(w,d,{...d.row,type:'PASSIVE'});
  for(const key of ['soin_pv','usages','recuperation_secondes','portee_recuperation','consommable_id','consommable_quantite'])assert.ok(!Object.hasOwn(row,key));
  await f.apply(payload(w,row));assert.equal((await f.store.get(`scenarios/${f.scenarioId}/skills/medecine`)).healing,null);
  assert.deepEqual((await f.store.get(`scenarios/${f.scenarioId}/characters/pilote`)).abilityProfile,before.abilityProfile);
 });
 test(`${prefix} : catalogue de session conserve profils, usages, membres, droits et caisse`,async()=>{
  const f=await fixture(),example=masterExample();example.Groupes[0].visibilite='PUBLIC';await f.apply(example);
  const config={scenarioId:f.scenarioId,revision:(await f.read('scenario',{scenarioId:f.scenarioId})).revision,groupId:'equipage',label:'Caisse de test',amount:37};
  const p=await f.read('prepareGroupWallet',config);await f.cmd('setGroupWallet',{...config,confirmation:p.confirmation});
  const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  const use={id:'medecine',used:2,readyAtGameMs:999999};await f.store.runTransaction(async tx=>tx.set(`${base}/characters/pilote/skillUses/medecine`,use));
  const before={character:await f.store.get(`${base}/characters/pilote`),group:await f.store.get(`${base}/groups/equipage`),accounts:await f.store.list(`${base}/accounts`),inventory:await f.store.list(`${base}/inventory`)};
  for(const sheet of sheets){const w=await view(f,sheet,extra),file=moduleMasterSheets(w);for(const row of file[sheet])row.nom+=' — corrigé';await f.apply(file,{...extra,module:'personnages'});}
  assert.deepEqual(await f.store.get(`${base}/characters/pilote`),before.character);
  assert.deepEqual(await f.store.get(`${base}/characters/pilote/skillUses/medecine`),use);
  const after=await f.store.get(`${base}/groups/equipage`);assert.deepEqual(after.members,before.group.members);assert.deepEqual(after.walletConfig,before.group.walletConfig);
  assert.deepEqual(await f.store.list(`${base}/accounts`),before.accounts);assert.deepEqual(await f.store.list(`${base}/inventory`),before.inventory);
  const w=await view(f,'Groupes',extra),d=moduleDraft(w,'equipage','duplicate'),row=moduleFormRow(w,d,d.row);await f.apply(payload(w,row),extra);
  const copy=await f.store.get(`${base}/groups/${row.id}`);assert.deepEqual(copy.members,[]);assert.equal(copy.visibility,'SECRET');assert.equal(copy.walletConfig,undefined);assert.equal(await f.store.get(`${base}/accounts/${groupAccountId(row.id)}`),null);
  const current=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:current.revision,stage:'BRIEFING'});
  for(const sheet of sheets)assert.equal((await view(f,sheet,extra)).editable,false);
  await assert.rejects(f.prepare(moduleMasterSheets(await view(f,'Classes',extra)),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
 test(`${prefix} : dépendances des catalogues refusées sans écriture partielle`,async()=>{
  const f=await fixture();await f.apply(masterExample());
  const cases=[['Classes','medic',{competences:'absente:1'}],['Classes','medic',{competences:'savoir:2;savoir:3'}],['Competences','medecine',{consommable_id:'absent',consommable_quantite:'1'}]];
  for(const [sheet,id,patch] of cases){const w=await view(f,sheet),d=moduleDraft(w,id),row=moduleFormRow(w,d,{...d.row,...patch}),before=await f.store.get(`scenarios/${f.scenarioId}/${collection[sheet]}/${id}`),file=payload(w,row),p=await f.prepare(file);
   assert.equal(p.canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets:file,reason:'Test',confirmation:'invalide'}),{code:'INVALID_MASTER'});
   assert.deepEqual(await f.store.get(`scenarios/${f.scenarioId}/${collection[sheet]}/${id}`),before);
  }
  for(const [sheet,id] of [['Competences','savoir'],['Classes','medic'],['Groupes','equipage']]){const w=await view(f,sheet);assert.equal((await f.prepare(payload(w,moduleFormRow(w,moduleDraft(w,id,'archive'),{})))).canApply,false);}
  const w=await view(f,'Competences'),d=moduleDraft(w,'savoir');assert.equal((await f.prepare(payload(w,moduleFormRow(w,d,{...d.row,publication:'DRAFT'})))).canApply,false);
 });
 test(`${prefix} : éditions concurrentes des classes et réessai sur une seule confirmation`,async()=>{
  const f=await fixture();await f.apply(masterExample());const w=await view(f,'Classes'),d=moduleDraft(w,'medic');
  const inputs=await Promise.all(['A','B'].map(async suffix=>{const file=payload(w,moduleFormRow(w,d,{...d.row,nom:`Classe ${suffix}`})),p=await f.prepare(file);return {scenarioId:f.scenarioId,module:'personnages',sheets:file,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};}));
  const outcomes=await Promise.allSettled(inputs.map(input=>f.cmd('applyMasterImport',input)));assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
  const rejected=outcomes.find(r=>r.status==='rejected');assert.ok(['INVALID_MASTER','STALE_REVISION'].includes(rejected.reason.code));
  const index=outcomes.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('applyMasterImport',inputs[index]),outcomes[index].value);
  const other=(await f.cmd('createScenario',{title:'Autre destination'})).id;assert.equal((await f.prepare(inputs[index].sheets,{scenarioId:other})).canApply,false);
 });
}
