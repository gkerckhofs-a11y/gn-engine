import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {terrainMasterExample} from '../../src/shared/master-examples.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {moduleDraft,moduleFormSheets,moduleMasterSheets} from '../../web/master-editor.mjs';
import {writeMasterXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=(f,extra={})=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet:'Personnages',...extra});
const choices={nom:'Nouveau fictif',initial_profile:'OUI',initial_class:'medic',initial_skills:'savoir:4',initial_profile_publication:'NON',initial_credits:'17',initial_items:'kit:2;outil:1'};
const create=(w,patch={})=>{const d=moduleDraft(w);return moduleFormSheets(w,d,{...d.row,...choices,...patch});};
export function masterCharacterCreationSuite(fixture,prefix){
 test(`${prefix} : création groupée en scénario, aperçu sans écriture, XLSX et dotation unique à la première session`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const w=await view(f),sheets=readMasterXlsx(writeMasterXlsx(create(w))),id=sheets.Personnages[0].id;
  assert.deepEqual(Object.keys(sheets),['Meta','Personnages','Attributions','Dotations']);assert.ok(!Object.hasOwn(sheets.Personnages[0],'initial_credits'));
  const p=await f.prepare(sheets,{module:'personnages'});assert.deepEqual(p.errors,[]);assert.equal(p.counts.CREATE,5);assert.equal(await f.store.get(`scenarios/${f.scenarioId}/characters/${id}`),null);
  await f.apply(sheets,{module:'personnages'});assert.equal((await f.apply(sheets)).unchanged,true);
  const c=await f.store.get(`scenarios/${f.scenarioId}/characters/${id}`);assert.equal(c.startingCredits.amount,17);assert.equal(c.startingInventory.items.length,2);assert.equal(c.abilityProfile.published,false);assert.equal(c.abilityProfile.skills.find(s=>s.id==='savoir').level,4);assert.ok(c.abilityProfile.skills.some(s=>s.id==='medecine'));
  const s=await f.session();assert.equal((await f.store.get(`sessions/${s.id}/accounts/${accountId(id)}`)).balance,17);assert.equal((await f.store.list(`sessions/${s.id}/inventory`)).filter(l=>l.ownerId===id).length,2);
  const copyW=await view(f),d=moduleDraft(copyW,id,'duplicate'),copy=moduleFormSheets(copyW,d,d.row);assert.deepEqual(Object.keys(copy),['Meta','Personnages']);await f.apply(copy);const copied=await f.store.get(`scenarios/${f.scenarioId}/characters/${d.row.id}`);assert.equal(copied.abilityProfile,undefined);assert.equal(copied.startingCredits,undefined);assert.equal(copied.startingInventory,undefined);
  const fresh=await view(f);assert.deepEqual(Object.keys(moduleMasterSheets(fresh)),['Meta','Personnages']);
 });
 test(`${prefix} : création groupée invalide ou non autorisée refusée atomiquement`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const w=await view(f),path=`scenarios/${f.scenarioId}/characters/${w.newRow.id}`;
  await assert.rejects(f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages'},f.player),{code:'FORBIDDEN'});
  for(const patch of [{initial_class:'absente'},{initial_skills:'absente:2'},{initial_skills:'savoir:0'},{initial_items:'outil:2'},{initial_items:'absent:1'},{initial_credits:'-1'}]){
   const sheets=create(w,patch);assert.equal((await f.prepare(sheets)).canApply,false);await assert.rejects(f.cmd('applyMasterImport',{scenarioId:f.scenarioId,sheets,reason:'Refus',confirmation:'incorrecte'}),{code:'INVALID_MASTER'});assert.equal(await f.store.get(path),null);
  }
  const sheets=create(w);assert.equal((await f.prepare(sheets,{module:'communication'})).canApply,false);
  const input={scenarioId:f.scenarioId,sheets,reason:'Import de test'};const p=await f.prepare(sheets);await assert.rejects(f.cmd('applyMasterImport',{...input,confirmation:p.confirmation},f.player),{code:'FORBIDDEN'});assert.equal(await f.store.get(path),null);
  const empty=await fixture(),ew=await view(empty);assert.equal((await empty.prepare(create(ew,{initial_profile:'NON',initial_items:''}))).canApply,false);
 });
 test(`${prefix} : confirmations concurrentes du nouveau personnage, un seul gagnant et réessai sans doublon`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const w=await view(f),inputs=await Promise.all(['Premier','Second'].map(async nom=>{const sheets=create(w,{nom}),p=await f.prepare(sheets);assert.deepEqual(p.errors,[]);return {scenarioId:f.scenarioId,sheets,reason:'Import de test',confirmation:p.confirmation,requestId:randomUUID()};}));
  const results=await Promise.allSettled(inputs.map(i=>f.cmd('applyMasterImport',i)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.ok(['INVALID_MASTER','STALE_REVISION'].includes(results.find(r=>r.status==='rejected').reason.code));const winner=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('applyMasterImport',inputs[winner]),results[winner].value);
  const c=await f.store.get(`scenarios/${f.scenarioId}/characters/${w.newRow.id}`);assert.equal(c.startingCredits.amount,17);assert.equal(c.startingInventory.items.find(i=>i.item.id==='kit').quantity,2);
 });
 test(`${prefix} : renfort en session conserve les acquis, interdit la redistribution et suit l’épisode suivant`,async()=>{
  const f=await fixture();await f.apply(terrainMasterExample());const s=await f.session(),extra={scenarioId:undefined,sessionId:s.id},base=`sessions/${s.id}`,old=await f.store.get(`${base}/characters/pilote`),account=await f.store.get(`${base}/accounts/${accountId('pilote')}`),stock=(await f.store.list(`${base}/inventory`)).filter(l=>l.ownerId==='pilote');
  let w=await view(f,extra);const sheets=create(w),id=w.newRow.id;await f.apply(sheets,extra);assert.equal((await f.apply(sheets,extra)).unchanged,true);assert.equal((await f.store.get(`${base}/accounts/${accountId(id)}`)).balance,17);
  assert.deepEqual(await f.store.get(`${base}/characters/pilote`),old);assert.deepEqual(await f.store.get(`${base}/accounts/${accountId('pilote')}`),account);assert.deepEqual((await f.store.list(`${base}/inventory`)).filter(l=>l.ownerId==='pilote'),stock);
  w=await view(f,extra);const d=moduleDraft(w,id),edit=moduleFormSheets(w,d,{...d.row,...choices,nom:'Renfort modifié'});assert.deepEqual(Object.keys(edit),['Meta','Personnages']);await f.apply(edit,extra);
  w=await view(f,extra);const bad={Meta:w.meta,Dotations:[{...sheets.Dotations[0],id:'redistribution'}],Attributions:[{...sheets.Attributions[0],version:'2',operation:'MODIFIER'}]};assert.equal((await f.prepare(bad,extra)).canApply,false);
  // Simulate acquired state after play; the next episode must not seed the initial grants again.
  const spent=await f.store.get(`${base}/accounts/${accountId(id)}`),lots=(await f.store.list(`${base}/inventory`)).filter(l=>l.ownerId===id),kit=lots.find(l=>l.item.id==='kit'),played=await f.store.get(`${base}/characters/${id}`);
  await f.store.runTransaction(async tx=>{tx.set(`${base}/accounts/${spent.id}`,{...spent,balance:9,revision:spent.revision+1});tx.set(`${base}/inventory/${kit.id}`,{...kit,quantity:1,revision:kit.revision+1});tx.set(`${base}/characters/${id}`,{...played,hp:1});});
  const current=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:current.revision,stage:'BRIEFING'});w=await view(f,extra);assert.equal(w.editable,false);assert.throws(()=>create(w),/ne peut pas être modifié/);
  const close={sessionId:s.id,reason:'Clôture fictive',cancelOffers:false},cp=await f.read('prepareCampaignClosure',close);await f.cmd('closeCampaignSession',{...close,confirmation:cp.confirmation});
  const input={campaignId:s.campaignId,title:'Suite des renforts',capacity:60,privacy:'Notice fictive',healthPolicy:'PRESERVE',reason:'Continuité'},p=await f.read('prepareCampaignEpisode',input);let next=await f.cmd('beginCampaignEpisode',{...input,confirmation:p.confirmation});while(next.status!=='READY')next=await f.cmd('advanceCampaignEpisode',{campaignId:s.campaignId,buildId:next.buildId??(await f.read('campaign',{campaignId:s.campaignId})).activeBuildId});
  assert.equal((await f.store.get(`sessions/${next.id}/accounts/${accountId(id)}`)).balance,9);assert.equal((await f.store.list(`sessions/${next.id}/inventory`)).find(l=>l.ownerId===id&&l.item.id==='kit').quantity,1);assert.equal((await f.store.get(`sessions/${next.id}/characters/${id}`)).hp,1);assert.equal((await f.store.list(`sessions/${next.id}/inventory`)).filter(l=>l.ownerId===id).length,2);assert.equal((await f.store.get(`sessions/${next.id}/characters/${id}`)).abilityProfile.skills.find(s=>s.id==='savoir').level,4);
 });
}
