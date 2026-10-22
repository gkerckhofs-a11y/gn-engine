import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {terrainMasterExample} from '../../src/shared/master-examples.mjs';
import {masterSheets} from '../../src/shared/master-schema.mjs';
import {moduleDraft,moduleFormSheets,moduleMasterSheets,moduleRefreshDraft,filteredMasterRows} from '../../web/master-editor.mjs';
import {terrainRewardAction} from '../../web/master-terrain-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=(f,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'informations',sheet:'Lieux',...extra});
export function terrainValues(d){return {...d.row,...Object.fromEntries(Object.entries(d.actions).flatMap(([kind,r])=>Object.entries(r).map(([k,v])=>[`action_${kind}__${k}`,v]))),...Object.fromEntries(d.rewards.flatMap(({row})=>Object.entries(row).map(([k,v])=>[`reward_${row.id}__${k}`,v])))};}
function newSearch(w){const d=moduleDraft(w),r=d.rewards[0].row.id;return {d,values:{...terrainValues(d),titre:'Fouille fictive',action_SEARCH__duree_secondes:'0',[`reward_${r}__objet_id`]:'kit',[`reward_${r}__quantite`]:'1',[`reward_${r}__stock_initial`]:'2',[`reward_${r}__limite_personnage`]:'1'}};}
export function masterTerrainEditorsSuite(fixture,prefix){
 test(`${prefix} : terrain groupé exporte trois feuilles et leurs identités, sans état de jeu ni accès joueur`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const w=await view(f);assert.deepEqual(w.errors,[]);assert.equal(w.rows.length,2);
  const exported=moduleMasterSheets(w);assert.deepEqual(Object.keys(exported),['Meta','Lieux','ActionsTerrain','Recompenses']);
  for(const [sheet,rows] of Object.entries(exported))for(const r of rows)for(const key of Object.keys(r))assert.ok(masterSheets[sheet].includes(key));
  assert.deepEqual(exported.ActionsTerrain.map(a=>a.id).sort(),['fouille-cache','reparation-generateur','sabotage-generateur']);assert.ok(exported.ActionsTerrain.every(a=>a.version==='2'));
  const file=readMasterXlsx(writeMasterXlsx(exported));await f.apply(file,{module:'informations'});assert.equal((await f.apply(file,{module:'informations'})).unchanged,true);
  const filtered=moduleMasterSheets(w,filteredMasterRows(w,'Cache'));assert.equal(filtered.Lieux.length,1);assert.equal(filtered.ActionsTerrain.length,1);assert.equal(filtered.Recompenses.length,3);assert.ok(filtered.ActionsTerrain.every(a=>a.lieu_id==='cache'));
  await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'informations',sheet:'Lieux'},f.player),{code:'FORBIDDEN'});
  await assert.rejects(view(f,{module:'personnages'}),{code:'INVALID_MASTER_SHEET'});
 });
 test(`${prefix} : création groupée de fouille et installation, aperçu sans écriture puis réessai unique`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());let w=await view(f),{d,values}=newSearch(w),sheets=moduleFormSheets(w,d,values);
  assert.equal(sheets.ActionsTerrain.length,1);assert.equal(sheets.Recompenses.length,1);const p=await f.prepare(sheets);assert.deepEqual(p.errors,[]);assert.equal(await f.store.get(`scenarios/${f.scenarioId}/fieldTargets/${d.row.id}`),null);
  await f.apply(sheets,{module:'informations'});assert.equal((await f.apply(sheets,{module:'informations'})).unchanged,true);
  let t=await f.store.get(`scenarios/${f.scenarioId}/fieldTargets/${d.row.id}`);assert.equal(t.publicationState,'DRAFT');assert.equal(t.profiles.SEARCH.durationSeconds,0);assert.equal(t.rewards[0].stock,2);
  w=await view(f);d=moduleDraft(w);values={...terrainValues(d),titre:'Installation fictive',type:'INSTALLATION',panne_secondes:'0',verrou_echec_secondes:'0',protection_reparation_secondes:'0',action_SABOTAGE__duree_secondes:'12',action_REPAIR__duree_secondes:'24'};sheets=moduleFormSheets(w,d,values);
  assert.deepEqual(sheets.ActionsTerrain.map(a=>a.type),['SABOTAGE','REPAIR']);assert.equal(sheets.Recompenses.length,0);await f.apply(sheets);t=await f.store.get(`scenarios/${f.scenarioId}/fieldTargets/${d.row.id}`);assert.equal(t.profiles.REPAIR.durationSeconds,24);assert.equal(t.offlineSeconds,0);
 });
 test(`${prefix} : correction, retrait de récompense, copie en brouillon et archivage conservent les dépendances`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());let w=await view(f),d=moduleDraft(w,'cache');d=terrainRewardAction(w,d,'terrainRemoveReward','cache-kit',terrainValues(d));let sheets=moduleFormSheets(w,d,{...terrainValues(d),action_SEARCH__consommable_id:'kit',action_SEARCH__consommable_quantite:'1'});assert.equal(sheets.Recompenses.find(r=>r.id==='cache-kit').operation,'ARCHIVER');await f.apply(sheets);
  w=await view(f);d=moduleDraft(w,'cache');sheets=moduleFormSheets(w,d,{...terrainValues(d),action_SEARCH__consommable_id:'',action_SEARCH__bonus_objets:'',action_SEARCH__durees_niveaux:'',action_SEARCH__cout_pa:''});await f.apply(sheets);
  const target=await f.store.get(`scenarios/${f.scenarioId}/fieldTargets/cache`);assert.equal(target.profiles.SEARCH.consumable,null);assert.deepEqual(target.profiles.SEARCH.bonusItems,[]);assert.equal(target.profiles.SEARCH.cost,null);
  w=await view(f);d=moduleDraft(w,'cache','duplicate');sheets=moduleFormSheets(w,d,terrainValues(d));assert.equal(sheets.Lieux[0].publication,'DRAFT');assert.ok(sheets.Recompenses.every(r=>!target.rewards.some(old=>old.id===r.id)));assert.notEqual(sheets.ActionsTerrain[0].id,'fouille-cache');await f.apply(sheets);
  w=await view(f);const archive=moduleFormSheets(w,moduleDraft(w,'generateur','archive'),{});assert.equal((await f.prepare(archive)).canApply,false);
  await f.apply(moduleFormSheets(w,moduleDraft(w,'cache','archive'),{}));w=await view(f);await f.apply(moduleFormSheets(w,moduleDraft(w,'generateur','archive'),{}));
  const after=await f.store.get(`scenarios/${f.scenarioId}/fieldTargets/cache`);assert.deepEqual(after.rewards,target.rewards);assert.deepEqual(after.profiles,target.profiles);assert.equal(after.publicationState,'DRAFT');
 });
 test(`${prefix} : actions natives stables et identités ambiguës bloquées sans renommage`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const base=`scenarios/${f.scenarioId}`;
  await f.store.runTransaction(async tx=>{const t=await tx.get(`${base}/fieldTargets/cache`);tx.set(`${base}/fieldTargets/native`,{...t,id:'native',publicationState:'DRAFT',rewards:t.rewards.map(r=>({...r,id:`native-${r.id}`}))});});
  let w=await view(f),native=w.rows.find(r=>r.row.id==='native');assert.match(native.actions[0].id,/^action-[a-f0-9]{64}$/);assert.equal((await view(f)).rows.find(r=>r.row.id==='native').actions[0].id,native.actions[0].id);
  await f.apply(moduleFormSheets(w,moduleDraft(w,'native'),terrainValues(moduleDraft(w,'native'))));
  await f.apply({Meta:terrainMasterExample().Meta,ActionsTerrain:[{id:'ancien-alias',version:'1',operation:'MODIFIER',lieu_id:'native',type:'SEARCH',duree_secondes:'1'}]});w=await view(f);assert.ok(w.errors.some(e=>e.includes('Plusieurs identifiants')));assert.throws(()=>moduleMasterSheets(w),/Plusieurs identifiants/);assert.throws(()=>moduleFormSheets(w,moduleDraft(w,'cache'),{}),/ne peut pas être modifié/);
  await f.store.runTransaction(async tx=>{const t=await tx.get(`${base}/fieldTargets/native`);tx.set(`${base}/fieldTargets/native`,{...t,rewards:[{...t.rewards[0],id:'cache-kit'}]});});assert.ok((await view(f)).errors.some(e=>e.includes('Identifiant répété dans Recompenses')));
 });
 test(`${prefix} : session conserve réserves, compte et acquis ; nouveau lieu initialise une seule fois son état`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`,path=`${base}/fieldStates/cache`;
  const initial=await f.store.get(path),state={...initial,stock:{...initial.stock,'cache-kit':0},claims:{'cache-kit':{pilote:1}},protectedUntilGameMs:123};await f.store.runTransaction(async tx=>tx.set(path,state));
  const accounts=await f.store.list(`${base}/accounts`),inventory=await f.store.list(`${base}/inventory`),character=await f.store.get(`${base}/characters/pilote`);
  let w=await view(f,extra),d=moduleDraft(w,'cache'),sheets=moduleFormSheets(w,d,{...terrainValues(d),titre:'Cache corrigée',type:'INSTALLATION',action_SEARCH__duree_secondes:'42','reward_cache-kit__stock_initial':'999'});
  assert.equal(sheets.Lieux[0].type,'SEARCH');assert.deepEqual(sheets.Recompenses,[]);await f.apply(sheets,extra);assert.deepEqual(await f.store.get(path),state);
  assert.deepEqual(await f.store.list(`${base}/accounts`),accounts);assert.deepEqual(await f.store.list(`${base}/inventory`),inventory);assert.deepEqual(await f.store.get(`${base}/characters/pilote`),character);
  w=await view(f,extra);const created=newSearch(w);sheets=moduleFormSheets(w,created.d,created.values);await f.apply(sheets,extra);const newState=await f.store.get(`${base}/fieldStates/${created.d.row.id}`);assert.deepEqual(Object.values(newState.stock),[2]);assert.equal((await f.apply(sheets,extra)).unchanged,true);assert.deepEqual(await f.store.get(`${base}/fieldStates/${created.d.row.id}`),newState);
  w=await view(f,extra);const exported=moduleMasterSheets(w);assert.ok(!JSON.stringify(exported).includes('protectedUntilGameMs'));await f.apply(exported,extra);assert.deepEqual(await f.store.get(path),state);
  const current=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:current.revision,stage:'BRIEFING'});assert.equal((await view(f,extra)).editable,false);await assert.rejects(f.prepare(exported,extra),{code:'MASTER_PREPARATION_REQUIRED'});
 });
 test(`${prefix} : références, déplacements et état réservé refusés atomiquement ; concurrence et réessai`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const w=await view(f),d=moduleDraft(w,'cache'),before=await f.store.get(`scenarios/${f.scenarioId}/fieldTargets/cache`);
  for(const patch of [{action_SEARCH__competence_id:'absente',action_SEARCH__niveau_minimum:'1'},{action_SEARCH__duree_secondes:'-1'},{action_SEARCH__bonus_objets:'outil:3'},{'reward_cache-kit__objet_id':'absent'}]){
   const sheets=moduleFormSheets(w,d,{...terrainValues(d),...patch});assert.equal((await f.prepare(sheets)).canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets,reason:'Test',confirmation:'incorrecte'}),{code:'INVALID_MASTER'});assert.deepEqual(await f.store.get(`scenarios/${f.scenarioId}/fieldTargets/cache`),before);
  }
  const moved=moduleMasterSheets(w);moved.ActionsTerrain.find(r=>r.id==='fouille-cache').lieu_id='generateur';assert.equal((await f.prepare(moved)).canApply,false);
  const fresh=await view(f),draft=moduleDraft(fresh,'cache'),inputs=await Promise.all(['A','B'].map(async titre=>{const sheets=moduleFormSheets(fresh,draft,{...terrainValues(draft),titre}),p=await f.prepare(sheets);assert.deepEqual(p.errors,[]);return {scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};}));
  const results=await Promise.allSettled(inputs.map(input=>f.cmd('applyMasterImport',input)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(['INVALID_MASTER','STALE_REVISION'].includes(results.find(r=>r.status==='rejected').reason.code));const i=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('applyMasterImport',inputs[i]),results[i].value);
  const session=await f.session(),extra={scenarioId:undefined,sessionId:session.id},sw=await view(f,extra),sd=moduleDraft(sw,'cache'),payload=moduleFormSheets(sw,sd,terrainValues(sd)),preview=await f.prepare(payload,extra),path=`sessions/${session.id}/fieldStates/cache`;
  await f.store.runTransaction(async tx=>{const st=await tx.get(path);tx.set(path,{...st,activeActionId:'action-fictive',revision:st.revision+1});});assert.equal((await f.prepare(payload,extra)).canApply,false);await assert.rejects(f.cmd('applyMasterImport',{sessionId:session.id,sheets:payload,reason:'Import de test',confirmation:preview.confirmation}),{code:'INVALID_MASTER'});
 });
 test(`${prefix} : épisode suivant conserve identité des actions et récompenses déjà épuisées`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},w=await view(f,extra),d=moduleDraft(w,'cache');await f.apply(moduleFormSheets(w,d,{...terrainValues(d),action_SEARCH__duree_secondes:'17'}),extra);
  const path=`sessions/${s.id}/fieldStates/cache`;await f.store.runTransaction(async tx=>{const st=await tx.get(path);tx.set(path,{...st,stock:{...st.stock,'cache-kit':0}});});
  const close={sessionId:s.id,reason:'Fin fictive',cancelOffers:false},p=await f.read('prepareCampaignClosure',close);await f.cmd('closeCampaignSession',{...close,confirmation:p.confirmation});
  const input={campaignId:s.campaignId,title:'Suite du terrain',capacity:60,privacy:'Notice fictive',healthPolicy:'PRESERVE',reason:'Test de continuité'},preview=await f.read('prepareCampaignEpisode',input);let next=await f.cmd('beginCampaignEpisode',{...input,confirmation:preview.confirmation});while(next.status!=='READY')next=await f.cmd('advanceCampaignEpisode',{campaignId:s.campaignId,buildId:next.buildId??(await f.read('campaign',{campaignId:s.campaignId})).activeBuildId});
  const inherited=await view(f,{scenarioId:undefined,sessionId:next.id}),cache=inherited.rows.find(r=>r.row.id==='cache');assert.equal(cache.actions[0].id,'fouille-cache');assert.equal(cache.actions[0].version,'3');assert.equal(cache.actions[0].duree_secondes,'17');assert.equal((await f.store.get(`sessions/${next.id}/fieldStates/cache`)).stock['cache-kit'],0);
 });
}
