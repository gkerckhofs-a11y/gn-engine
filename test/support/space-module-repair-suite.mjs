import {itemInput} from '../../src/core/inventory-state.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {moduleInstallationFixture} from './space-module-installation-suite.mjs';
import {shipModuleRepairPlan,standardShipModuleQuote} from '../../src/shared/space-ship-modules.mjs';
import {flightShip,eligibleFlightModules} from '../../src/core/space-module-flight.mjs';
import {gameTime} from '../../src/core/clock.mjs';
import {shopStockId} from '../../src/core/space-outlaws-shop-state.mjs';
import {maintenanceHtml} from '../../web/space-maintenance.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {moduleMandatesHtml,moduleMandateConfirmHtml} from '../../web/space-module-mandates.mjs';
import {moduleWorkConfirmHtml} from '../../web/space-module-work.mjs';

export async function moduleCycleWork(f,operation,{start=true}={}){
 const input={shipId:'ship',lotId:f.moduleLotId,technicianId:f.otherId,moduleOperation:operation,present:true,workshopConfirmed:true,source:'Atelier de recette',reason:'Conserver le même exemplaire et son état'},q=await f.read('prepareModuleMandateOffer',input,f.owner),r=await f.cmd('offerModuleMandate',{...input,confirmation:q.confirmation},f.owner);
 await f.approve(r);const p=await f.read('prepareModuleWorkStart',{mandateId:r.id},f.other);
 if(start)await f.cmd('startModuleWork',{mandateId:r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true},f.other);
 const finishPreview=()=>f.read(operation==='REMOVE'?'prepareModuleRemoval':'prepareModuleInstallation',{mandateId:r.id},f.other);
 const finish=async()=>{f.advance(p.install.seconds*1000);const x=await finishPreview();return f.cmd(operation==='REMOVE'?'finishModuleRemoval':'finishModuleInstallation',{mandateId:r.id,confirmation:x.confirmation,present:true,workshopConfirmed:true,performed:true},f.other);};
 const cancel=async()=>{const x=await f.read('moduleWorkAdmin',{mandateId:r.id},f.owner);return f.cmd('cancelModuleWorkAdmin',{mandateId:r.id,confirmation:x.confirmation,reason:'Interruption de recette'},f.owner);};
 return {r,q,p,finishPreview,finish,cancel};
}

export async function moduleRepairFixture(makeStore,{code='MOD-01',damage=true,...options}={}){
 const f=await moduleInstallationFixture(makeStore,{code,...options});f.ready();await f.finish();
 // Prepared parts and trained character are test scenario data; purchase, fitting,
 // incident, reservations and every repair below use the native commands.
 await f.store.runTransaction(async tx=>{const base=`sessions/${f.sid}`,s=await tx.get(base),sample=(await tx.list(`${base}/inventory`)).find(l=>l.holderId===f.cid&&l.status==='AVAILABLE'),old=await tx.get(`${base}/shops/counter/offers/module-offer`);
  const item={...itemInput({...centralTestItem,name:'Pièces compatibles de 25 Cr',referenceUnitValueCr:25,usage:'PERSONAL',publicationState:'PUBLISHED'},'repair-parts'),versionId:s.versionId,publicationState:'PUBLISHED',revision:1};tx.set(`${base}/items/${item.id}`,item);tx.set(`${base}/shops/counter/offers/repair-parts`,{...old,id:'repair-parts',itemId:item.id,item,name:item.name,unitPrice:25,revision:1});tx.set(`${base}/inventory/personal-parts`,{...sample,id:'personal-parts',item,quantity:50,revision:1,status:'AVAILABLE',ownerId:f.cid,holderId:f.cid,ownerType:'CHARACTER',location:{kind:'CHARACTER',id:f.cid},transferable:true,origin:{kind:'TEST_PREPARED_STOCK'}});
 });
 await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills.filter(k=>k.id!=='MEC-02'),{id:'MEC-02',level:2}]}}));
 const provision={shopId:'counter',offerId:'repair-parts',quantity:100,provisionId:randomUUID(),restricted:false,source:'Pièces présentes dans le scénario de test',reason:'Atelier de réparation'},p=await f.read('prepareShopProvision',provision,f.owner);await f.cmd('provisionShop',{...provision,confirmation:p.confirmation},f.owner);
 const moduleLotId=f.sale.purchasedLotId,damageModule=async(actor=f.owner)=>f.cmd('damageShipModule',{shipId:'ship',moduleLotId,revision:(await f.ship()).revision,reason:'Avarie matérielle jouée'},actor);if(damage)await damageModule();
 const input=patch=>({shipId:'ship',moduleLotId,payerId:f.cid,technicianId:f.otherId,shopId:'counter',offerId:'repair-parts',kind:'MODULE',points:1,present:true,workshopConfirmed:true,source:'Atelier et pièces compatibles présents',reason:'Réparer cette avarie',...patch});
 const preview=patch=>f.read('prepareSpaceMaintenanceOffer',input(patch),f.owner),offer=async patch=>f.cmd('offerSpaceMaintenance',{...input(patch),confirmation:(await preview(patch)).confirmation},f.owner);
 const job=async(r,actor=f.player)=>(await f.read(actor===f.owner?'spaceMaintenanceAdmin':'spaceMaintenance',{},actor)).jobs.find(j=>j.id===r.id);
 const maintain=async(action,r,patch={},actor=f.player)=>{const q=action==='acceptSpaceMaintenance'?await f.read('prepareSpaceMaintenance',{maintenanceId:r.id},actor):await job(r,actor);return f.cmd(action,{maintenanceId:r.id,confirmation:q.confirmation,...patch},actor);};
 const accept=r=>maintain('acceptSpaceMaintenance',r,{present:true}),start=r=>maintain('startSpaceMaintenance',r,{present:true},f.other),finish=async(r,actor=f.other)=>{f.advance(300000);return maintain('finishSpaceMaintenancePoint',r,{performed:true},actor);};
 return {...f,wallet:()=>f.get(`accounts/${accountId(f.cid)}`),moduleLotId,damageModule,input,preview,offer,job,maintain,accept,startRepair:start,finishRepair:finish};
}
export function moduleRepairSuite(makeStore,prefix='Réparation durable des modules de vaisseau'){
 test(`${prefix} : cycle durable des six modules, retrait et remontage sans réparation gratuite`,async()=>{
  for(const code of ['MOD-01','MOD-02','MOD-03','MOD-04','MOD-05','MOD-06']){
   const f=await moduleRepairFixture(makeStore,{code}),before=await f.ship(),lot=await f.get(`inventory/${f.moduleLotId}`),parts=(await f.get('inventory/personal-parts')).quantity;
   const out=await moduleCycleWork(f,'REMOVE');assert.equal(out.q.moduleState.status,'DAMAGED');assert.match(moduleMandateConfirmHtml('prepareModuleMandateOffer',out.q,{}),/conserve la panne/);assert.match(moduleMandatesHtml(await f.read('moduleMandatesAdmin',{},f.owner)),/endommagé/);
   await out.finish();let l=await f.get(`inventory/${f.moduleLotId}`);assert.equal(l.status,'AVAILABLE');assert.equal(l.moduleState.status,'DAMAGED');assert.equal(l.moduleState.size,2);assert.equal(l.moduleState.code,code);assert.equal(l.ownerId,lot.ownerId);assert.deepEqual(l.item,lot.item);assert.equal((await f.ship()).modules.length,0);
   const install=await moduleCycleWork(f,'INSTALL');f.advance(install.p.install.seconds*1000);assert.match(moduleWorkConfirmHtml('prepareModuleInstallation',await install.finishPreview(),{}),/conserve la panne/);await install.finish();
   const mounted=await f.ship();assert.equal(mounted.modules[0].status,'DAMAGED');assert.equal(mounted.modules[0].lotId,lot.id);assert.equal(mounted.hull,before.hull);assert.equal(mounted.shield,before.shield);assert.deepEqual(mounted.soProfile,before.soProfile);assert.equal((await f.get('inventory/personal-parts')).quantity,parts);assert.equal((await f.points(f.other)).available,2);
   const repair=await f.offer({supplyLotId:'personal-parts'});await f.accept(repair);await f.startRepair(repair);await f.finishRepair(repair);assert.equal((await f.ship()).modules[0].status,'OPERATIONAL');assert.equal((await f.ship()).hull,before.hull);assert.equal((await f.ship()).shield,before.shield);
   await (await moduleCycleWork(f,'REMOVE')).finish();assert.equal((await f.get(`inventory/${lot.id}`)).moduleState.status,'OPERATIONAL');assert.equal((await f.points(f.other)).available,0);
  }
 });
 test(`${prefix} : cycle durable interrompu, état et réservations conservés au retrait comme au remontage`,async()=>{
  const f=await moduleRepairFixture(makeStore),before=await f.ship(),pa=await f.points(f.other),a=await moduleCycleWork(f,'REMOVE');await a.cancel();assert.deepEqual((await f.ship()).modules,before.modules);assert.equal((await f.get(`inventory/${f.moduleLotId}`)).status,'INSTALLED');assert.equal((await f.points(f.other)).available,pa.available);
  await (await moduleCycleWork(f,'REMOVE')).finish();const stored=await f.get(`inventory/${f.moduleLotId}`),b=await moduleCycleWork(f,'INSTALL');await b.cancel();const after=await f.get(`inventory/${f.moduleLotId}`);assert.deepEqual(after.moduleState,stored.moduleState);assert.deepEqual(after.location,stored.location);assert.equal(after.status,'AVAILABLE');assert.equal((await f.ship()).modules.length,0);assert.equal((await f.points(f.other)).reserved,0);
 });
 test(`${prefix} : cycle durable périmé, calibration et état revérifiés avant la finalisation`,async()=>{
  const f=await moduleRepairFixture(makeStore),a=await moduleCycleWork(f,'REMOVE');await f.edit('ships/ship',sh=>({...sh,modules:sh.modules.map(m=>({...m,status:'OPERATIONAL'}))}));f.advance(a.p.install.seconds*1000);await assert.rejects(a.finishPreview(),{code:'MODULE_MANDATE_STALE'});await a.cancel();
  await f.damageModule();await (await moduleCycleWork(f,'REMOVE')).finish();const b=await moduleCycleWork(f,'INSTALL');await f.edit(`inventory/${f.moduleLotId}`,l=>({...l,moduleState:{...l.moduleState,status:'OPERATIONAL'}}));f.advance(b.p.install.seconds*1000);await assert.rejects(b.finishPreview(),{code:'MODULE_MANDATE_STALE'});await b.cancel();assert.equal((await f.ship()).modules.length,0);
  await f.edit(`inventory/${f.moduleLotId}`,l=>({...l,moduleState:{...l.moduleState,size:3}}));await assert.rejects(moduleCycleWork(f,'INSTALL'),{code:'INVALID_MODULE_CALIBRATION'});
 });
 test(`${prefix} : cycle durable, ancien périmètre et sabotage en cours ne permettent aucun contournement`,async()=>{
  const f=await moduleRepairFixture(makeStore);await f.edit(`inventory/${f.moduleLotId}`,l=>({...l,sabotageActionId:'pending-sabotage'}));await assert.rejects(moduleCycleWork(f,'REMOVE'),{code:'MODULE_LOT_UNAVAILABLE'});
  await f.edit(`inventory/${f.moduleLotId}`,l=>({...l,sabotageActionId:null}));await (await moduleCycleWork(f,'REMOVE')).finish();await f.edit('',s=>{const {moduleRepairVersion,...spaceOutlaws}=s.spaceOutlaws;return {...s,spaceOutlaws};});await assert.rejects(moduleCycleWork(f,'INSTALL'),{code:'INVALID_MODULE_CALIBRATION'});assert.equal((await f.get(`inventory/${f.moduleLotId}`)).moduleState.status,'DAMAGED');assert.equal((await f.ship()).modules.length,0);
 });
 test(`${prefix} : six références, pièces exactes, même module et aucun point restauré`,async()=>{
  for(const code of ['MOD-01','MOD-02','MOD-03','MOD-04','MOD-05','MOD-06']){
   const f=await moduleRepairFixture(makeStore,{code}),before=await f.ship(),lot=await f.get(`inventory/${f.moduleLotId}`),pa=await f.points(f.other),q=await f.preview();assert.equal(q.unitCost,standardShipModuleQuote({code,size:2}).price/4);assert.equal(q.secondsPerPoint,300);assert.equal(q.moduleLevel,standardShipModuleQuote({code,size:2}).install.level);
   const r=await f.offer();await f.accept(r);await f.startRepair(r);await assert.rejects(f.maintain('finishSpaceMaintenancePoint',r,{performed:true},f.other),{code:'MAINTENANCE_NOT_READY'});await f.finishRepair(r);const sh=await f.ship(),after=await f.get(`inventory/${f.moduleLotId}`);assert.equal(sh.modules[0].status,'OPERATIONAL');assert.equal(sh.hull,before.hull);assert.equal(sh.shield,before.shield);assert.equal(sh.revisionRequired,before.revisionRequired);assert.equal(after.id,lot.id);assert.equal(after.ownerId,lot.ownerId);assert.deepEqual(after.location,lot.location);assert.equal((await f.points(f.other)).available,pa.available-1);assert.equal((await f.get(`inventory/${shopStockId('repair-parts')}`)).quantity,100-q.unitCost/25);
  }
 });
 test(`${prefix} : pièces personnelles non refacturées et confirmation idempotente`,async()=>{
  const f=await moduleRepairFixture(makeStore),wallet=await f.wallet(),r=await f.offer({supplyLotId:'personal-parts'});await f.accept(r);await f.startRepair(r);f.advance(300000);const j=await f.job(r,f.other),p={maintenanceId:r.id,confirmation:j.confirmation,performed:true,requestId:randomUUID()},result=await f.cmd('finishSpaceMaintenancePoint',p,f.other);assert.deepEqual(await f.cmd('finishSpaceMaintenancePoint',p,f.other),result);assert.deepEqual(await f.wallet(),wallet);assert.equal((await f.get('inventory/personal-parts')).quantity,50-j.unitCost/25);assert.equal((await f.get(`inventory/${shopStockId('repair-parts')}`)).quantity,100);assert.equal((await f.read('spaceMaintenanceAdmin',{},f.owner)).personalSupplies.find(l=>l.lotId==='personal-parts').unitPrice,25);await f.edit('ships/ship',sh=>({...sh,ownerId:f.otherId}));await assert.rejects(f.cmd('finishSpaceMaintenancePoint',p,f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : prestation PNJ distincte, stocks et annulation sans frais ni réparation partielle`,async()=>{
  const f=await moduleRepairFixture(makeStore),wallet=await f.wallet(),pa=await f.points();let r=await f.offer({technicianId:null,supplyLotId:'personal-parts'});await f.accept(r);await f.maintain('cancelSpaceMaintenance',r,{reason:'Interruption avant fin'});assert.deepEqual(await f.wallet(),{...wallet,revision:(await f.wallet()).revision});assert.equal((await f.get('inventory/personal-parts')).quantity,50);assert.equal((await f.ship()).modules[0].status,'DAMAGED');r=await f.offer({technicianId:null,supplyLotId:'personal-parts'});await f.accept(r);const j=await f.job(r);assert.equal(j.fee,(await f.ship()).soProfile.referencePrice*0.005);await f.finishRepair(r,f.player);assert.equal((await f.wallet()).balance,wallet.balance-j.fee);assert.equal((await f.wallet()).protectedCredits,wallet.protectedCredits);assert.equal((await f.points()).available,pa.available);assert.equal((await f.points()).reserved,pa.reserved);
 });
 test(`${prefix} : droits, qualification MEC-03, atelier, ancien manifeste et version périmée`,async()=>{
  const f=await moduleRepairFixture(makeStore,{code:'MOD-03'});await assert.rejects(f.damageModule(f.player),{code:'FORBIDDEN'});await assert.rejects(f.preview({workshopConfirmed:false}),{code:'FIELD_PRESENCE_REQUIRED'});await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='MEC-03'?{...k,level:2}:k)}}));await assert.rejects(f.preview(),{code:'MAINTENANCE_TECH_REQUIRED'});await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:c.abilityProfile.skills.map(k=>k.id==='MEC-03'?{...k,level:3}:k)}}));const r=await f.offer();await f.accept(r);await f.startRepair(r);await f.edit(`inventory/${f.moduleLotId}`,l=>({...l,revision:l.revision+1}));await assert.rejects(f.finishRepair(r),{code:'FIELD_STATE_CHANGED'});await f.maintain('cancelSpaceMaintenance',r,{reason:'Pièce modifiée'},f.other);assert.equal((await f.points(f.other)).reserved,0);await f.edit('',s=>{const {moduleRepairVersion,...flags}=s.spaceOutlaws;return {...s,spaceOutlaws:flags};});await assert.rejects(f.preview(),{code:'INVALID_MODULE_CALIBRATION'});
 });
 test(`${prefix} : réservation concurrente et annulation MJ après révocation`,async()=>{
  const f=await moduleRepairFixture(makeStore),r=await f.offer({supplyLotId:'personal-parts'}),q=await f.read('prepareSpaceMaintenance',{maintenanceId:r.id}),p={maintenanceId:r.id,confirmation:q.confirmation,present:true};const results=await Promise.allSettled([f.cmd('acceptSpaceMaintenance',p),f.cmd('acceptSpaceMaintenance',p)]);assert.equal(results.filter(x=>x.status==='fulfilled').length,1);await f.startRepair(r);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.finishRepair(r),{code:'FORBIDDEN'});await f.maintain('cancelSpaceMaintenanceAdmin',r,{reason:'Accès du technicien révoqué'},f.owner);assert.equal((await f.get('inventory/personal-parts')).quantity,50);assert.equal((await f.get(`characters/${f.otherId}/resources/actionPoints`)).reserved,0);assert.equal((await f.ship()).modules[0].status,'DAMAGED');
 });
 test(`${prefix} : panne durable et neutralisation temporaire indépendantes, continuité d’épisode`,async()=>{
  const f=await moduleRepairFixture(makeStore),s=await f.get(''),time=gameTime(s.clock,(await f.get(`shipMaintenance/${f.r.id}`)).closedAt);await f.edit('ships/ship',sh=>({...sh,moduleNeutralizations:[{lotId:f.moduleLotId,code:'MOD-01',untilGameMs:time+900000,startedAtGameMs:time}]}));const r=await f.offer();await f.accept(r);await f.startRepair(r);await f.finishRepair(r);let sh=await f.ship();assert.equal(sh.modules[0].status,'OPERATIONAL');assert.equal(eligibleFlightModules(await f.get(''),sh,time+300000).length,0);assert.equal(sh.soProfile.shieldMax,2);f.advance(600000);assert.equal(flightShip(await f.get(''),sh,time+900000).soProfile.shieldMax,3);await f.damageModule();sh=await f.ship();assert.equal(flightShip(await f.get(''),sh,time+1800000).soProfile.shieldMax,2);const e=await episodeHarness(f);await e.stage('PAUSE');await e.close();await e.resume(await e.begin());assert.equal((await e.get('ships/ship')).modules[0].status,'DAMAGED');assert.equal((await e.get('')).spaceOutlaws.moduleRepairVersion,1);
 });
 test(`${prefix} : régie expose devis et panne, joueur privé sans commandes de dommage`,async()=>{
  const f=await moduleRepairFixture(makeStore),d=await f.read('spaceMaintenanceAdmin',{},f.owner),html=maintenanceHtml(d);assert.match(html,/Atelier équipé disponible à quai/);assert.match(html,/moduleLotId/);assert.equal(d.repairModules[0].unitCost,shipModuleRepairPlan((await f.ship()).modules[0]).unitCost);const player=await f.read('spaceMaintenance');assert.equal(player.repairModules,undefined);assert.doesNotMatch(maintenanceHtml(player),/damageShipModule|workshopConfirmed/);
 });
}
