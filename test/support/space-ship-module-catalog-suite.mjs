import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralFixture,centralTestItem} from './central-master-suite.mjs';
import {importFixture} from './central-import-suite.mjs';
import {entryFixture} from './space-outlaws-entry-suite.mjs';

export const moduleItem={...centralTestItem,name:'Bouclier cargo',kind:'INDIVIDUAL',consumable:false,shipModule:{code:'MOD-01',size:2}};
export function shipModuleCatalogSuite(makeStore,prefix='Catalogue modules M1'){
 test(`${prefix} : définition privée, réessai unique et aucune ressource créée`,async()=>{
  const f=await centralFixture(makeStore),requestId=randomUUID(),r=await f.save({item:moduleItem,requestId});
  assert.deepEqual(await f.save({item:moduleItem,requestId}),r);
  const d=await f.view();assert.deepEqual(d.changes[0].data.shipModule,moduleItem.shipModule);assert.equal(d.history.length,1);
  for(const kind of ['items','ships','shipMaintenance','inventory','accounts','ledger','actionPoints'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[]);
 });
 test(`${prefix} : calibration fermée et conditionnement obligatoire sans écriture partielle`,async()=>{
  const f=await centralFixture(makeStore);
  for(const shipModule of [{code:'MOD-01',size:0},{code:'MOD-01',size:'2'},{code:'MOD-01',size:1.5},{code:'MOD-04',size:2},{code:'R04-01',size:2},{code:'MOD-01',size:2,price:1},{code:'MOD-01'},[],false,'MOD-01'])await assert.rejects(f.save({item:{...moduleItem,shipModule}}),{code:'INVALID_SHIP_MODULE'});
  for(const patch of [{kind:'STACKABLE'},{consumable:true}])await assert.rejects(f.save({item:{...moduleItem,...patch}}),{code:'INVALID_SHIP_MODULE'});
  assert.equal((await f.view()).draft.revision,0);assert.equal((await f.view()).history.length,0);
 });
 test(`${prefix} : omission conserve, effacement explicite et ancien modèle inchangé`,async()=>{
  const f=await centralFixture(makeStore);await f.save({item:moduleItem});
  const {shipModule,...item}=moduleItem;await f.save({item,draftRevision:1,itemRevision:1});assert.deepEqual((await f.view()).changes[0].data.shipModule,shipModule);
  await f.save({item:{...item,shipModule:null},draftRevision:2,itemRevision:2});assert.equal('shipModule' in (await f.view()).changes[0].data,false);
  await f.save({item:centralTestItem,draftRevision:3,itemRevision:3});assert.equal('shipModule' in (await f.view()).changes[0].data,false);
 });
 test(`${prefix} : modification Excel historique conserve la calibration du même brouillon`,async()=>{
  const f=await importFixture(makeStore);await f.save({item:moduleItem});
  const input=await f.file('M1',[{id:'ingredient',operation:'MODIFIER',revision:1,nom:'Bouclier cargo renommé'}]),p=await f.prepare(input);
  assert.deepEqual(p.errors,[]);await f.apply(input,p);assert.deepEqual((await f.view()).changes[0].data.shipModule,moduleItem.shipModule);
  const bad=await f.file('M1',[{id:'ingredient',operation:'MODIFIER',revision:2,consommable:'OUI'}]);assert.ok((await f.prepare(bad)).errors.length);assert.equal((await f.view()).changes[0].data.consumable,false);
 });
 test(`${prefix} : concurrence et révocation avant ancien reçu`,async()=>{
  const f=await centralFixture(makeStore);await f.grant();const requestId=randomUUID();await f.save({item:moduleItem,requestId},f.mj);
  const r=await Promise.allSettled([f.save({item:{...moduleItem,name:'A'},draftRevision:1,itemRevision:1}),f.save({item:{...moduleItem,name:'B'},draftRevision:1,itemRevision:1})]);
  assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');
  await f.grant({revision:1,active:false});await assert.rejects(f.save({item:moduleItem,requestId},f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : interruption transactionnelle conserve le brouillon et permet le réessai`,async()=>{
  const raw=makeStore();let fail=false;
  const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail)throw Error('INTERRUPTION');return result;})};
  const f=await centralFixture(()=>store),requestId=randomUUID();fail=true;await assert.rejects(f.save({item:moduleItem,requestId}),/INTERRUPTION/);fail=false;
  assert.equal((await f.view()).draft.revision,0);assert.equal((await f.view()).history.length,0);
  await f.save({item:moduleItem,requestId});assert.equal((await f.view()).history.length,1);
 });
 test(`${prefix} : publication refusée puis archive sans enrichissement des versions ordinaires`,async()=>{
  const f=await entryFixture(makeStore),d=await f.central('centralMaster',{workshop:'M1'});
  await f.cc('saveCentralItem',{itemId:'module',itemRevision:0,draftRevision:d.draft.revision,item:moduleItem,reason:'Préparer le module'});
  const p=await f.releasePreview();assert.equal(p.canRelease,false);assert.ok(p.blockers.some(b=>b.code==='SO_SHIP_MODULE_NOT_CONNECTED'&&b.entityId==='module'));
  await assert.rejects(f.release(p),{code:'SO_RELEASE_BLOCKED'});assert.deepEqual(await f.store.list(`campaigns/${f.campaignId}/versions`),[]);
  const fresh=await f.central('centralMaster',{workshop:'M1'});await f.cc('archiveCentralItem',{itemId:'module',itemRevision:1,draftRevision:fresh.draft.revision,reason:'Conserver hors version jouable'});
  const ready=await f.releasePreview();assert.deepEqual(ready.blockers,[]);await f.release(ready);await f.birth(await f.birthPreview());
  const s=await f.store.get(`sessions/${f.sid}`);assert.equal(s.spaceOutlaws.shipModulesVersion,undefined);
 });
}
