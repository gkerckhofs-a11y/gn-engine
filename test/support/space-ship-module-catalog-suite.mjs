import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
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
  for(const shipModule of [{code:'MOD-01',size:0},{code:'MOD-01',size:'2'},{code:'MOD-01',size:1.5},{code:'MOD-04',size:1},{code:'R04-01',size:2},{code:'MOD-01',size:2,price:1},{code:'MOD-01'},[],false,'MOD-01'])await assert.rejects(f.save({item:{...moduleItem,shipModule}}),{code:'INVALID_SHIP_MODULE'});
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
 test(`${prefix} : MOD-04 privé, cargo ou transport uniquement, sans instance ni volume ajouté`,async()=>{
  for(const size of [2,3]){const f=await centralFixture(makeStore),item={...moduleItem,name:'Soute clandestine',shipModule:{code:'MOD-04',size}},p={item,requestId:randomUUID()};const r=await f.save(p);assert.deepEqual(await f.save(p),r);assert.deepEqual((await f.view()).changes[0].data.shipModule,item.shipModule);for(const kind of ['ships','inventory','accounts','shipMaintenance','voyages'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[]);}
  const f=await centralFixture(makeStore);for(const patch of [{shipModule:{code:'MOD-04',size:1}},{shipModule:{code:'MOD-04',size:2,hiddenCargoCapacity:100}},{kind:'STACKABLE'},{consumable:true}])await assert.rejects(f.save({item:{...moduleItem,shipModule:{code:'MOD-04',size:2},...patch}}),{code:'INVALID_SHIP_MODULE'});assert.equal((await f.view()).draft.revision,0);
 });
 test(`${prefix} : MOD-04 publié au tarif canonique dans un nouveau manifeste compatible`,async()=>{
  const {soVoyagesFixture}=await import('./space-outlaws-voyages-suite.mjs'),f=await soVoyagesFixture(makeStore,{release:false});let rev=(await f.view()).draft.revision;
  await f.cc('saveCentralItem',{itemId:'hidden-module',itemRevision:0,draftRevision:rev++,item:{...moduleItem,name:'Soute clandestine',shipModule:{code:'MOD-04',size:2}},reason:'Préparation MOD-04'});
  await f.cc('saveCentralOffer',{offerId:'hidden-offer',offerRevision:0,draftRevision:rev++,offer:{name:'Soute clandestine préparatoire',shopId:'counter',itemId:'hidden-module',unitPrice:1000,buybackPrice:null,conditions:'À raccorder',gmNotes:''},reason:'Tarif canonique préparé'});
  const ready=await f.releasePreview();assert.deepEqual(ready.blockers,[]);const released=await f.release(ready);await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.hiddenCargoVersion,1);assert.equal((await f.store.get(`campaigns/${f.campaignId}/versions/${released.versionId}`)).hiddenCargoVersion,1);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ships`),[]);assert.ok(!(await f.store.list(`sessions/${f.sid}/inventory`)).some(l=>l.item.shipModule));
 });
 test(`${prefix} : MOD-04 injecté dans une session reste fermé au commerce et au mandat sans effet`,async()=>{
  const {moduleMandateFixture}=await import('./space-module-mandates-suite.mjs'),f=await moduleMandateFixture(makeStore);await f.edit('',s=>{const {hiddenCargoVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});const ship=await f.ship(),pa=await f.points(f.other),lot=await f.get(`inventory/${f.sale.purchasedLotId}`);
  await f.edit(`inventory/${lot.id}`,l=>({...l,item:{...l.item,shipModule:{code:'MOD-04',size:2}}}));await assert.rejects(f.preview(),{code:'INVALID_MODULE_CALIBRATION'});assert.deepEqual(await f.ship(),ship);assert.deepEqual(await f.points(f.other),pa);
  await f.edit('shops/counter/offers/module-offer',o=>({...o,unitPrice:1000,item:{...o.item,shipModule:{code:'MOD-04',size:2}}}));await assert.rejects(f.read('prepareShopPurchase',{shopId:'counter',offerId:'module-offer',quantity:1,useProtected:false}),{code:'INVALID_SHIP_MODULE_OFFER'});assert.deepEqual(await f.ship(),ship);assert.equal((await f.get(`inventory/${lot.id}`)).status,'AVAILABLE');
 });

 test(`${prefix} : MOD-05 privé, deux gabarits stricts et aucune instance créée`,async()=>{
  for(const size of [2,3]){const f=await centralFixture(makeStore),input={item:{...moduleItem,name:'Remorquage',shipModule:{code:'MOD-05',size}},requestId:randomUUID()};const r=await f.save(input);assert.deepEqual(await f.save(input),r);assert.deepEqual((await f.view()).changes[0].data.shipModule,input.item.shipModule);for(const kind of ['ships','inventory','accounts','shipMaintenance','voyages'])assert.deepEqual(await f.store.list(`sessions/${f.sid}/${kind}`),[]);}
  const f=await centralFixture(makeStore);for(const patch of [{shipModule:{code:'MOD-05',size:1}},{shipModule:{code:'MOD-05',size:2,towing:true}},{kind:'STACKABLE'},{consumable:true}])await assert.rejects(f.save({item:{...moduleItem,shipModule:{code:'MOD-05',size:2},...patch}}),{code:'INVALID_SHIP_MODULE'});assert.equal((await f.view()).draft.revision,0);
 });
 test(`${prefix} : MOD-05 et offre canonique ne publient pas un effet non raccordé`,async()=>{
  const {soVoyagesFixture}=await import('./space-outlaws-voyages-suite.mjs'),f=await soVoyagesFixture(makeStore,{release:false});let rev=(await f.view()).draft.revision;
  await f.cc('saveCentralItem',{itemId:'tow-module',itemRevision:0,draftRevision:rev++,item:{...moduleItem,name:'Remorquage',shipModule:{code:'MOD-05',size:2}},reason:'Préparer MOD-05'});
  await f.cc('saveCentralOffer',{offerId:'tow-offer',offerRevision:0,draftRevision:rev++,offer:{name:'Remorquage préparatoire',shopId:'counter',itemId:'tow-module',unitPrice:1000,buybackPrice:null,conditions:'À raccorder',gmNotes:''},reason:'Tarif canonique'});
  const blocked=await f.releasePreview();assert.equal(blocked.canRelease,false);assert.ok(blocked.blockers.some(b=>b.code==='SO_SHIP_MODULE_EFFECT_NOT_OPEN'&&b.entityId==='tow-module'));assert.ok(blocked.blockers.some(b=>b.entityId==='tow-offer'&&b.message.includes('fermé')));assert.ok(!blocked.blockers.some(b=>b.code==='SO_SHIP_MODULE_NOT_CONNECTED'&&b.entityId==='tow-module'));await assert.rejects(f.release(blocked),{code:'SO_RELEASE_BLOCKED'});assert.deepEqual(await f.store.list(`campaigns/${f.campaignId}/versions`),[]);
  await f.cc('archiveCentralOffer',{offerId:'tow-offer',offerRevision:1,draftRevision:rev++,reason:'Garder hors version'});await f.cc('archiveCentralItem',{itemId:'tow-module',itemRevision:1,draftRevision:rev++,reason:'Garder hors version'});
  const ready=await f.releasePreview();assert.deepEqual(ready.blockers,[]);await f.release(ready);await f.birth(await f.birthPreview());const session=await f.store.get(`sessions/${f.sid}`);assert.equal(session.spaceOutlaws.towingVersion,undefined);assert.equal(session.spaceOutlaws.hiddenCargoVersion,1);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ships`),[]);assert.ok(!(await f.store.list(`sessions/${f.sid}/inventory`)).some(l=>l.item.shipModule?.code==='MOD-05'));
 });
 test(`${prefix} : MOD-05 injecté reste fermé au commerce, mandat et vol sans mutation`,async()=>{
  const {moduleMandateFixture}=await import('./space-module-mandates-suite.mjs'),f=await moduleMandateFixture(makeStore),ship=await f.ship(),pa=await f.points(f.other),lot=await f.get(`inventory/${f.sale.purchasedLotId}`);
  await f.edit(`inventory/${lot.id}`,l=>({...l,item:{...l.item,shipModule:{code:'MOD-05',size:2}}}));await assert.rejects(f.preview(),{code:'INVALID_MODULE_CALIBRATION'});
  await f.edit('shops/counter/offers/module-offer',o=>({...o,unitPrice:1000,item:{...o.item,shipModule:{code:'MOD-05',size:2}}}));await assert.rejects(f.read('prepareShopPurchase',{shopId:'counter',offerId:'module-offer',quantity:1,useProtected:false}),{code:'INVALID_SHIP_MODULE_OFFER'});assert.deepEqual(await f.ship(),ship);assert.deepEqual(await f.points(f.other),pa);assert.equal((await f.get(`inventory/${lot.id}`)).status,'AVAILABLE');
  await f.edit('ships/ship',v=>({...v,moduleInstallationVersion:1,modules:[{lotId:lot.id,code:'MOD-05',size:2,status:'OPERATIONAL'}]}));const injected=await f.ship();await assert.rejects(f.startFlight(),{code:'INVALID_MODULE_CALIBRATION'});assert.deepEqual(await f.ship(),injected);assert.equal((await f.points()).reserved,0);
 });
 test(`${prefix} : manifeste contenant MOD-05 refusé même avec empreintes recalculées`,async()=>{
  for(const size of [1,2,3]){
  const {soVoyagesFixture}=await import('./space-outlaws-voyages-suite.mjs'),f=await soVoyagesFixture(makeStore,{release:false}),out=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${out.versionId}`;
  const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v,hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
  await f.store.runTransaction(async tx=>{const {manifestDigest,...h}=await tx.get(path),pages=await Promise.all(h.pages.map(p=>tx.get(`${path}/pages/${p.id}`)));let replaced=false;const next=pages.map(p=>({...p,entries:p.entries.map(e=>{if(replaced||e.data.type!=='item')return e;replaced=true;return {...e,data:{...e.data,data:{...e.data.data,kind:'INDIVIDUAL',consumable:false,shipModule:{code:'MOD-05',size}}}};})}));assert.equal(replaced,true);h.pages=h.pages.map((p,i)=>({...p,digest:hash(next[i])}));h.contentDigest=hash(next.flatMap(p=>p.entries));for(const p of next)tx.set(`${path}/pages/${p.id}`,p);tx.set(path,{...h,manifestDigest:hash(h)});});
  await assert.rejects(f.birthPreview(),{code:'SO_VERSION_INVALID'});assert.equal((await f.store.get(`sessions/${f.sid}`)).versionId,null);assert.deepEqual(await f.store.list(`sessions/${f.sid}/ships`),[]);
  }
 });

}
