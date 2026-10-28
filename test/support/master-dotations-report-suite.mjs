import test from 'node:test';
import assert from 'node:assert/strict';
import {masterExample} from '../../src/shared/master-examples.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {dotationsReportSheets} from '../../web/master-dotations-report.mjs';
import {writeDotationsReportXlsx} from '../../web/master-xlsx-write.mjs';
import {readMasterXlsx} from '../../web/master-xlsx.mjs';
const view=(f,extra={},actor=f.owner)=>f.read('masterWorkspace',{scenarioId:f.scenarioId,module:'personnages',sheet:'Dotations',...extra},actor);
export function masterDotationsReportSuite(fixture,prefix){
 test(`${prefix} : relevé des dotations agrégées, lecture sans écriture et export non réimportable`,async()=>{
  const f=await fixture(),sheets=masterExample();sheets.Dotations.push({id:'credits-plus',operation:'CREER',version:'1',personnage_id:'pilote',type:'CREDIT',quantite:'7'});await f.apply(sheets);
  const base=`scenarios/${f.scenarioId}`,before=await f.store.get(base),chars=await f.store.list(`${base}/characters`),stamps=await f.store.list(`${base}/masterRows`);
  const w=await view(f),pilot=w.rows.find(r=>r.row.id==='pilote');assert.equal(w.editable,false);assert.equal(pilot.credits.amount,107);assert.equal(pilot.inventory.items[0].quantity,3);assert.deepEqual(pilot.inventory.items[0],{id:'kit',name:chars.find(c=>c.id==='pilote').startingInventory.items[0].item.name,unit:chars.find(c=>c.id==='pilote').startingInventory.items[0].item.unit,quantity:3});
  const report=dotationsReportSheets(w);assert.equal(report.Notice[0].destination_id,f.scenarioId);assert.equal(report.Releve.find(r=>r.personnage_id==='pilote').credits_depart,107);assert.ok(!JSON.stringify(report).includes('credits-plus'));assert.ok(!Object.hasOwn(report,'Meta'));assert.throws(()=>readMasterXlsx(writeDotationsReportXlsx(w)),{code:'INVALID_MASTER_FILE'});
  assert.equal((await f.prepare(report)).canApply,false);assert.deepEqual(await f.store.get(base),before);assert.deepEqual(await f.store.list(`${base}/characters`),chars);assert.deepEqual(await f.store.list(`${base}/masterRows`),stamps);
  await assert.rejects(view(f,{},f.player),{code:'FORBIDDEN'});await assert.rejects(view(f,{module:'magasins'}),{code:'INVALID_MASTER_SHEET'});
 });
 test(`${prefix} : relevé suit les outils de préparation et distingue absence, zéro et inventaire vide`,async()=>{
  const f=await fixture(),sheets=masterExample();sheets.Personnages.push({id:'sans-dotation',operation:'CREER',version:'1',nom:'Sans dotation'});await f.apply(sheets);let w=await view(f);const absent=w.rows.find(r=>r.row.id==='sans-dotation');assert.equal(absent.credits,null);assert.equal(absent.inventory,null);
  const input={scenarioId:f.scenarioId,characterId:'pilote',amount:0,revision:(await f.read('scenario',{scenarioId:f.scenarioId})).revision};const p=await f.read('prepareStartingCredits',input);await f.cmd('setStartingCredits',{...input,confirmation:p.confirmation});
  const inv={scenarioId:f.scenarioId,characterId:'pilote',items:[],revision:(await f.read('scenario',{scenarioId:f.scenarioId})).revision},q=await f.read('prepareStartingInventory',inv);await f.cmd('setStartingInventory',{...inv,confirmation:q.confirmation});
  const results=await Promise.all([view(f),view(f)]);assert.deepEqual(results[0],results[1]);w=results[0];const pilot=w.rows.find(r=>r.row.id==='pilote');assert.equal(pilot.credits.amount,0);assert.deepEqual(pilot.inventory.items,[]);const report=dotationsReportSheets(w),row=report.Releve.find(r=>r.personnage_id==='pilote');assert.equal(row.credits_configures,'OUI');assert.equal(row.credits_depart,0);assert.equal(row.inventaire_configure,'OUI');assert.equal(report.ObjetsDepart.length,0);
 });
 test(`${prefix} : relevé de session après dépense et épisode suivant ne redistribue pas les acquis`,async()=>{
  const f=await fixture();await f.apply(masterExample());const s=await f.session(),base=`sessions/${s.id}`,extra={scenarioId:undefined,sessionId:s.id};
  const account=await f.store.get(`${base}/accounts/${accountId('pilote')}`),kit=(await f.store.list(`${base}/inventory`)).find(l=>l.ownerId==='pilote');
  await f.store.runTransaction(async tx=>{tx.set(`${base}/accounts/${account.id}`,{...account,balance:9});tx.set(`${base}/inventory/${kit.id}`,{...kit,quantity:1});});
  const current=await f.read('session',{sessionId:s.id});await f.cmd('setStage',{sessionId:s.id,revision:current.revision,stage:'BRIEFING'});
  const w=await view(f,extra),pilot=w.rows.find(r=>r.row.id==='pilote');assert.equal(w.editable,false);assert.equal(pilot.credits.amount,100);assert.equal(pilot.inventory.items[0].quantity,3);await assert.rejects(f.prepare(dotationsReportSheets(w),extra),{code:'MASTER_PREPARATION_REQUIRED'});
  await assert.rejects(view(f,extra,f.player),{code:'FORBIDDEN'});
  const close={sessionId:s.id,reason:'Clôture fictive',cancelOffers:false},cp=await f.read('prepareCampaignClosure',close);await f.cmd('closeCampaignSession',{...close,confirmation:cp.confirmation});
  const input={campaignId:s.campaignId,title:'Suite du relevé',capacity:60,privacy:'Notice fictive',healthPolicy:'PRESERVE',reason:'Continuité'},p=await f.read('prepareCampaignEpisode',input);let next=await f.cmd('beginCampaignEpisode',{...input,confirmation:p.confirmation});while(next.status!=='READY')next=await f.cmd('advanceCampaignEpisode',{campaignId:s.campaignId,buildId:next.buildId??(await f.read('campaign',{campaignId:s.campaignId})).activeBuildId});
  const nw=await view(f,{scenarioId:undefined,sessionId:next.id});assert.deepEqual(nw.rows,w.rows);assert.equal(nw.meta[0].destination_id,next.id);assert.equal((await f.store.get(`sessions/${next.id}/accounts/${account.id}`)).balance,9);assert.equal((await f.store.list(`sessions/${next.id}/inventory`)).find(l=>l.ownerId==='pilote').quantity,1);
 });
}
