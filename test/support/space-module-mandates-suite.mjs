import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {moduleItem} from './space-ship-module-catalog-suite.mjs';
import {standardShipModuleQuote} from '../../src/shared/space-ship-modules.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function moduleMandateFixture(makeStore,{code='MOD-01',riskId='SECURED',profileId='CARGO'}={}){
 const size=profileId==='TRANSPORT'?3:2,f=await soVoyagesFixture(makeStore,{riskId,profileId,prepareExtra:async(f,rev)=>{
  await f.cc('saveCentralItem',{itemId:'module',itemRevision:0,draftRevision:rev++,item:{...moduleItem,shipModule:{code,size}},reason:'Module calibré'});
  await f.cc('saveCentralOffer',{offerId:'module-offer',offerRevision:0,draftRevision:rev++,offer:{name:'Module atelier',shopId:'counter',itemId:'module',unitPrice:standardShipModuleQuote({code,size}).price,buybackPrice:null,conditions:'Non monté',gmNotes:''},reason:'Prix canonique'});
 }});
 const get=p=>f.store.get(`sessions/${f.sid}${p?'/'+p:''}`),edit=(p,fn)=>f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}${p?'/'+p:''}`;tx.set(path,fn(await tx.get(path)));});
 await edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,published:true,skills:[...c.abilityProfile.skills.filter(k=>k.id!=='MEC-03'),{id:'MEC-03',level:3}]}}));
 await edit(`accounts/${accountId(f.cid)}`,a=>({...a,balance:6000,revision:a.revision+1}));
 const supply={shopId:'counter',offerId:'module-offer',provisionId:randomUUID(),quantity:1,restricted:false,source:'Exemplaire réel',reason:'Préparer le montage'},q=await f.read('prepareShopProvision',supply,f.owner);await f.cmd('provisionShop',{...supply,confirmation:q.confirmation},f.owner);
 const sale=await f.buy({offerId:'module-offer',useProtected:false});await f.pickup(sale);
 const input={shipId:'ship',lotId:sale.purchasedLotId,technicianId:f.otherId,present:true,workshopConfirmed:true,source:'SECRET_ATELIER réellement disponible',reason:'Préparer la demande'};
 const preview=(patch={},actor=f.owner)=>f.read('prepareModuleMandateOffer',{...input,...patch},actor);
 const offer=async(patch={})=>f.cmd('offerModuleMandate',{...input,...patch,confirmation:(await preview(patch)).confirmation},f.owner);
 const jobs=async(actor=f.player)=>(await f.read(actor===f.owner?'moduleMandatesAdmin':'moduleMandates',{},actor)).jobs;
 const approve=async(r,patch={},actor=f.player)=>{const p={mandateId:r.id},q=await f.read('prepareModuleMandateApproval',p,actor);return f.cmd('approveModuleMandate',{...p,confirmation:q.confirmation,present:true,...patch},actor);};
 const close=async(r,action='cancelModuleMandate',actor=f.player)=>{const row=(await jobs(actor)).find(j=>j.id===r.id);return f.cmd(action,{mandateId:r.id,confirmation:row.confirmation,reason:'Décision explicite'},actor);};
 return {...f,get,edit,sale,input,preview,offer,jobs,approve,close};
}
export function moduleMandatesSuite(makeStore,prefix='Mandats modules SO'){
 test(`${prefix} : proposition et accord personnels sans réservation, dépense ou effet spatial`,async()=>{
  const f=await moduleMandateFixture(makeStore),ship=await f.ship(),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),wallets=await f.store.list(`sessions/${f.sid}/accounts`),pa=await f.points(),characters=await f.store.list(`sessions/${f.sid}/characters`);
  await f.preview();assert.deepEqual(await f.store.list(`sessions/${f.sid}/shipMaintenance`),[]);const r=await f.offer();assert.equal(r.status,'MODULE_OFFERED');await f.approve(r);
  assert.equal((await f.jobs())[0].status,'MODULE_APPROVED');assert.equal((await f.jobs())[0].valid,true);assert.deepEqual(await f.ship(),ship);assert.deepEqual(await f.get(`inventory/${lot.id}`),lot);assert.deepEqual(await f.points(),pa);assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),wallets);assert.deepEqual(await f.store.list(`sessions/${f.sid}/characters`),characters);
  assert.deepEqual((await f.read('spaceMaintenance')).jobs,[]);await assert.rejects(f.read('prepareSpaceMaintenance',{maintenanceId:r.id}),{code:'FORBIDDEN'});
 });
 test(`${prefix} : propriétaire distinct du pilote, MJ et Mécano sans droit d’approuver`,async()=>{
  const f=await moduleMandateFixture(makeStore);await f.edit('ships/ship',s=>({...s,pilotId:f.otherId,revision:s.revision+1}));const r=await f.offer();
  for(const actor of [f.owner,f.other])await assert.rejects(f.read('prepareModuleMandateApproval',{mandateId:r.id},actor),{code:'FORBIDDEN'});
  const own=await f.read('moduleMandates'),tech=await f.read('moduleMandates',{},f.other);assert.equal(own.jobs[0].owner,true);assert.equal(tech.jobs[0].owner,false);assert.doesNotMatch(JSON.stringify(tech),/SECRET_ATELIER|ownerVersion|technicianVersion|source|binding|assignedUid/);assert.equal(tech.ships,undefined);await f.approve(r);
 });
 test(`${prefix} : champs stricts, présence MJ et personnelle explicites`,async()=>{
  const f=await moduleMandateFixture(makeStore);for(const patch of [{ownerId:f.cid},{kind:'REMOVE'},{amount:0},{code:'MOD-06'},{install:{seconds:0}}])await assert.rejects(f.preview(patch),{code:'INVALID_ADMISSION'});
  await assert.rejects(f.read('prepareModuleMandateApproval',{}),{code:'INVALID_ID'});await assert.rejects(f.cmd('declineModuleMandate',{confirmation:'none',reason:'Sans identifiant'}),{code:'INVALID_ID'});
  for(const patch of [{present:false},{workshopConfirmed:false}])await assert.rejects(f.preview(patch),{code:'FIELD_PRESENCE_REQUIRED'});
  const r=await f.offer();await assert.rejects(f.approve(r,{present:false}),{code:'FIELD_PRESENCE_REQUIRED'});assert.equal((await f.jobs())[0].status,'MODULE_OFFERED');
 });
 test(`${prefix} : gabarit, emplacements, doublon et niveau MEC-03 contrôlés`,async()=>{
  const f=await moduleMandateFixture(makeStore,{code:'MOD-06'}),ship=await f.ship(),tech=await f.get(`characters/${f.otherId}`);
  await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[{id:'MEC-03',level:2}]}}));await assert.rejects(f.preview(),{code:'MODULE_TECH_REQUIRED'});await f.edit(`characters/${f.otherId}`,()=>tech);
  for(const patch of [{modules:[{code:'MOD-06'}]},{modules:[{code:'MOD-01'},{code:'MOD-02'}]},{soProfile:{...ship.soProfile,id:'FIGHTER'}}]){await f.edit('ships/ship',()=>({...ship,...patch}));await assert.rejects(f.preview(),{code:'INVALID_MODULE_CALIBRATION'});}await f.edit('ships/ship',()=>ship);
 });
 test(`${prefix} : module reçu ordinaire au propriétaire, état et port réels exigés`,async()=>{
  const f=await moduleMandateFixture(makeStore),lot=await f.get(`inventory/${f.sale.purchasedLotId}`),owner=await f.get(`characters/${f.cid}`),ship=await f.ship();
  for(const patch of [{holderId:'counter',location:{kind:'SHOP',id:'counter'}},{status:'FIELD_RESERVED'},{transferable:false},{ownerId:f.otherId}]){await f.edit(`inventory/${lot.id}`,()=>({...lot,...patch}));await assert.rejects(f.preview(),{code:'MODULE_LOT_UNAVAILABLE'});}await f.edit(`inventory/${lot.id}`,()=>lot);
  await f.edit(`characters/${f.cid}`,c=>({...c,spacePortId:'away'}));await assert.rejects(f.preview(),{code:'INVALID_MODULE_OWNER'});await f.edit(`characters/${f.cid}`,()=>owner);
  for(const patch of [{journey:{id:'flight'}},{convoy:{id:'convoy'}},{maintenanceId:'repair'},{operation:{id:'refuel'}}]){await f.edit('ships/ship',()=>({...ship,...patch}));await assert.rejects(f.preview(),{code:'SPACE_SHIP_BUSY'});}await f.edit('ships/ship',()=>ship);
 });
 test(`${prefix} : changement après proposition ferme l’approbation, refus personnel encore possible`,async()=>{
  const f=await moduleMandateFixture(makeStore),r=await f.offer();await f.edit(`inventory/${f.sale.purchasedLotId}`,l=>({...l,revision:l.revision+1}));assert.equal((await f.jobs())[0].valid,false);await assert.rejects(f.approve(r),{code:'MODULE_MANDATE_STALE'});
  const out=await f.close(r,'declineModuleMandate');assert.equal(out.status,'MODULE_DECLINED');assert.equal((await f.get(`inventory/${f.sale.purchasedLotId}`)).status,'AVAILABLE');
 });
 test(`${prefix} : réessai, course sur l’accord et refus d’une deuxième demande ouverte`,async()=>{
  const f=await moduleMandateFixture(makeStore),q=await f.preview(),p={...f.input,confirmation:q.confirmation,requestId:randomUUID()},r=await f.cmd('offerModuleMandate',p,f.owner);assert.deepEqual(await f.cmd('offerModuleMandate',p,f.owner),r);await assert.rejects(f.preview(),{code:'MODULE_MANDATE_OPEN'});
  const a=await f.read('prepareModuleMandateApproval',{mandateId:r.id}),input={mandateId:r.id,confirmation:a.confirmation,present:true,requestId:randomUUID()},inputs=[input,{...input,requestId:randomUUID()}],results=await Promise.allSettled(inputs.map(p=>f.cmd('approveModuleMandate',p)));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const winner=results.findIndex(x=>x.status==='fulfilled');assert.deepEqual(await f.cmd('approveModuleMandate',inputs[winner]),results[winner].value);assert.equal((await f.jobs()).length,1);
 });
 test(`${prefix} : révocation et perte de propriété vérifiées avant anciens reçus`,async()=>{
  const f=await moduleMandateFixture(makeStore),r=await f.offer(),q=await f.read('prepareModuleMandateApproval',{mandateId:r.id}),input={mandateId:r.id,confirmation:q.confirmation,present:true,requestId:randomUUID()};await f.cmd('approveModuleMandate',input);await f.cmd('revokeAccess',{uid:f.player.uid},f.owner);await assert.rejects(f.cmd('approveModuleMandate',input),{code:'FORBIDDEN'});
  const g=await moduleMandateFixture(makeStore),a=await g.offer();await g.edit('ships/ship',s=>({...s,ownerId:g.otherId}));await assert.rejects(g.read('prepareModuleMandateApproval',{mandateId:a.id}),{code:'FORBIDDEN'});assert.equal((await g.jobs()).length,0);
  const h=await moduleMandateFixture(makeStore),b=await h.offer(),preview=await h.read('prepareModuleMandateApproval',{mandateId:b.id}),p={mandateId:b.id,confirmation:preview.confirmation,present:true,requestId:randomUUID()};await h.cmd('approveModuleMandate',p);await h.edit(`characters/${h.cid}`,c=>({...c,survival:{dead:true}}));await assert.rejects(h.cmd('approveModuleMandate',p),{code:'MODULE_MANDATE_STALE'});
 });
 test(`${prefix} : annulation MJ après décès ou révocation, pause et STOP sans verrou résiduel`,async()=>{
  const f=await moduleMandateFixture(makeStore),r=await f.offer();await f.approve(r);await f.edit(`characters/${f.otherId}`,c=>({...c,survival:{dead:true}}));await f.stage('PAUSE');await f.cmd('stopSafety',{reason:'STOP'});await assert.rejects(f.close(r,'cancelModuleMandateAdmin',f.owner),{code:'SO_SAFETY_STOP'});const s=await f.read('session',{},f.owner);await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);assert.equal((await f.close(r,'cancelModuleMandateAdmin',f.owner)).status,'MODULE_CANCELLED');assert.equal((await f.ship()).maintenanceId,undefined);
 });
 test(`${prefix} : interruption ne laisse pas de demande, accord ou historique partiel`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail)throw Error('INTERRUPTION');return result;})};
  const f=await moduleMandateFixture(()=>store),q=await f.preview(),p={...f.input,confirmation:q.confirmation,requestId:randomUUID()};fail=true;await assert.rejects(f.cmd('offerModuleMandate',p,f.owner),/INTERRUPTION/);fail=false;assert.equal((await f.jobs()).length,0);const r=await f.cmd('offerModuleMandate',p,f.owner);fail=true;await assert.rejects(f.approve(r),/INTERRUPTION/);fail=false;assert.equal((await f.jobs())[0].status,'MODULE_OFFERED');await f.approve(r);
 });
 test(`${prefix} : accord conservé entre épisodes sans dotation, verrou ou démarrage automatique`,async()=>{
  const f=await moduleMandateFixture(makeStore),r=await f.offer();await f.approve(r);const record=await f.get(`shipMaintenance/${r.id}`),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get(`shipMaintenance/${r.id}`),record);assert.equal((await e.get('')).spaceOutlaws.moduleMandatesVersion,1);assert.equal((await e.get('ships/ship')).maintenanceId,undefined);assert.equal((await e.get(`inventory/${f.sale.purchasedLotId}`)).status,'AVAILABLE');
 });
 test(`${prefix} : ancien manifeste sans extension non enrichi, ancien reçu fermé sans marqueur`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),out=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${out.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  await f.store.runTransaction(async tx=>{const {towingWorkVersion,towingAttachmentVersion,towingFlightVersion,towingCombatVersion,towingOutageVersion,towingRecoveryVersion,hiddenCargoVersion,moduleFlightVersion,moduleRemovalVersion,moduleInstallationVersion,moduleWorkVersion,moduleMandatesVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.moduleMandatesVersion,undefined);await assert.rejects(f.read('moduleMandates'),{code:'SO_GAMEPLAY_NOT_OPEN'});
  const g=await moduleMandateFixture(makeStore),r=await g.offer(),q=await g.read('prepareModuleMandateApproval',{mandateId:r.id}),p={mandateId:r.id,confirmation:q.confirmation,present:true,requestId:randomUUID()};await g.cmd('approveModuleMandate',p);await g.edit('',s=>{const {hiddenCargoVersion,moduleFlightVersion,moduleRemovalVersion,moduleInstallationVersion,moduleWorkVersion,moduleMandatesVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(g.cmd('approveModuleMandate',p),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
}
