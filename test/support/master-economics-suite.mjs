import test from 'node:test';
import assert from 'node:assert/strict';
import {economicMasterExample,economicSessionMasterExample} from '../../src/shared/master-examples.mjs';
import {cleanScenarioSnapshot,scenarioCollections} from '../../src/core/scenario-package.mjs';

export function masterEconomicsSuite(fixture,prefix){
 test(`${prefix} : cours et événements importés, versionnés, archivables et hérités sans état joué`,async()=>{
  const f=await fixture(),sheets=economicMasterExample();assert.equal((await f.prepare(sheets)).canApply,true);
  assert.equal((await f.store.list(`scenarios/${f.scenarioId}/priceEvents`)).length,0);
  await f.apply(sheets);assert.equal((await f.apply(sheets)).unchanged,true);
  const records=Object.fromEntries(await Promise.all(scenarioCollections.map(async k=>[k,await f.store.list(`scenarios/${f.scenarioId}/${k}`)])));
  const clean=cleanScenarioSnapshot({scenario:await f.read('scenario',{scenarioId:f.scenarioId}),records:{...records,priceEvents:records.priceEvents.map(e=>({...e,active:true,actorUid:'PRIVATE_RUNTIME'}))}});
  assert.equal(clean.records.commodityPrices[0].baseUnitPrice,10);assert.equal(clean.records.priceEvents.length,3);assert.ok(clean.records.priceEvents.every(e=>e.active===undefined&&e.actorUid===undefined));
  const {manifest}=await f.read('prepareScenarioExport',{scenarioId:f.scenarioId}),input={manifest,title:'Copie économique'},preview=await f.read('prepareScenarioImport',input);
  const job=await f.cmd('beginScenarioImport',{...input,confirmation:preview.confirmation}),copy=await f.read('commitScenarioImport',{importId:job.id});
  assert.deepEqual(await f.store.list(`scenarios/${copy.id}/commodityPrices`),clean.records.commodityPrices);
  assert.deepEqual((await f.store.list(`scenarios/${copy.id}/priceEvents`)).sort((a,b)=>a.id.localeCompare(b.id)),clean.records.priceEvents);
  const start=await f.session(),base=`sessions/${start.id}`,extra={scenarioId:undefined,sessionId:start.id},d=await f.read('priceAdmin',{sessionId:start.id});assert.equal(d.prices[0].baseUnitPrice,10);assert.equal(d.events.length,3);assert.equal(d.events.some(e=>e.active),false);
  const originalLots=await f.store.list(`${base}/inventory`),originalAccounts=await f.store.list(`${base}/accounts`),master=economicSessionMasterExample();master.Meta[0].campaign_id=start.campaignId;
  await f.apply(master,extra);assert.equal((await f.store.get(`${base}/commodityPrices/carburant-demo`)).baseUnitPrice,12);assert.equal((await f.store.get(`${base}/priceEvents/detour-demo`)).fuelPercent,25);
  for(const lot of originalLots)assert.deepEqual(await f.store.get(`${base}/inventory/${lot.id}`),lot);for(const a of originalAccounts)assert.deepEqual(await f.store.get(`${base}/accounts/${a.id}`),a);
  await f.apply({Meta:master.Meta,EvenementsEco:[{id:'detour-demo',operation:'ARCHIVER',version:'3'}]},extra);assert.equal((await f.store.get(`${base}/priceEvents/detour-demo`)).enabled,false);
 });
 test(`${prefix} : références et effets incohérents refusés atomiquement, ancienne archive compatible`,async()=>{
  const f=await fixture();
  for(const patch of [s=>s.Cours[0].id='absent',s=>s.Cours[0].prix_base='0',s=>s.EvenementsEco[0].objet_id='absent',s=>s.EvenementsEco[0].installation_id='absent',s=>s.EvenementsEco[0].variation_prix_pct='1.5',s=>s.EvenementsEco[0].variation_prix_pct='-101',s=>s.EvenementsEco[2].route_id='absent',s=>s.EvenementsEco[2].objet_id='kit',s=>s.EvenementsEco[2].commerce_suspendu='OUI']){const sheets=economicMasterExample();patch(sheets);assert.equal((await f.prepare(sheets)).canApply,false);}
  assert.equal((await f.store.list(`scenarios/${f.scenarioId}/commodityPrices`)).length,0);
  const s=economicMasterExample();delete s.Cours;delete s.EvenementsEco;await f.apply(s);
  const records=Object.fromEntries(await Promise.all(scenarioCollections.filter(k=>!['commodityPrices','priceEvents'].includes(k)).map(async k=>[k,await f.store.list(`scenarios/${f.scenarioId}/${k}`)])));
  const old=cleanScenarioSnapshot({scenario:await f.read('scenario',{scenarioId:f.scenarioId}),records});assert.deepEqual(old.records.commodityPrices,[]);assert.deepEqual(old.records.priceEvents,[]);
 });
}
