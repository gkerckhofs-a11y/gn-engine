import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {terrainMasterExample} from '../../src/shared/master-examples.mjs';
import {masterSheets} from '../../src/shared/master-schema.mjs';
import {moduleDraft,moduleFormRow,moduleMasterSheets} from '../../web/master-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=(f,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet:'Interactions',...extra});
const payload=(w,row)=>({Meta:w.meta,Interactions:[row]});
const edit=(w,id,patch={})=>{const d=moduleDraft(w,id);return moduleFormRow(w,d,{...d.row,...patch});};
export function masterInteractionEditorsSuite(fixture,prefix){
 test(`${prefix} : cinq interactions créées et exportées avec le contrat existant, duplication et archivage contrôlés`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());let w=await view(f);
  await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet:'Interactions'},f.player),{code:'FORBIDDEN'});await assert.rejects(view(f,{module:'informations'}),{code:'INVALID_MASTER_SHEET'});
  for(const type of ['FIELD_CARE','CLINIC_SAFE','CLINIC_FAST','LOOT_COMMON','LOOT_METHODICAL']){
   w=await view(f);const row=edit(w,'',{nom:`Profil fictif ${type}`,type,competence_id:'secours',niveau_minimum:'1',duree_secondes:'13',seuil:'7',complement_secondes:'19',soin_pv:'3',niveau_reanimation:'2',convalescence_secondes:'23',recuperation_patient_secondes:'29'}),file=payload(w,row),p=await f.prepare(file);
   assert.deepEqual(p.errors,[]);assert.equal(await f.store.get(`scenarios/${f.scenarioId}/personProfiles/${row.id}`),null);await f.apply(file);assert.equal((await f.apply(file)).unchanged,true);
   const stored=await f.store.get(`scenarios/${f.scenarioId}/personProfiles/${row.id}`);assert.equal(stored.publicationState,'DRAFT');assert.equal(stored.test,type==='CLINIC_FAST'?'D6':'AUTO');assert.equal(stored.durationSeconds,13);
  }
  w=await view(f);const file=readMasterXlsx(writeMasterXlsx(moduleMasterSheets(w)));assert.deepEqual(Object.keys(file),['Meta','Interactions']);for(const {row} of w.rows)for(const key of Object.keys(row))assert.ok(masterSheets.Interactions.includes(key));await f.apply(file,{module:'personnages'});
  w=await view(f);const d=moduleDraft(w,'soin-terrain','duplicate'),copy=moduleFormRow(w,d,d.row);assert.equal(copy.publication,'DRAFT');assert.notEqual(copy.id,'soin-terrain');await f.apply(payload(w,copy));
  w=await view(f);await f.apply(payload(w,moduleFormRow(w,moduleDraft(w,'soin-terrain','archive'),{})));w=await view(f);assert.equal(w.rows.find(r=>r.row.id==='soin-terrain').archived,true);await f.apply(payload(w,edit(w,'soin-terrain',{publication:'PUBLISHED'})));assert.equal((await view(f)).rows.find(r=>r.row.id==='soin-terrain').archived,false);
 });
 test(`${prefix} : changements soin et fouille retirent les paramètres interdits, valeurs explicites conservées`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());let w=await view(f),row=edit(w,'clinique-rapide',{type:'LOOT_COMMON',recuperation_secondes:'41'});
  assert.equal(row.competence_id,'!EFFACER');assert.equal(row.consommable_id,'!EFFACER');assert.equal(row.consommables_supplementaires,'!EFFACER');assert.ok(!Object.hasOwn(row,'consommable_quantite'));await f.apply(payload(w,row));
  const path=`scenarios/${f.scenarioId}/personProfiles/clinique-rapide`;let p=await f.store.get(path);assert.equal(p.skillId,null);assert.equal(p.consumable,null);assert.deepEqual(p.extraConsumables,[]);assert.equal(p.cooldownSeconds,41);assert.equal(p.test,'AUTO');
  w=await view(f);row=edit(w,'clinique-rapide',{type:'FIELD_CARE',competence_id:'secours',niveau_minimum:'2',soin_pv:'5',niveau_reanimation:'3',convalescence_secondes:'31',recuperation_patient_secondes:'37',consommable_id:'kit',consommable_quantite:'1',prerequis:'!EFFACER'});assert.equal(row.recuperation_secondes,'0');await f.apply(payload(w,row));
  p=await f.store.get(path);assert.equal(p.cooldownSeconds,0);assert.equal(p.patientCooldownSeconds,37);assert.equal(p.healAmount,5);assert.deepEqual(p.prerequisites,[]);
  w=await view(f);await f.apply(payload(w,edit(w,'clinique-rapide',{consommable_id:'',durees_niveaux:'',bonus_objets:'',cout_pa:''})));p=await f.store.get(path);assert.equal(p.consumable,null);assert.deepEqual(p.durationByLevel,{});assert.deepEqual(p.bonusItems,[]);assert.equal(p.cost,null);
 });
 test(`${prefix} : interactions invalides refusées sans écriture, concurrence et réessai idempotent`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());let w=await view(f);const path=`scenarios/${f.scenarioId}/personProfiles/soin-terrain`,before=await f.store.get(path);
  for(const patch of [{competence_id:'medecine'},{consommable_id:'outil',consommable_quantite:'1'},{consommables_supplementaires:'kit:1'},{prerequis:'secours:1;secours:2'},{soin_pv:'-1'}]){
   const sheets=payload(w,edit(w,'soin-terrain',patch));assert.equal((await f.prepare(sheets)).canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets,reason:'Test',confirmation:'incorrecte'}),{code:'INVALID_MASTER'});assert.deepEqual(await f.store.get(path),before);
  }
  const inputs=await Promise.all(['A','B'].map(async nom=>{const sheets=payload(w,edit(w,'soin-terrain',{nom})),p=await f.prepare(sheets);return {scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};}));
  const results=await Promise.allSettled(inputs.map(input=>f.cmd('applyMasterImport',input)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(['INVALID_MASTER','STALE_REVISION'].includes(results.find(r=>r.status==='rejected').reason.code));const i=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('applyMasterImport',inputs[i]),results[i].value);
 });
 test(`${prefix} : édition des interactions de session conserve les acquis et suit l’épisode suivant`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`,character=await f.store.get(`${base}/characters/pilote`),accounts=await f.store.list(`${base}/accounts`),inventory=await f.store.list(`${base}/inventory`);
  const receipt={id:'trace-fictive',status:'COMPLETED',result:{success:true}};await f.store.runTransaction(async tx=>tx.set(`${base}/personActions/trace-fictive`,receipt));
  let w=await view(f,extra);await f.apply(payload(w,edit(w,'soin-terrain',{soin_pv:'4',duree_secondes:'17'})),extra);
  assert.deepEqual(await f.store.get(`${base}/characters/pilote`),character);assert.deepEqual(await f.store.list(`${base}/accounts`),accounts);assert.deepEqual(await f.store.list(`${base}/inventory`),inventory);assert.deepEqual(await f.store.get(`${base}/personActions/trace-fictive`),receipt);
  const current=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:current.revision,stage:'BRIEFING'});w=await view(f,extra);assert.equal(w.editable,false);await assert.rejects(f.prepare(moduleMasterSheets(w),extra),{code:'MASTER_PREPARATION_REQUIRED'});
  const close={sessionId:s.id,reason:'Fin fictive',cancelOffers:false},p=await f.read('prepareCampaignClosure',close);await f.cmd('closeCampaignSession',{...close,confirmation:p.confirmation});
  const input={campaignId:s.campaignId,title:'Suite interactions',capacity:60,privacy:'Notice fictive',healthPolicy:'PRESERVE',reason:'Continuité'},preview=await f.read('prepareCampaignEpisode',input);let next=await f.cmd('beginCampaignEpisode',{...input,confirmation:preview.confirmation});while(next.status!=='READY')next=await f.cmd('advanceCampaignEpisode',{campaignId:s.campaignId,buildId:next.buildId??(await f.read('campaign',{campaignId:s.campaignId})).activeBuildId});
  const inherited=await view(f,{scenarioId:undefined,sessionId:next.id}),row=inherited.rows.find(r=>r.row.id==='soin-terrain').row;assert.equal(row.version,'3');assert.equal(row.soin_pv,'4');assert.equal(row.duree_secondes,'17');
 });
}
