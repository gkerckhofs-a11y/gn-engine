import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {centralMissionsFixture} from './central-missions-suite.mjs';
import {centralItemRow} from './central-import-suite.mjs';
import {centralLimits} from '../../src/core/central-master.mjs';
import {centralCheckLimits} from '../../src/core/central-check.mjs';
import {centralSpaceEditable} from '../../src/core/central-space.mjs';

export const centralTestShipModel={name:'Modèle synthétique',description:'Description privée M3',gmNotes:'Secret modèle M3',profileId:'FIGHTER'};
export const centralTestPort={name:'Port synthétique',description:'Description privée M3',gmNotes:'Secret port M3',navigationCode:'SECRET-CODE-PORT',locationTargetId:null};
export const centralTestRoute={name:'Route synthétique',description:'Description privée M3',gmNotes:'Secret route M3',fromPort:'origin',toPort:'destination',distanceId:'SHORT',riskId:'SECURED',navigationCode:'SECRET-CODE-ROUTE'};
const fixtures={shipModel:centralTestShipModel,port:centralTestPort,route:centralTestRoute};
const suffix={shipModel:'ShipModel',port:'Port',route:'Route'};
export async function centralSpaceFixture(makeStore){
 const f=await centralMissionsFixture(makeStore);
 const saveSpace=(type,extra={},actor=f.owner)=>f.cmd(`saveCentral${suffix[type]}`,{campaignId:f.cid,[`${type}Id`]:type,[`${type}Revision`]:0,draftRevision:0,[type]:fixtures[type],reason:'Préparer M3',...extra},actor);
 const archiveSpace=(type,extra={},actor=f.owner)=>f.cmd(`archiveCentral${suffix[type]}`,{campaignId:f.cid,[`${type}Id`]:type,[`${type}Revision`]:1,draftRevision:1,reason:'Archiver M3',...extra},actor);
 const ports=async(draftRevision=1)=>{await saveSpace('port',{portId:'origin',draftRevision});await saveSpace('port',{portId:'destination',draftRevision:draftRevision+1,port:{...centralTestPort,navigationCode:'DESTINATION-CODE'}});};
 return {...f,saveSpace,archiveSpace,ports};
}
export function centralSpaceSuite(makeStore,prefix='Spatioport central C2j'){
 test(`${prefix} : lecture vide et droits M3 explicites sans droit de session`,async()=>{
  const f=await centralSpaceFixture(makeStore),d=await f.view('M3');assert.deepEqual(d.changes,[]);assert.equal(d.draft.revision,0);assert.equal(d.publicationAvailable,false);assert.equal(await f.store.get(f.base),null);
  await f.grant({readWorkshops:['M3'],editWorkshops:[]});for(const type of Object.keys(fixtures))await assert.rejects(f.saveSpace(type,{},f.mj),{code:'FORBIDDEN'});await f.grant({revision:1,readWorkshops:['M3'],editWorkshops:['M3']});await f.saveSpace('port',{},f.mj);await assert.rejects(f.read('session',f.mj,{sessionId:f.sid}),{code:'FORBIDDEN'});await assert.rejects(f.check(1,f.mj),{code:'FORBIDDEN'});await assert.rejects(f.grant({revision:2,readWorkshops:['M1'],editWorkshops:['M3']}),{code:'INVALID_CENTRAL_GRANT'});
 });
 test(`${prefix} : trois familles V0.7, fret nul du chasseur et aucun état joué`,async()=>{
  const f=await centralSpaceFixture(makeStore),before=await f.store.get(`sessions/${f.sid}`);let revision=0;
  for(const [profileId,expected] of [['FIGHTER',[5000,3,1,2,0,1,1,8,1]],['CARGO',[10000,4,2,1,20,6,2,16,2]],['TRANSPORT',[20000,6,3,0,50,15,3,24,3]]]){
   await f.saveSpace('shipModel',{shipModelId:profileId,draftRevision:revision++,shipModel:{...centralTestShipModel,profileId}});const c=await f.store.get(`${f.base}/changes/shipModel_${profileId}`);assert.deepEqual(['referencePrice','hullMax','shieldMax','maneuverability','cargoCapacity','seats','moduleSlots','tankCapacity','size'].map(k=>c.data[k]),expected);assert.equal(c.data.publicationState,'DRAFT');assert.equal(c.data.masterArchived,false);
  }
  assert.deepEqual(await f.store.get(`sessions/${f.sid}`),before);for(const k of ['ships','routes','journeys','ports','inventory','accounts','ledger','characters','fieldTargets'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${k}`),[],k);assert.deepEqual(await f.store.list(`campaigns/${f.cid}/versions`),[]);
 });
 test(`${prefix} : distances et risques indépendants aux barèmes fixes`,async()=>{
  const f=await centralSpaceFixture(makeStore);let revision=0;
  for(const [distanceId,seconds,factor] of [['SHORT',300,1],['MEDIUM',600,2],['LONG',900,3]])for(const [riskId,faces] of [['SECURED',1],['DANGEROUS',2],['HOSTILE',3]]){
   const id=`${distanceId}-${riskId}`;await f.saveSpace('route',{routeId:id,draftRevision:revision++,route:{...centralTestRoute,navigationCode:id,distanceId,riskId}});const {data:d}=await f.store.get(`${f.base}/changes/route_${id}`);assert.equal(d.durationSeconds,seconds);assert.equal(d.distanceFactor,factor);assert.equal(d.eventFaces,faces);assert.equal(d.fuelCost,undefined);assert.equal(d.enabled,undefined);
  }
  assert.equal((await f.check(9)).totals.invalid,0);
 });
 test(`${prefix} : ports différés résolus sans recopier ni réécrire les routes`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('route');const before=await f.store.get(`${f.base}/changes/route_route`);assert.equal((await f.view('M3')).diagnostics.filter(x=>x.code==='REFERENCE_MISSING').length,2);await f.ports();assert.deepEqual((await f.view('M3')).diagnostics,[]);assert.deepEqual(await f.store.get(`${f.base}/changes/route_route`),before);const r=await f.check(3);assert.equal(r.edges.length,2);assert.ok(r.edges.every(e=>e.to.type==='port'&&e.status==='RESOLVED'));assert.equal(r.workshops.find(w=>w.id==='M3').coverage,'PARTIAL');assert.equal(r.publicationAvailable,false);
 });
 test(`${prefix} : archive de port signale les routes puis restauration sans réécriture`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('route');await f.ports();const before=await f.store.get(`${f.base}/changes/route_route`);await f.archiveSpace('port',{portId:'origin',draftRevision:3});assert.equal((await f.check(4)).edges.find(e=>e.field==='fromPort').status,'ARCHIVED');assert.ok((await f.view('M3')).diagnostics.some(d=>d.code==='REFERENCE_ARCHIVED'&&d.reference==='origin'));await f.saveSpace('port',{portId:'origin',portRevision:2,draftRevision:4});assert.equal((await f.check(5)).edges.find(e=>e.field==='fromPort').status,'RESOLVED');assert.deepEqual(await f.store.get(`${f.base}/changes/route_route`),before);
 });
 test(`${prefix} : archives et restaurations des trois types conservent audit et identité`,async()=>{
  for(const type of Object.keys(fixtures)){
   const f=await centralSpaceFixture(makeStore);await f.saveSpace(type);const input={requestId:randomUUID()},r=await f.archiveSpace(type,input);assert.deepEqual(await f.archiveSpace(type,input),r);await assert.rejects(f.archiveSpace(type,{draftRevision:2,[`${type}Revision`]:2}),{code:'CENTRAL_SPACE_UNAVAILABLE'});await f.saveSpace(type,{draftRevision:2,[`${type}Revision`]:2});const d=await f.view('M3');assert.equal(d.changes[0].entityId,type);assert.equal(d.changes[0].data.revision,3);assert.equal(d.changes[0].data.masterArchived,false);assert.equal(d.history.length,3);assert.equal(d.history[0].before.operation,'ARCHIVE');assert.equal(d.history[1].before.operation,'UPSERT');assert.equal((await f.check(3)).totals.invalid,0);
  }
 });
 test(`${prefix} : homonymes des trois types séparés et historique complet M3`,async()=>{
  const f=await centralSpaceFixture(makeStore);let revision=0;for(const type of Object.keys(fixtures))await f.saveSpace(type,{[`${type}Id`]:'same',draftRevision:revision++});const d=await f.view('M3');assert.equal(d.changes.length,3);assert.equal(d.history.length,3);assert.equal((await f.check(3)).totals.invalid,0);
 });
 test(`${prefix} : codes ambigus localisés sans révéler leur valeur dans le contrôle`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('port');await f.saveSpace('port',{portId:'other',draftRevision:1,port:{...centralTestPort,navigationCode:' SECRET-CODE-PORT '}});let r=await f.check(2);assert.equal(r.diagnostics.filter(d=>d.code==='NAVIGATION_CODE_DUPLICATE').length,2);assert.doesNotMatch(JSON.stringify(r),/SECRET-CODE-PORT/);await f.archiveSpace('port',{portId:'other',draftRevision:2});assert.deepEqual((await f.check(3)).diagnostics,[]);await f.saveSpace('route',{draftRevision:3,route:{...centralTestRoute,navigationCode:centralTestPort.navigationCode}});assert.equal((await f.view('M3')).diagnostics.some(d=>d.code==='NAVIGATION_CODE_DUPLICATE'),false);
 });
 test(`${prefix} : lecture M3 isolée, suggestions minimales et aucune admission consultée`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.save();await f.configure(1);await f.saveSpace('port',{draftRevision:2});await f.grant({readWorkshops:['M3'],editWorkshops:['M3']});const reads=[],run=f.store.runTransaction.bind(f.store);f.store.runTransaction=cb=>run(tx=>cb({...tx,list:async(...args)=>{reads.push(args);return tx.list(...args);}}));const d=await f.view('M3',f.mj);assert.deepEqual(reads.filter(([p])=>p===`${f.base}/changes`).map(x=>x[1]),[['workshop','M3']]);assert.ok(reads.every(([p])=>!p.includes('/admission')&&!p.includes('/registrations')));assert.deepEqual(Object.keys(d.references.ports[0]).sort(),['archived','id','name','revision','source']);assert.doesNotMatch(JSON.stringify(d.references),/SECRET-CODE|Secret port|Description privée/);assert.doesNotMatch(JSON.stringify(d),/Ingrédient synthétique|Règles fictives|species-test/);
 });
 test(`${prefix} : états, valeurs libres et pouvoirs injectés refusés pour chaque type`,async()=>{
  const f=await centralSpaceFixture(makeStore);for(const type of Object.keys(fixtures))for(const patch of [{publicationState:'PUBLISHED'},{schemaVersion:2},{revision:4},{id:'forged'},{masterArchived:true},{enabled:true},{ownerId:'person'},{pilotId:'pilot'},{fuel:8},{journey:{}},{stock:1},{hullMax:99},{fuelCost:1},{durationSeconds:30},{referencePrice:1},{eventFaces:6}])await assert.rejects(f.saveSpace(type,{[type]:{...fixtures[type],...patch}}),{code:'INVALID_CENTRAL_SPACE'});await assert.rejects(f.saveSpace('port',{sessionId:f.sid}),{code:'INVALID_CENTRAL_MASTER'});assert.equal(await f.store.get(f.base),null);
 });
 test(`${prefix} : profils, textes, codes, extrémités et identifiants stricts`,async()=>{
  const f=await centralSpaceFixture(makeStore);for(const type of Object.keys(fixtures))for(const patch of [{name:''},{name:'n'.repeat(151)},{description:'d'.repeat(4001)},{gmNotes:'n'.repeat(4001)}])await assert.rejects(f.saveSpace(type,{[type]:{...fixtures[type],...patch}}),{code:'INVALID_CENTRAL_SPACE'});
  for(const profileId of ['',null,'FREE','CARGO_LIGHT'])await assert.rejects(f.saveSpace('shipModel',{shipModel:{...centralTestShipModel,profileId}}),{code:'INVALID_CENTRAL_SPACE'});for(const type of ['port','route'])for(const navigationCode of ['',42,'n'.repeat(81)])await assert.rejects(f.saveSpace(type,{[type]:{...fixtures[type],navigationCode}}),{code:'INVALID_CENTRAL_SPACE'});for(const patch of [{distanceId:'FREE'},{riskId:'SAFE'}])await assert.rejects(f.saveSpace('route',{route:{...centralTestRoute,...patch}}),{code:'INVALID_CENTRAL_SPACE'});await assert.rejects(f.saveSpace('route',{route:{...centralTestRoute,toPort:'origin'}}),{code:'INVALID_NAVIGATION'});await assert.rejects(f.saveSpace('route',{route:{...centralTestRoute,toPort:'bad/id'}}),{code:'INVALID_ID'});await assert.rejects(f.saveSpace('port',{port:{...centralTestPort,locationTargetId:'../location'}}),{code:'INVALID_ID'});
 });
 test(`${prefix} : lieu commun explicitement non contrôlé, sans catalogue ni QR parallèle`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('port',{port:{...centralTestPort,locationTargetId:'place'}});const d=await f.view('M3');assert.equal(d.diagnostics[0].code,'REFERENCE_NOT_CHECKED');const r=await f.check(1);assert.equal(r.edges[0].to.type,'fieldTarget');assert.equal(r.edges[0].status,'NOT_CHECKED');assert.deepEqual(await f.store.list(`sessions/${f.sid}/fieldTargets`),[]);
 });
 test(`${prefix} : valeurs dérivées corrompues et champs étrangers bloquent le contrôle`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('shipModel');await f.saveSpace('route',{draftRevision:1});await f.saveSpace('port',{draftRevision:2});for(const [type,patches] of [['shipModel',[{referencePrice:1},{cargoCapacity:1},{seats:2},{hullMax:4},{size:2}]],['route',[{durationSeconds:60},{distanceFactor:9},{eventFaces:6},{fuelCost:1}]],['port',[{enabled:true},{navigationCode:''}]]]){const c=await f.store.get(`${f.base}/changes/${type}_${type}`);for(const patch of patches){await f.inject(c.id,{data:{...c.data,...patch}});assert.equal((await f.check(3)).totals.invalid,1);}await f.inject(c.id,{data:c.data});}assert.equal((await f.check(3)).totals.invalid,0);
 });
 test(`${prefix} : cible port invalide ne se résout pas par modèle ou instance homonyme`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('route');await f.saveSpace('shipModel',{shipModelId:'origin',draftRevision:1});await f.ports(2);const target=await f.store.get(`${f.base}/changes/port_origin`);await f.inject(target.id,{data:{...target.data,publicationState:'PUBLISHED'}});const r=await f.check(4);assert.equal(r.edges.find(e=>e.field==='fromPort').status,'INVALID');assert.ok(r.diagnostics.some(d=>d.entityType==='route'&&d.code==='REFERENCE_INVALID'&&d.referenceType==='port'));
 });
 test(`${prefix} : réessais des trois commandes et révocation avant restitution du reçu`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.grant({readWorkshops:['M3'],editWorkshops:['M3']});let revision=0;const inputs=[];for(const type of Object.keys(fixtures)){const input={requestId:randomUUID(),draftRevision:revision++};inputs.push([type,input]);const saved=await f.saveSpace(type,input,f.mj);assert.deepEqual(await f.saveSpace(type,input,f.mj),saved);await assert.rejects(f.saveSpace(type,{...input,[type]:{...fixtures[type],name:'Autre'}},f.mj),{code:'REQUEST_ID_REUSED'});}await f.grant({revision:1,readWorkshops:['M3'],editWorkshops:[]});for(const [type,input] of inputs)await assert.rejects(f.saveSpace(type,input,f.mj),{code:'FORBIDDEN'});await f.grant({revision:2,active:false});await assert.rejects(f.view('M3',f.mj),{code:'FORBIDDEN'});
 });
 test(`${prefix} : concurrence avec M1 M2 M4 M5 M6 M7 sur la révision commune`,async()=>{
  for(const other of [f=>f.save(),f=>f.saveCharacter(),f=>f.recipe(),f=>f.saveShop(),f=>f.saveKnowledge(),f=>f.saveMission()]){const f=await centralSpaceFixture(makeStore),r=await Promise.allSettled([f.saveSpace('route'),other(f)]);assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');assert.equal((await f.store.list(`${f.base}/changes`)).length,1);assert.equal((await f.store.list(`${f.base}/history`)).length,1);}
 });
 test(`${prefix} : concurrence interne aux types M3 sans définitions mélangées`,async()=>{
  const f=await centralSpaceFixture(makeStore),r=await Promise.allSettled(Object.keys(fixtures).map(type=>f.saveSpace(type)));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.ok(r.filter(x=>x.status==='rejected').every(x=>x.reason.code==='STALE_REVISION'));assert.equal((await f.view('M3')).history.length,1);
 });
 test(`${prefix} : deux éditions de route ne mélangent pas distance et risque`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('route');const r=await Promise.allSettled([['LONG','HOSTILE'],['MEDIUM','DANGEROUS']].map(([distanceId,riskId])=>f.saveSpace('route',{draftRevision:1,routeRevision:1,route:{...centralTestRoute,distanceId,riskId}})));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal(r.find(x=>x.status==='rejected').reason.code,'STALE_REVISION');const d=(await f.view('M3')).changes[0].data;assert.ok(d.durationSeconds===900&&d.eventFaces===3||d.durationSeconds===600&&d.eventFaces===2);
 });
 test(`${prefix} : limites techniques par type, archives comprises et édition conservée`,async()=>{
  for(const type of Object.keys(fixtures)){const f=await centralSpaceFixture(makeStore);await f.saveSpace(type);const c=(await f.view('M3')).changes[0],limit=centralLimits[`${type}s`];await f.store.runTransaction(async tx=>{for(let i=1;i<limit;i++){const id=`extra-${i}`;tx.set(`${f.base}/changes/${type}_${id}`,{...c,id:`${type}_${id}`,entityId:id,operation:'ARCHIVE',data:{...c.data,id,masterArchived:true}});}});await assert.rejects(f.saveSpace(type,{[`${type}Id`]:'overflow',draftRevision:1}),{code:'CENTRAL_LIMIT'});await f.saveSpace(type,{draftRevision:1,[`${type}Revision`]:1});assert.equal((await f.check(2)).totals.valid,limit);}assert.equal(centralCheckLimits.records,1659);
 });
 test(`${prefix} : contrôle privé, sources XLSX étrangères refusées et gabarit central distinct`,async()=>{
  const f=await centralSpaceFixture(makeStore);let revision=0;for(const type of Object.keys(fixtures))await f.saveSpace(type,{draftRevision:revision++});const r=await f.check(3);assert.doesNotMatch(JSON.stringify(r),/Description privée M3|Secret (route|modèle|port) M3|SECRET-CODE/);assert.ok(r.diff.filter(d=>d.type!=='shipModel').every(d=>d.privateFields.includes('navigationCode')));const c=await f.store.get(`${f.base}/changes/port_port`);await f.inject(c.id,{source:'XLSX',provenance:{schemaVersion:1,batchId:'batch',fileName:'M3.xlsx',sheet:'Vaisseaux',row:2}});assert.equal((await f.check(3)).totals.invalid,1);assert.deepEqual((await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M3',ids:[]})).sheets.Ports,[]);assert.ok((await f.read('prepareCentralImport',f.owner,{campaignId:f.cid,workshop:'M3',fileName:'M3.xlsx',sheets:{}})).errors.length);
 });
 test(`${prefix} : import M1 conserve intégralement les définitions M3`,async()=>{
  const f=await centralSpaceFixture(makeStore);await f.saveSpace('route');const before=await f.store.get(`${f.base}/changes/route_route`),e=await f.read('exportCentralDraft',f.owner,{campaignId:f.cid,workshop:'M1',ids:[]});e.sheets.Objets=[centralItemRow];const input={campaignId:f.cid,workshop:'M1',fileName:'M1.xlsx',sheets:e.sheets},p=await f.read('prepareCentralImport',f.owner,input);await f.cmd('applyCentralImport',{...input,confirmation:p.confirmation,reason:'Import synthétique'});assert.deepEqual(await f.store.get(`${f.base}/changes/route_route`),before);assert.equal((await f.check(2)).totals.invalid,0);
 });
 test(`${prefix} : campagnes et instances de session isolées des références M3`,async()=>{
  const f=await centralSpaceFixture(makeStore),other=await f.create({creationId:randomUUID()});await f.saveSpace('port',{campaignId:other.campaignId,portId:'origin'});await f.store.runTransaction(async tx=>{tx.set(`sessions/${f.sid}/ports/destination`,{id:'destination',name:'Port joué'});tx.set(`sessions/${f.sid}/routes/route`,{id:'route',fuelCost:4,enabled:true});});const before=await f.store.list(`sessions/${f.sid}/routes`);await f.saveSpace('route');assert.equal((await f.view('M3')).diagnostics.filter(d=>d.code==='REFERENCE_MISSING').length,2);assert.deepEqual(await f.store.list(`sessions/${f.sid}/routes`),before);
 });
 test(`${prefix} : interruption atomique sans définition, historique ni reçu partiels`,async()=>{
  const base=makeStore();let fail=false;const store={get:base.get.bind(base),list:base.list.bind(base),runTransaction:cb=>base.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw new Error('INTERRUPTION');return r;})},f=await centralSpaceFixture(()=>store),input={requestId:randomUUID()};fail=true;await assert.rejects(f.saveSpace('route',input),/INTERRUPTION/);fail=false;assert.equal(await base.get(f.base),null);assert.deepEqual(await base.list(`${f.base}/history`),[]);await f.saveSpace('route',input);assert.equal((await f.view('M3')).history.length,1);
 });
 test(`${prefix} : cycle et révisions revalidés avant reçus, contrôle sans écriture`,async()=>{
  const f=await centralSpaceFixture(makeStore),input={requestId:randomUUID()};await f.saveSpace('port',input);const draft=await f.store.get(f.base),before=await f.store.list(`${f.base}/history`),report=await f.check(1);assert.equal((await f.check(1)).fingerprint,report.fingerprint);assert.deepEqual(await f.store.list(`${f.base}/history`),before);await assert.rejects(f.saveSpace('port',{portRevision:1}),{code:'STALE_REVISION'});await f.store.runTransaction(async tx=>tx.set(f.base,{...draft,status:'FROZEN'}));await assert.rejects(f.saveSpace('port',input),{code:'CENTRAL_DRAFT_UNAVAILABLE'});await f.store.runTransaction(async tx=>tx.set(f.base,draft));await f.saveSpace('port',{draftRevision:1,portRevision:1,port:{...centralSpaceEditable('port',(await f.view('M3')).changes[0].data),name:'Renommé'}});assert.notEqual((await f.check(2)).fingerprint,report.fingerprint);
 });
}
