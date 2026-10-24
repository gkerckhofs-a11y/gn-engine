import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {customsMasterExample} from '../../src/shared/master-examples.mjs';
import {masterEditors} from '../../src/shared/master-editors.mjs';
import {moduleDraft,moduleFormRow,moduleMasterSheets} from '../../web/master-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const modules=Object.keys(masterEditors);
export function masterEditorsSuite(fixture,prefix){
 const view=(f,module,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module,...extra});
 const values={personnages:{nom:'Renfort fictif'},communication:{personnage_id:'pilote',titre:'Objectif de test'},magasins:{nom:'Objet fictif',unite:'pièce',type:'STACKABLE',consommable:'NON',legalite:'UNSPECIFIED',publication:'DRAFT',pillable:'NON'},spatioport:{nom:'Route fictive',depart_port:'a',arrivee_port:'b',duree_secondes:'45',carburant_cout:'0',ouvert:'NON'},economie:{nom:'Entrepôt fictif',capacite_volume:'10',loyer:'0',periode_minutes:'20',ouvert:'NON'},informations:{titre:'Information fictive',texte:'Contenu de test',type:'KNOWLEDGE',publication:'DRAFT',partage:'SHOW',qr_actif:'NON',qr_audience:'ALL_PLAYERS'}};
 test(`${prefix} : six projections Master réservées au propriétaire et sans état joué`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());
  for(const module of modules){
   const w=await view(f,module);assert.equal(w.sheet,masterEditors[module].sheet);assert.equal(w.meta[0].module,module);assert.ok(w.rows.length);assert.deepEqual(w.errors,[]);
   await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module},f.player),{code:'FORBIDDEN'});
   const data=JSON.stringify(moduleMasterSheets(w));for(const key of ['assignedUid','access','accounts','balance','inventory','fuel','journey','tenantId','expiresAtGameMs','abilityProfile','startingInventory','startingCredits'])assert.ok(!data.includes(`"${key}"`),key);
  }
  for(const module of ['unknown','__proto__','',null])await assert.rejects(view(f,module),{code:'INVALID_MASTER_MODULE'});
  assert.equal((await f.read('masterImportHistory',{scenarioId:f.scenarioId})).imports.length,1);
 });
 test(`${prefix} : créer et modifier dans chaque module, XLSX puis réimport idempotent`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());
  for(const module of modules){
   let w=await view(f,module);const d=moduleDraft(w),row=moduleFormRow(w,d,{...d.row,...values[module]}),sheets={Meta:w.meta,[w.sheet]:[row]};
   const p=await f.prepare(sheets,{module});assert.deepEqual(p.errors,[]);assert.equal(p.counts.CREATE,1);
   await f.apply(sheets,{module});assert.equal((await f.apply(sheets,{module})).unchanged,true);
   w=await view(f,module);const selected=w.rows.find(e=>e.row.id===row.id),file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w,[selected])));file[w.sheet][0][masterEditors[module].name]+=' modifié';
   await f.apply(file,{module});assert.equal((await f.apply(file,{module})).unchanged,true);
   w=await view(f,module);assert.match(w.rows.find(e=>e.row.id===row.id).title,/modifié$/);
   const archive=moduleFormRow(w,moduleDraft(w,row.id,'archive'),{});await f.apply({Meta:w.meta,[w.sheet]:[archive]},{module});
   w=await view(f,module);const archived=w.rows.find(e=>e.row.id===row.id);assert.equal(archived.row.publication??archived.row.ouvert,module==='communication'?'NON':module==='personnages'||module==='magasins'||module==='informations'?'DRAFT':'NON');
   if(module!=='communication'){assert.equal(archived.archived,true);assert.equal(moduleMasterSheets(w,[archived])[w.sheet][0].operation,'ARCHIVER');}
  }
 });
 test(`${prefix} : duplication sans dotation, publication ni découverte automatique`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());
  for(const module of modules){const w=await view(f,module),original=w.rows[0],d=moduleDraft(w,original.row.id,'duplicate'),row=moduleFormRow(w,d,d.row);
   assert.notEqual(row.id,original.row.id);assert.equal(row.operation,'CREER');assert.equal(row.version,'1');
   assert.equal(row.publication??row.ouvert,module==='communication'?'NON':module==='personnages'||module==='magasins'||module==='informations'?'DRAFT':'NON');
   if(module==='informations'){assert.equal(row.qr_actif,'NON');assert.equal(row.personnages_initiaux,'!EFFACER');}
   await f.apply({Meta:w.meta,[w.sheet]:[row]},{module});
   if(module==='personnages'){const c=await f.store.get(`scenarios/${f.scenarioId}/characters/${row.id}`);assert.equal(c.startingCredits,undefined);assert.equal(c.startingInventory,undefined);assert.equal(c.abilityProfile,undefined);assert.deepEqual(c.objectives,[]);assert.deepEqual(c.relations,[]);}
  }
 });
 test(`${prefix} : exports session préservent acquis, baux, reçus et étapes des objectifs`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`;
  const c=await f.store.get(`${base}/characters/pilote`);c.hp=1;c.globalLevel=2;c.objectives[0].steps=[{id:'etape',title:'Étape préservée',description:'',published:true}];
  await f.store.runTransaction(async tx=>tx.set(`${base}/characters/pilote`,c));
  const snapshot=async()=>({records:await Promise.all(['accounts','inventory','ships','fieldStates','characters/pilote/knowledge'].map(k=>f.store.list(`${base}/${k}`))),character:await f.store.get(`${base}/characters/pilote`),warehouse:await f.store.get(`${base}/warehouses/hangar-demo`)}),before=await snapshot();
  for(const module of modules){const w=await view(f,module,extra),sheets=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));
   if(module==='personnages'){for(const row of sheets.Personnages){assert.ok(!row.niveau_global);assert.ok(!row.pv_max_initiaux);}}
   if(module==='informations')for(const row of sheets.Connaissances)assert.ok(!row.personnages_initiaux);
   sheets[w.sheet][0][masterEditors[module].name]+=' actualisé';await f.apply(sheets,{...extra,module});
  }
  const after=await snapshot();assert.deepEqual(after.records,before.records);
  for(const key of ['hp','maxHp','healthRevision','globalLevel','abilityProfile','startingCredits','startingInventory','assignedUid'])assert.deepEqual(after.character[key],before.character[key]);
  assert.deepEqual(after.character.objectives[0].steps,before.character.objectives[0].steps);
  for(const key of ['tenantId','tenantType','expiresAtGameMs'])assert.deepEqual(after.warehouse[key],before.warehouse[key]);
  const session=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:session.revision,stage:'BRIEFING'});
  const w=await view(f,'personnages',extra);assert.equal(w.editable,false);await assert.rejects(f.prepare(moduleMasterSheets(w),extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
 test(`${prefix} : nouvelles fiches en session sans attribution et références rejetées atomiquement`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id};
  for(const module of modules){const w=await view(f,module,extra),d=moduleDraft(w),row=moduleFormRow(w,d,{...d.row,...values[module]});await f.apply({Meta:w.meta,[w.sheet]:[row]},{...extra,module});
   if(module==='personnages')assert.equal((await f.store.get(`sessions/${s.id}/characters/${row.id}`)).assignedUid,null);
  }
  const w=await view(f,'communication',extra),row={...w.newRow,personnage_id:'absent',titre:'Impossible',publication:'NON'},bad={Meta:w.meta,Objectifs:[row]};
  assert.equal((await f.prepare(bad,extra)).canApply,false);
  await assert.rejects(f.cmd('applyMasterImport',{...extra,sheets:bad,reason:'Test',confirmation:'invalide'}),{code:'INVALID_MASTER'});
 });
 test(`${prefix} : édition périmée et mauvaise destination refusées, confirmation rejouée une fois`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const w=await view(f,'spatioport'),a=moduleMasterSheets(w,[w.rows[0]]),b=structuredClone(a);a.Routes[0].nom='Version A';b.Routes[0].nom='Version B';
  const pb=await f.prepare(b,{module:'spatioport'});await f.apply(a,{module:'spatioport'});
  await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,module:'spatioport',sheets:b,reason:'Import de test',confirmation:pb.confirmation}),{code:'INVALID_MASTER'});
  const other=(await f.cmd('createScenario',{title:'Autre scénario'})).id;assert.equal((await f.prepare(a,{scenarioId:other})).canApply,false);
  const now=await view(f,'spatioport'),sheets=moduleMasterSheets(now,[now.rows[0]]);sheets.Routes[0].nom='Version C';const p=await f.prepare(sheets,{module:'spatioport'}),input={scenarioId:f.scenarioId,module:'spatioport',sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};
  const result=await f.cmd('applyMasterImport',input);assert.deepEqual(await f.cmd('applyMasterImport',input),result);
 });
 test(`${prefix} : objectifs aux identifiants ambigus signalés sans les renommer`,async()=>{
  const f=await fixture();await f.apply(customsMasterExample());const c=await f.store.get(`scenarios/${f.scenarioId}/characters/pilote`);
  await f.store.runTransaction(async tx=>tx.set(`scenarios/${f.scenarioId}/characters/autre`,{...c,id:'autre'}));
  const w=await view(f,'communication');assert.equal(w.errors.length,1);assert.throws(()=>moduleMasterSheets(w),/Identifiant répété/);
 });
}
