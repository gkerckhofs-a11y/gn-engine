import {hiddenCargoRequest} from '../../web/space-hidden-cargo.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {moduleFlightFixture,equippedConvoy} from './space-module-flight-suite.mjs';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {moduleItem} from './space-ship-module-catalog-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';
import {hiddenCargoCapacity} from '../../src/core/space-hidden-cargo.mjs';
import {guardSpaceOutlawsEntry} from '../../src/core/space-outlaws-entry-guard.mjs';

// Full native path: published definition, real purchase, pickup and timed mounting.
export async function nativeHiddenFlightFixture(makeStore,{profileId='CARGO',convoy=false}={}){
 const f=await (convoy?equippedConvoy(makeStore,{code:'MOD-04',form:false}):moduleFlightFixture(makeStore,{code:'MOD-04',profileId})),fuel=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant'),ids=[];
 for(const quantity of [3,2]){const p={lotId:fuel.id,quantity,destination:{kind:'HOLD',id:'ship'}},q=await f.read('prepareCargoTransfer',p),r=await f.cmd('startCargoTransfer',{...p,confirmation:q.confirmation,present:true});f.advance(180000);const done=await f.read('cargoTransfer',{transferId:r.id});await f.cmd('receiveCargoTransfer',{transferId:r.id,confirmation:done.confirmation,received:true});ids.push(r.lotId);}
 const conceal=async(conceal=true,lotId=ids[0])=>{const p={shipId:'ship',lotId,conceal},q=await f.read('prepareCargoConcealment',p);return f.cmd('setCargoConcealment',{...p,confirmation:q.confirmation,present:true});};await conceal();if(convoy)await f.formConvoy();
 const arrive=async()=>{f.advance(300000);await f.cmd('arriveShip',{shipId:'ship',confirmation:(await f.navigation()).confirmation});await f.edit(`characters/${f.otherId}`,c=>({...c,spacePortId:'away'}));f.setDice([]);f.setDie(6);};
 const grant=async(level=5)=>{const c=await f.get(`characters/${f.otherId}`);return f.cmd('setCustomsAuthority',{characterId:f.otherId,level,portId:'away',authorityRevision:c.customsAuthorization?.revision??0,reason:'Habilitation organisation'},f.owner);};
 const startInspection=async(kind='DEEP')=>{const p={shipId:'ship',kind},q=await f.read('prepareCustomsInspection',p,f.other);return f.cmd('startCustomsInspection',{...p,confirmation:q.confirmation,present:true},f.other);};
 const finishInspection=async r=>{const p={inspectionId:r.id},q=await f.read('customsInspection',p,f.other);return f.cmd('finishCustomsInspection',{...p,confirmation:q.confirmation,present:true,performed:true},f.other);};
 return {...f,lotId:ids[0],extraLotId:ids[1],moduleId:f.sale.purchasedLotId,conceal,arrive,grant,startInspection,finishInspection};
}
// Component fixture: native session and physical cargo transfer, but MOD-04
// is synthetic; version-marker guards are exercised separately. This is NOT a playable mount test.
export async function hiddenCargoFixture(makeStore,{profileId='CARGO',quantity=5}={}){
 const f=await soVoyagesFixture(makeStore,{profileId}),base=`sessions/${f.sid}`;
 const get=p=>f.store.get(base+(p?'/'+p:'')),edit=(p,fn)=>f.store.runTransaction(async tx=>{const path=base+(p?'/'+p:'');tx.set(path,fn(await tx.get(path)));});
 const fuel=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant'),lotIds=[];
 for(let remaining=quantity;remaining>0;remaining-=5){const input={lotId:fuel.id,quantity:Math.min(remaining,5),destination:{kind:'HOLD',id:'ship'}},p=await f.read('prepareCargoTransfer',input),transfer=await f.cmd('startCargoTransfer',{...input,confirmation:p.confirmation,present:true});f.advance(180000);const q=await f.read('cargoTransfer',{transferId:transfer.id});await f.cmd('receiveCargoTransfer',{transferId:transfer.id,confirmation:q.confirmation,received:true});lotIds.push(transfer.lotId);}
 const transfer={lotId:lotIds[0]};
 const sh=await f.ship(),module={lotId:'synthetic-hidden-module',code:'MOD-04',size:sh.soProfile.size,status:'OPERATIONAL'};
 await edit('',s=>({...s,spaceOutlaws:{...s.spaceOutlaws,hiddenCargoVersion:1}}));await edit('ships/ship',s=>({...s,modules:[module]}));
 await edit(`inventory/${module.lotId}`,()=>({id:module.lotId,quantity:1,revision:1,status:'INSTALLED',ownerType:'CHARACTER',ownerId:f.cid,holderId:'ship',location:{kind:'SHIP_MODULE',id:'ship'},transferable:true,resellable:true,item:{...moduleItem,shipModule:{code:'MOD-04',size:module.size}}}));
 const grant=async(level=1,characterId=f.otherId)=>{const c=await get(`characters/${characterId}`);return f.cmd('setCustomsAuthority',{characterId,level,portId:'home',authorityRevision:c.customsAuthorization?.revision??0,reason:'Habilitation organisation'},f.owner);};
 const conceal=async(conceal=true,lotId=transfer.lotId,patch={})=>{const i={shipId:'ship',lotId,conceal},q=await f.read('prepareCargoConcealment',i);return f.cmd('setCargoConcealment',{...i,confirmation:q.confirmation,present:true,...patch});};
 const start=async(kind='DEEP',actor=f.other,agentId)=>{const admin=actor===f.owner,i={shipId:'ship',kind,...(admin?{agentId}:{})},q=await f.read(admin?'prepareCustomsInspectionAdmin':'prepareCustomsInspection',i,actor);return f.cmd(admin?'startCustomsInspectionAdmin':'startCustomsInspection',{...i,confirmation:q.confirmation,present:true},actor);};
 const inspect=(r,actor=f.other)=>f.read(actor===f.owner?'customsInspectionAdmin':'customsInspection',{inspectionId:r.id},actor);
 const close=async(r,{cancel=false,actor=f.other,...patch}={})=>{const q=await inspect(r,actor),action=(cancel?'cancel':'finish')+'CustomsInspection'+(actor===f.owner?'Admin':'');return f.cmd(action,{inspectionId:r.id,confirmation:q.confirmation,...(cancel?{reason:'Interruption explicite'}:{present:true,performed:true}),...patch},actor);};
 return {...f,get,edit,grant,conceal,start,inspect,close,lotId:transfer.lotId,lotIds,moduleId:module.lotId};
}
// Removal remains behind the unpublished component marker; no synthetic purchase.
export async function hiddenRemovalFixture(makeStore,options={}){
 const f=await hiddenCargoFixture(makeStore,options);await f.edit('ships/ship',s=>({...s,moduleInstallationVersion:1}));
 await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills.filter(k=>k.id!=='MEC-03'),{id:'MEC-03',level:2}]}}));
 const input={moduleOperation:'REMOVE',shipId:'ship',lotId:f.moduleId,technicianId:f.otherId,present:true,workshopConfirmed:true,source:'Atelier disponible, compartiment vidé physiquement',reason:'Retrait du même exemplaire'},previewOffer=(patch={})=>f.read('prepareModuleMandateOffer',{...input,...patch},f.owner);
 const offer=async()=>{const q=await previewOffer();return f.cmd('offerModuleMandate',{...input,confirmation:q.confirmation},f.owner);};
 const approve=async r=>{const q=await f.read('prepareModuleMandateApproval',{mandateId:r.id});return f.cmd('approveModuleMandate',{mandateId:r.id,confirmation:q.confirmation,present:true});};
 const start=async r=>{const q=await f.read('prepareModuleWorkStart',{mandateId:r.id},f.other);return f.cmd('startModuleWork',{mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true},f.other);};
 const preview=(r,actor=f.other)=>f.read('prepareModuleRemoval',{mandateId:r.id},actor);
 const finish=async(r,patch={},actor=f.other)=>{const q=await preview(r,actor);return f.cmd('finishModuleRemoval',{mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,performed:true,...patch},actor);};
 const cancel=async(r,actor=f.other)=>{const q=await f.read(actor===f.owner?'moduleWorkAdmin':'moduleWork',{mandateId:r.id},actor);return f.cmd(actor===f.owner?'cancelModuleWorkAdmin':'cancelModuleWork',{mandateId:r.id,confirmation:q.confirmation,reason:'Interruption du retrait'},actor);};
 return {...f,removalInput:input,previewRemovalOffer:previewOffer,offerRemoval:offer,approveRemoval:approve,startRemoval:start,previewRemoval:preview,finishRemoval:finish,cancelRemoval:cancel};
}
export function hiddenCargoSuite(makeStore,prefix='Fret caché et MOD-04 SO'){

 test(`${prefix} : devis LIC-01/02/03 en lecture seule, sans délivrance ni débit`,async()=>{
  const f=await hiddenCargoFixture(makeStore);
  const accounts=await f.store.list(`sessions/${f.sid}/accounts`);
  const auditBefore=await f.store.list(`sessions/${f.sid}/audit`);
  const first=await f.read('customsLicenseQuote',{code:'LIC-01'},f.owner);
  assert.equal(first.exactFeeCr,'100');
  assert.equal(first.issued,false);
  const min=await f.read('customsLicenseQuote',{code:'LIC-02',referenceValue:2000},f.owner);
  assert.equal(min.exactFeeCr,'50');
  assert.equal(min.minimumCr,50);
  const fractional=await f.read('customsLicenseQuote',{code:'LIC-02',referenceValue:2501},f.owner);
  assert.equal(fractional.exactFeeCr,'50.02');
  assert.equal(fractional.scope,'Cargaison et voyage autorisés');
  const exceptional=await f.read('customsLicenseQuote',{code:'LIC-03'},f.owner);
  assert.equal(exceptional.exactFeeCr,null);
  assert.equal(exceptional.issued,false);
  assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),accounts);
  assert.deepEqual(await f.store.list(`sessions/${f.sid}/audit`),auditBefore);
  assert.deepEqual(await f.store.list(`sessions/${f.sid}/customsLicenses`),[]);
 });
 test(`${prefix} : devis réservé au MJ, refuse barèmes ou valeurs imposés par le joueur`,async()=>{
  const f=await hiddenCargoFixture(makeStore);
  await f.grant(5);
  await assert.rejects(f.read('customsLicenseQuote',{code:'LIC-01'},f.other),{code:'FORBIDDEN'});
  await assert.rejects(f.read('customsLicenseQuote',{code:'LIC-01'},f.player),{code:'FORBIDDEN'});
  for(const code of ['LIC-04','FAKE','']){
   await assert.rejects(f.read('customsLicenseQuote',{code},f.owner),{code:'SO_CUSTOMS_LICENSE_KIND'});
  }
  for(const referenceValue of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'2000',null]){
   await assert.rejects(f.read('customsLicenseQuote',{code:'LIC-02',referenceValue},f.owner),
     {code:'SO_CUSTOMS_LICENSE_VALUE'});
  }
  await assert.rejects(f.read('customsLicenseQuote',{code:'LIC-02',referenceValue:2000,fee:0},f.owner),
    {code:'INVALID_ADMISSION'});
  const current=await f.get('');
  await f.edit('',s=>{const {hiddenCargoVersion,...older}=s.spaceOutlaws;return {...s,spaceOutlaws:older};});
  await assert.rejects(f.read('customsLicenseQuote',{code:'LIC-01'},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await f.edit('',()=>current);
 });
 test(`${prefix} : capacité serveur limitée, comptes, connaissances, contrats et marqueur interdits`,()=>{
  const s={id:'session',spaceOutlaws:{actionsVersion:1,hiddenCargoVersion:1}},scope=new Set(['HIDDEN_CARGO']);
  for(const path of ['ships/ship','inventory/lot','inventory/lot/history/event','characters/agent','characters/agent/resources/actionPoints','shipMaintenance/job','logisticsHistory/event'])assert.equal(guardSpaceOutlawsEntry(s,new Map([[`sessions/session/${path}`,{}]]),false,scope),true);
  for(const path of ['accounts/account','ledger/event','characters/agent/knowledge/secret','contracts/contract','registrations/person'])assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([[`sessions/session/${path}`,{}]]),false,scope),{code:'SO_GAMEPLAY_NOT_OPEN'});
  assert.throws(()=>guardSpaceOutlawsEntry(s,new Map([['sessions/session',s]]),false,scope),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : marqueur absent fermé, champs stricts et habilitation MJ indépendante des classes`,async()=>{
  const f=await hiddenCargoFixture(makeStore),s=await f.get('');await f.edit('',s=>{const {hiddenCargoVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});
  await assert.rejects(f.read('hiddenCargo',{shipId:'ship'}),{code:'SO_GAMEPLAY_NOT_OPEN'});await f.edit('',()=>s);
  await assert.rejects(f.read('customsDesk',{},f.other),{code:'FORBIDDEN'});await assert.rejects(f.cmd('setCustomsAuthority',{characterId:f.otherId,level:5,portId:'home',authorityRevision:0,reason:'Auto habilitation'},f.other),{code:'FORBIDDEN'});
  for(const level of [-1,6,1.5,'2'])await assert.rejects(f.grant(level));await f.grant(1);assert.equal((await f.read('customsDesk',{},f.other)).level,1);
  await assert.rejects(f.read('prepareCustomsInspection',{shipId:'ship',kind:'DEEP',level:5},f.other),{code:'INVALID_ADMISSION'});
 });
 test(`${prefix} : cinq et dix unités dans le volume existant, même propriété et aucun crédit`,async()=>{
  for(const [profileId,quantity,capacity] of [['CARGO',5,20],['TRANSPORT',10,50]]){
   const f=await hiddenCargoFixture(makeStore,{profileId,quantity}),lot=await f.get(`inventory/${f.lotId}`),accounts=await f.store.list(`sessions/${f.sid}/accounts`),points=await f.points();for(const id of f.lotIds)await f.conceal(true,id);const v=await f.read('hiddenCargo',{shipId:'ship'});assert.equal(v.hiddenUsed,quantity);assert.equal(v.hiddenCapacity,quantity);assert.equal(v.ship.capacity,capacity);const after=await f.get(`inventory/${f.lotId}`);assert.equal(after.quantity,lot.quantity);assert.equal(after.ownerId,lot.ownerId);assert.deepEqual(after.location,lot.location);assert.deepEqual(await f.points(),points);assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),accounts);
  }
 });
 test(`${prefix} : dépassement, lot monté incohérent, pilote sans propriété et mauvaise escale refusés`,async()=>{
  const f=await hiddenCargoFixture(makeStore,{quantity:6});await f.conceal();await assert.rejects(f.conceal(true,f.lotIds[1]),{code:'HIDDEN_CARGO_FULL'});await f.conceal(false);
  await assert.rejects(f.read('hiddenCargo',{shipId:'ship'},f.other),{code:'FORBIDDEN'});await f.edit('ships/ship',s=>({...s,pilotId:f.otherId}));await assert.rejects(f.read('hiddenCargo',{shipId:'ship'},f.other),{code:'FORBIDDEN'});
  const m=await f.get(`inventory/${f.moduleId}`);for(const patch of [{fieldActionId:'other'},{ownerId:f.otherId},{status:'AVAILABLE'},{location:{kind:'CHARACTER',id:f.cid}}]){await f.edit(`inventory/${f.moduleId}`,()=>({...m,...patch}));await assert.rejects(f.conceal(),{code:'MODULE_LOT_UNAVAILABLE'});}await f.edit(`inventory/${f.moduleId}`,()=>m);
  await f.edit(`characters/${f.cid}`,c=>({...c,spacePortId:'away'}));await assert.rejects(f.conceal(),{code:'SHIP_NOT_LOCAL'});
 });
 test(`${prefix} : aperçu sans écriture, confirmation périmée et présence obligatoire`,async()=>{
  const f=await hiddenCargoFixture(makeStore),i={shipId:'ship',lotId:f.lotId,conceal:true},before=await f.get(`inventory/${f.lotId}`),q=await f.read('prepareCargoConcealment',i);assert.deepEqual(await f.get(`inventory/${f.lotId}`),before);await assert.rejects(f.conceal(true,f.lotId,{present:false}),{code:'FIELD_PRESENCE_REQUIRED'});await f.edit(`inventory/${f.lotId}`,l=>({...l,revision:l.revision+1}));await assert.rejects(f.cmd('setCargoConcealment',{...i,confirmation:q.confirmation,present:true}),{code:'STALE_REVISION'});
 });
 test(`${prefix} : ordinaire deux minutes sans PA ni divulgation du fret inconnu`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.conceal();await f.grant(5);const before=await f.points(f.other),r=await f.start('ORDINARY');assert.deepEqual(await f.points(f.other),before);await assert.rejects(f.close(r),{code:'CUSTOMS_NOT_READY'});f.advance(120000);const out=await f.close(r);assert.deepEqual(out.result,{documentsChecked:true,hiddenCargoRevealed:false,knownCargo:[]});assert.doesNotMatch(JSON.stringify(out),new RegExp(f.lotId+'|Carburant'));assert.equal((await f.points(f.other)).available,before.available);assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.ship()).customsAttempt,undefined);
 });
 test(`${prefix} : seuils N1 et N5, un PA réservé puis consommé et découverte persistante`,async()=>{
  for(const [level,die,success] of [[1,5,false],[1,6,true],[5,1,false],[5,2,true]]){
   const f=await hiddenCargoFixture(makeStore);await f.conceal();await f.grant(level);const before=await f.points(f.other),r=await f.start();assert.equal((await f.points(f.other)).available,before.available-1);assert.equal((await f.points(f.other)).reserved,1);f.advance(120000);f.setDie(die);const out=await f.close(r);assert.equal(out.result.total,level+die);assert.equal(out.result.success,success);assert.equal(out.result.discovered.length,Number(success));assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.points(f.other)).available,before.available-1);assert.equal((await f.get(`inventory/${f.lotId}`)).hiddenCargo.discovered,success);
  }
 });
 test(`${prefix} : retirer et recacher un lot découvert conserve sa connaissance au contrôle ordinaire`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.conceal();await f.grant(5);const r=await f.start();f.advance(120000);await f.close(r);const original=await f.get(`inventory/${f.lotId}`);await f.conceal(false);await f.conceal(true);assert.equal((await f.get(`inventory/${f.lotId}`)).hiddenCargo.discoveredAt,original.hiddenCargo.discoveredAt);const ordinary=await f.start('ORDINARY');f.advance(120000);assert.equal((await f.close(ordinary)).result.knownCargo[0].id,f.lotId);
 });
 test(`${prefix} : une tentative commune à tous les agents et nouvelle autorisation MJ motivée`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant(1);await f.grant(1,f.cid);const r=await f.start();f.advance(120000);f.setDie(1);await f.close(r);await assert.rejects(f.start('DEEP',f.player),{code:'CUSTOMS_ATTEMPT_USED'});
  const sh=(await f.read('customsAdmin',{},f.owner)).ships.find(x=>x.id==='ship');await assert.rejects(f.cmd('authorizeCustomsRetry',{shipId:'ship',confirmation:sh.confirmation,reason:''},f.owner));await f.cmd('authorizeCustomsRetry',{shipId:'ship',confirmation:sh.confirmation,reason:'Nouvel indice physique vérifié'},f.owner);const second=await f.start('DEEP',f.player);f.advance(120000);await f.close(second,{actor:f.player});await assert.rejects(f.start(),{code:'CUSTOMS_ATTEMPT_USED'});
 });
 test(`${prefix} : PAUSE et STOP figent le délai, aucun effet à échéance`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant();const r=await f.start();f.advance(10000);await f.stage('PAUSE');f.advance(300000);assert.equal((await f.inspect(r)).inspection.remainingSeconds,110);await assert.rejects(f.close(r),{code:'SESSION_NOT_RUNNING'});await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'});f.advance(300000);assert.equal((await f.inspect(r)).inspection.remainingSeconds,110);await assert.rejects(f.close(r,{cancel:true}),{code:'SO_SAFETY_STOP'});assert.equal((await f.get(`shipMaintenance/${r.id}`)).status,'ACTIVE');
 });
 test(`${prefix} : annulation rend le PA dans son plafond, sans utiliser la tentative`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant();const r=await f.start();f.advance(6*3600000);await f.close(r,{cancel:true});assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.points(f.other)).available,5);assert.equal((await f.ship()).customsAttempt,undefined);assert.equal((await f.ship()).maintenanceId,null);assert.equal((await f.get(`characters/${f.otherId}`)).activeMaintenanceId,null);await f.start();
 });
 test(`${prefix} : révocation de l’habilitation bloque la fin, restitution MJ reste possible`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant();const r=await f.start();f.advance(120000);await f.grant(0);await assert.rejects(f.inspect(r),{code:'FORBIDDEN'});await assert.rejects(f.close(r),{code:'FORBIDDEN'});await f.close(r,{cancel:true,actor:f.owner});assert.equal((await f.points(f.other)).reserved,0);assert.deepEqual((await f.read('spaceMaintenance',{},f.other)).jobs,[]);
 });
 test(`${prefix} : agent PNJ habilité par la régie, même délai et aucun PA joueur`,async()=>{
  const f=await hiddenCargoFixture(makeStore),agentId='synthetic-customs-agent';await f.edit(`characters/${agentId}`,()=>({id:agentId,public:{displayName:'Agent PNJ'}}));await f.grant(5,agentId);const points=await f.points(),r=await f.start('DEEP',f.owner,agentId);assert.equal((await f.get(`characters/${agentId}`)).activeMaintenanceId,r.id);await assert.rejects(f.close(r,{actor:f.owner}),{code:'CUSTOMS_NOT_READY'});f.advance(120000);const out=await f.close(r,{actor:f.owner});assert.equal(out.result.success,true);assert.equal((await f.points()).available,points.available);assert.equal((await f.points()).reserved,0);assert.equal((await f.get(`characters/${agentId}`)).activeMaintenanceId,null);
 });
 test(`${prefix} : concurrence et réessai ne doublent ni PA ni découverte, droits avant reçu`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.conceal();await f.grant(5);const r=await f.start();f.advance(120000);const q=await f.inspect(r),p={inspectionId:r.id,confirmation:q.confirmation,present:true,performed:true,requestId:randomUUID()},inputs=[p,{...p,requestId:randomUUID()}],results=await Promise.allSettled(inputs.map(p=>f.cmd('finishCustomsInspection',p,f.other)));assert.equal(results.filter(x=>x.status==='fulfilled').length,1);const n=results.findIndex(x=>x.status==='fulfilled'),lot=await f.get(`inventory/${f.lotId}`);f.setDie(1);assert.deepEqual(await f.cmd('finishCustomsInspection',inputs[n],f.other),results[n].value);assert.deepEqual(await f.get(`inventory/${f.lotId}`),lot);assert.equal((await f.points(f.other)).available,4);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.cmd('finishCustomsInspection',inputs[n],f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : deux agents concurrents réservent un seul contrôle et marqueur courant avant reçu`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant(1);await f.grant(1,f.cid);const i={shipId:'ship',kind:'DEEP'},a=await f.read('prepareCustomsInspection',i,f.other),b=await f.read('prepareCustomsInspection',i,f.player),inputs=[{...i,confirmation:a.confirmation,present:true,requestId:randomUUID()},{...i,confirmation:b.confirmation,present:true,requestId:randomUUID()}],actors=[f.other,f.player],results=await Promise.allSettled(inputs.map((p,n)=>f.cmd('startCustomsInspection',p,actors[n])));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.points(f.other)).reserved+(await f.points()).reserved,1);const n=results.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('startCustomsInspection',inputs[n],actors[n]),results[n].value);await f.edit('',s=>{const {hiddenCargoVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(f.cmd('startCustomsInspection',inputs[n],actors[n]),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
 test(`${prefix} : annulation de transfert garde le lot caché, escale suivante ouvre une nouvelle tentative`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.conceal();const i={lotId:f.lotId,quantity:5,destination:{kind:'CHARACTER',id:f.cid}},q=await f.read('prepareCargoTransfer',i),t=await f.cmd('startCargoTransfer',{...i,confirmation:q.confirmation,present:true}),p=await f.read('cargoTransfer',{transferId:t.id});await f.cmd('cancelCargoTransfer',{transferId:t.id,confirmation:p.confirmation});assert.equal((await f.get(`inventory/${f.lotId}`)).hiddenCargo.concealed,true);await f.grant();const r=await f.start();f.advance(120000);await f.close(r);await assert.rejects(f.start(),{code:'CUSTOMS_ATTEMPT_USED'});
  // Arrival ID is synthetic here; the separate native-voyage test proves its creation.
  await f.edit('ships/ship',s=>({...s,portVisitId:'next-native-journey'}));await f.start();
 });
 test(`${prefix} : verrous bloquent cargaison, entretien ordinaire et clôture`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant();const r=await f.start();await assert.rejects(f.read('prepareCargoTransfer',{lotId:f.lotId,quantity:1,destination:{kind:'CHARACTER',id:f.cid}}));assert.deepEqual((await f.read('spaceMaintenance',{},f.other)).jobs,[]);await assert.rejects(f.read('prepareSpaceMaintenance',{maintenanceId:r.id},f.other),{code:'FORBIDDEN'});const e=await episodeHarness(f);await e.stage('PAUSE');const q=await e.read('prepareCampaignClosure',e.closeInput());assert.equal(q.canClose,false);assert.ok(q.blocks.some(b=>b.kind==='SHIP_OPERATION'));assert.ok(q.blocks.some(b=>b.kind==='CHARACTER_OPERATION'));await f.close(r,{cancel:true,actor:f.owner});
 });
 test(`${prefix} : transfert natif fractionné garde la découverte, réception retire seulement la dissimulation`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.conceal();await f.grant(5);const r=await f.start();f.advance(120000);await f.close(r);const i={lotId:f.lotId,quantity:2,destination:{kind:'CHARACTER',id:f.cid}},q=await f.read('prepareCargoTransfer',i),t=await f.cmd('startCargoTransfer',{...i,confirmation:q.confirmation,present:true});assert.notEqual(t.lotId,f.lotId);assert.equal((await f.get(`inventory/${t.lotId}`)).hiddenCargo.discovered,true);f.advance(180000);const p=await f.read('cargoTransfer',{transferId:t.id});await f.cmd('receiveCargoTransfer',{transferId:t.id,confirmation:p.confirmation,received:true});const moved=await f.get(`inventory/${t.lotId}`),kept=await f.get(`inventory/${f.lotId}`);assert.equal(moved.hiddenCargo.concealed,false);assert.equal(moved.hiddenCargo.discovered,true);assert.equal(kept.hiddenCargo.concealed,true);assert.equal(moved.quantity+kept.quantity,5);assert.equal(moved.ownerId,kept.ownerId);
 });
 test(`${prefix} : rollback atomique et reprise des lots, habilitations et tentatives entre épisodes`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const result=await cb(tx);if(fail)throw Error('INTERRUPTION');return result;})},f=await hiddenCargoFixture(()=>store);await f.conceal();await f.grant(5);const r=await f.start();f.advance(120000);const before=await f.ship();fail=true;await assert.rejects(f.close(r),/INTERRUPTION/);fail=false;assert.deepEqual(await f.ship(),before);assert.equal((await f.points(f.other)).reserved,1);await f.close(r);const lot=await f.get(`inventory/${f.lotId}`),ship=await f.ship(),agent=await f.get(`characters/${f.otherId}`),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get(`inventory/${f.lotId}`),lot);assert.deepEqual(await e.get('ships/ship'),ship);assert.deepEqual((await e.get(`characters/${f.otherId}`)).customsAuthorization,agent.customsAuthorization);assert.equal((await e.get('')).spaceOutlaws.hiddenCargoVersion,1);
 });
 test(`${prefix} : capacité nulle pendant neutralisation, sans suppression du fret ni de la découverte`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.conceal();await f.grant();const ship=await f.ship(),neutral={...ship,moduleNeutralizations:[{lotId:f.moduleId,untilGameMs:900000}]};assert.equal(hiddenCargoCapacity(neutral,1),0);assert.equal(hiddenCargoCapacity(neutral,900000),5);assert.equal((await f.get(`inventory/${f.lotId}`)).hiddenCargo.concealed,true);await f.edit('ships/ship',()=>neutral);const inspection=await f.start();assert.equal(inspection.status,'ACTIVE');
 });
 test(`${prefix} : nouveau passage natif identifié à l’arrivée sans enrichir les anciens manifestes`,async()=>{
  const f=await soVoyagesFixture(makeStore);await f.refuel(4);await f.store.runTransaction(async tx=>{const path=`sessions/${f.sid}`,s=await tx.get(path);tx.set(path,{...s,spaceOutlaws:{...s.spaceOutlaws,hiddenCargoVersion:1}});});await f.fly();const journey=(await f.ship()).journey;f.advance(300000);await f.cmd('arriveShip',{shipId:'ship',confirmation:(await f.navigation()).confirmation});assert.equal((await f.ship()).portVisitId,journey.id);const s=await f.store.get(`sessions/${f.sid}`),header=await f.store.get(`campaigns/${s.campaignId}/versions/${s.versionId}`);assert.equal(header.hiddenCargoVersion,1);
 });
 test(`${prefix} : retrait refuse tout lot encore dissimulé, connu ou d’un autre propriétaire`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),original=await f.get(`inventory/${f.lotId}`);
  for(const [ownerId,discovered]of [[f.cid,false],[f.cid,true],[f.otherId,true]]){await f.edit(`inventory/${f.lotId}`,l=>({...l,ownerId,hiddenCargo:{shipId:'ship',concealed:true,discovered}}));await assert.rejects(f.previewRemovalOffer(),{code:'MODULE_CONTENT_NOT_EMPTY'});assert.equal((await f.points(f.other)).reserved,0);}
  await f.edit(`inventory/${f.lotId}`,()=>original);await assert.rejects(f.previewRemovalOffer({contentConsigned:true}),{code:'INVALID_ADMISSION'});assert.equal((await f.get(`inventory/${f.moduleId}`)).status,'INSTALLED');
 });
 test(`${prefix} : vidage explicite puis retrait cargo/transport, cinq minutes et même exemplaire rendu`,async()=>{
  for(const profileId of ['CARGO','TRANSPORT']){
   const f=await hiddenRemovalFixture(makeStore,{profileId,quantity:profileId==='CARGO'?5:10});for(const id of f.lotIds)await f.conceal(true,id);await assert.rejects(f.offerRemoval(),{code:'MODULE_CONTENT_NOT_EMPTY'});for(const id of f.lotIds)await f.conceal(false,id);
   const stock=await Promise.all(f.lotIds.map(id=>f.get(`inventory/${id}`))),module=await f.get(`inventory/${f.moduleId}`),accounts=await f.store.list(`sessions/${f.sid}/accounts`),r=await f.offerRemoval();assert.equal((await f.get(`shipMaintenance/${r.id}`)).hiddenCargoVersion,1);await f.approveRemoval(r);await f.startRemoval(r);assert.equal((await f.read('moduleWork',{mandateId:r.id},f.other)).remainingSeconds,300);assert.equal((await f.get(`inventory/${f.moduleId}`)).status,'FIELD_RESERVED');await assert.rejects(f.previewRemoval(r),{code:'MODULE_WORK_NOT_READY'});f.advance(300000);assert.equal((await f.ship()).modules.length,1);await f.finishRemoval(r);
   const restored=await f.get(`inventory/${f.moduleId}`);assert.equal(restored.id,module.id);assert.deepEqual(restored.item,module.item);assert.equal(restored.quantity,1);assert.equal(restored.ownerId,module.ownerId);assert.equal(restored.status,'AVAILABLE');assert.deepEqual(restored.location,{kind:'CHARACTER',id:f.cid});assert.equal((await f.ship()).modules.length,0);assert.equal((await f.ship()).capacity,profileId==='CARGO'?20:50);assert.equal((await f.points(f.other)).available,4);assert.equal((await f.points(f.other)).reserved,0);assert.deepEqual(await Promise.all(f.lotIds.map(id=>f.get(`inventory/${id}`))),stock);assert.deepEqual(await f.store.list(`sessions/${f.sid}/accounts`),accounts);
   assert.ok((await f.read('moduleMandatesAdmin',{},f.owner)).lots.some(l=>l.id===f.moduleId));assert.equal((await f.previewRemovalOffer({moduleOperation:'INSTALL'})).install.seconds,600);await assert.rejects(f.conceal(),{code:'MODULE_LOT_UNAVAILABLE'});
  }
 });
 test(`${prefix} : retrait après déchargement natif préserve découverte et permet le vol nu`,async()=>{
  const f=await hiddenRemovalFixture(makeStore);await f.conceal();await f.grant(5);const inspection=await f.start();f.advance(120000);await f.close(inspection);const input={lotId:f.lotId,quantity:5,destination:{kind:'CHARACTER',id:f.cid}},p=await f.read('prepareCargoTransfer',input),t=await f.cmd('startCargoTransfer',{...input,confirmation:p.confirmation,present:true});await assert.rejects(f.previewRemovalOffer(),{code:'INVALID_MODULE_OWNER'});f.advance(180000);const q=await f.read('cargoTransfer',{transferId:t.id});await f.cmd('receiveCargoTransfer',{transferId:t.id,confirmation:q.confirmation,received:true});
  const moved=await f.get(`inventory/${t.lotId}`),r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(300000);await f.finishRemoval(r);assert.deepEqual(await f.get(`inventory/${t.lotId}`),moved);assert.equal(moved.hiddenCargo.discovered,true);await f.refuel(4);await f.fly();assert.equal((await f.ship()).docked,false);assert.equal((await f.ship()).modules.length,0);
 });
 test(`${prefix} : contenu ajouté après accord ou pendant retrait bloque démarrage et finalisation`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),r=await f.offerRemoval();await f.approveRemoval(r);await f.conceal();await assert.rejects(f.startRemoval(r),{code:'MODULE_MANDATE_STALE'});assert.equal((await f.points(f.other)).reserved,0);
  const g=await hiddenRemovalFixture(makeStore),job=await g.offerRemoval();await g.approveRemoval(job);await g.startRemoval(job);g.advance(300000);await g.edit(`inventory/${g.lotId}`,l=>({...l,hiddenCargo:{shipId:'ship',concealed:true,discovered:true},revision:l.revision+1}));await assert.rejects(g.previewRemoval(job),{code:'MODULE_MANDATE_STALE'});assert.equal((await g.points(g.other)).reserved,1);await g.cancelRemoval(job);assert.equal((await g.get(`inventory/${g.moduleId}`)).status,'INSTALLED');assert.equal((await g.get(`inventory/${g.lotId}`)).hiddenCargo.concealed,true);assert.equal((await g.points(g.other)).available,5);
 });
 test(`${prefix} : retrait revalide le contenu à l’ultime confirmation sans effet partiel`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(300000);const q=await f.previewRemoval(r);await f.edit(`inventory/${f.lotId}`,l=>({...l,hiddenCargo:{shipId:'ship',concealed:true,discovered:false}}));await assert.rejects(f.cmd('finishModuleRemoval',{mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,performed:true},f.other),{code:'MODULE_MANDATE_STALE'});assert.equal((await f.get(`inventory/${f.moduleId}`)).status,'FIELD_RESERVED');assert.equal((await f.ship()).modules.length,1);assert.equal((await f.points(f.other)).reserved,1);
 });
 test(`${prefix} : retrait personnel MEC-03 N2, atelier et présence, réserves étrangères et panne refusés`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),lot=await f.get(`inventory/${f.moduleId}`);for(const patch of [{fieldActionId:'other'},{cargoTransferId:'other'},{ownerId:f.otherId}]){await f.edit(`inventory/${f.moduleId}`,()=>({...lot,...patch}));await assert.rejects(f.previewRemovalOffer(),{code:patch.ownerId?'INVALID_MODULE_CALIBRATION':'MODULE_LOT_UNAVAILABLE'});}await f.edit(`inventory/${f.moduleId}`,()=>lot);await f.edit('ships/ship',s=>({...s,moduleNeutralizations:[{lotId:f.moduleId,untilGameMs:90000000}]}));await assert.rejects(f.previewRemovalOffer(),{code:'SPACE_SHIP_BUSY'});await f.edit('ships/ship',s=>({...s,moduleNeutralizations:[]}));
  const r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(300000);for(const actor of [f.owner,f.player])await assert.rejects(f.previewRemoval(r,actor),{code:'FORBIDDEN'});for(const patch of [{present:false},{workshopConfirmed:false},{performed:false}])await assert.rejects(f.finishRemoval(r,patch),{code:'FIELD_PRESENCE_REQUIRED'});await f.edit(`characters/${f.otherId}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[{id:'MEC-03',level:1}]}}));await assert.rejects(f.previewRemoval(r),{code:'MODULE_TECH_REQUIRED'});
 });
 test(`${prefix} : retrait sous marqueur courant avant reçu, aucun MOD-04 ajouté aux anciens manifestes`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),s=await f.get('');await f.edit('',s=>{const {hiddenCargoVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(f.previewRemovalOffer(),{code:'INVALID_MODULE_CALIBRATION'});await f.edit('',()=>s);const r=await f.offerRemoval();await f.approveRemoval(r);const q=await f.read('prepareModuleWorkStart',{mandateId:r.id},f.other),input={mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,requestId:randomUUID()};await f.cmd('startModuleWork',input,f.other);await f.edit('',s=>{const {hiddenCargoVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(f.cmd('startModuleWork',input,f.other),{code:'SO_GAMEPLAY_NOT_OPEN'});await assert.rejects(f.read('moduleWorkAdmin',{mandateId:r.id},f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});await f.edit('',()=>s);const job=await f.get(`shipMaintenance/${r.id}`);await f.edit(`shipMaintenance/${r.id}`,r=>{const {hiddenCargoVersion,...old}=r;return old;});await assert.rejects(f.previewRemoval(r),{code:'SO_GAMEPLAY_NOT_OPEN'});await f.edit(`shipMaintenance/${r.id}`,()=>job);await f.cancelRemoval(r);const header=await f.store.get(`campaigns/${s.campaignId}/versions/${s.versionId}`);assert.equal(header.hiddenCargoVersion,1);
 });
 test(`${prefix} : retrait PAUSE/STOP, annulation après révocation conserve le module monté`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(10000);await f.stage('PAUSE');f.advance(900000);assert.equal((await f.read('moduleWork',{mandateId:r.id},f.other)).remainingSeconds,290);await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'});f.advance(900000);await assert.rejects(f.cancelRemoval(r,f.owner),{code:'SO_SAFETY_STOP'});const s=await f.read('session',{},f.owner);await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.previewRemoval(r),{code:'FORBIDDEN'});await f.cancelRemoval(r,f.owner);assert.equal((await f.get(`inventory/${f.moduleId}`)).status,'INSTALLED');assert.equal((await f.ship()).modules.length,1);assert.equal((await f.store.get(`sessions/${f.sid}/characters/${f.otherId}/resources/actionPoints`)).reserved,0);
 });
 test(`${prefix} : retrait concurrent et réessai consomment un PA et rendent un seul exemplaire`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(300000);const q=await f.previewRemoval(r),p={mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,performed:true,requestId:randomUUID()},inputs=[p,{...p,requestId:randomUUID()}],out=await Promise.allSettled(inputs.map(p=>f.cmd('finishModuleRemoval',p,f.other)));assert.equal(out.filter(r=>r.status==='fulfilled').length,1);const n=out.findIndex(r=>r.status==='fulfilled');assert.deepEqual(await f.cmd('finishModuleRemoval',inputs[n],f.other),out[n].value);assert.equal((await f.points(f.other)).available,4);assert.equal((await f.get(`inventory/${f.moduleId}`)).quantity,1);assert.equal((await f.ship()).modules.length,0);
 });
 test(`${prefix} : retrait rollback puis reprise conservent module rendu et découverte`,async()=>{
  const raw=makeStore();let fail=false;const store={get:raw.get.bind(raw),list:raw.list.bind(raw),runTransaction:cb=>raw.runTransaction(async tx=>{const r=await cb(tx);if(fail)throw Error('INTERRUPTION');return r;})},f=await hiddenRemovalFixture(()=>store);await f.edit(`inventory/${f.lotId}`,l=>({...l,hiddenCargo:{shipId:'ship',concealed:false,discovered:true,discoveredAt:1}}));const r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(300000);const ship=await f.ship();fail=true;await assert.rejects(f.finishRemoval(r),/INTERRUPTION/);fail=false;assert.deepEqual(await f.ship(),ship);assert.equal((await f.points(f.other)).reserved,1);await f.finishRemoval(r);const module=await f.get(`inventory/${f.moduleId}`),cargo=await f.get(`inventory/${f.lotId}`),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.deepEqual(await e.get(`inventory/${f.moduleId}`),module);assert.deepEqual(await e.get(`inventory/${f.lotId}`),cargo);assert.equal((await e.get(`shipMaintenance/${r.id}`)).status,'MODULE_REMOVED');
 });

 test(`${prefix} : fin du retrait face à une interruption choisit un seul état cohérent`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(300000);const q=await f.previewRemoval(r),w=await f.read('moduleWork',{mandateId:r.id},f.other),out=await Promise.allSettled([f.cmd('finishModuleRemoval',{mandateId:r.id,confirmation:q.confirmation,present:true,workshopConfirmed:true,performed:true},f.other),f.cmd('cancelModuleWork',{mandateId:r.id,confirmation:w.confirmation,reason:'Annulation concurrente'},f.other)]);assert.equal(out.filter(x=>x.status==='fulfilled').length,1);const lot=await f.get(`inventory/${f.moduleId}`),mounted=(await f.ship()).modules.length===1;assert.equal(lot.status,mounted?'INSTALLED':'AVAILABLE');assert.equal(lot.location.kind,mounted?'SHIP_MODULE':'CHARACTER');assert.equal(lot.quantity,1);assert.equal((await f.points(f.other)).reserved,0);assert.equal((await f.points(f.other)).available,mounted?5:4);
 });

 test(`${prefix} : retirer MOD-04 conserve l’autre module et les dommages du vaisseau`,async()=>{
  const f=await hiddenRemovalFixture(makeStore),other={lotId:'synthetic-shield-module',code:'MOD-01',size:2,status:'OPERATIONAL'},module=await f.get(`inventory/${f.moduleId}`);await f.edit(`inventory/${other.lotId}`,()=>({...module,id:other.lotId,item:{...module.item,shipModule:{code:'MOD-01',size:2}}}));await f.edit('ships/ship',s=>({...s,modules:[...s.modules,other],soProfile:{...s.soProfile,shieldMax:3},shield:1,hull:2}));const r=await f.offerRemoval();await f.approveRemoval(r);await f.startRemoval(r);f.advance(300000);await f.finishRemoval(r);const sh=await f.ship();assert.deepEqual(sh.modules,[other]);assert.equal(sh.soProfile.shieldMax,3);assert.equal(sh.shield,1);assert.equal(sh.hull,2);assert.equal((await f.get(`inventory/${other.lotId}`)).status,'INSTALLED');assert.equal((await f.navigation()).ship.profile.shieldMax,3);
 });

 test(`${prefix} : liens de navigation sous marqueur, propriétaire et habilitation courants uniquement`,async()=>{
  const f=await hiddenCargoFixture(makeStore);assert.equal((await f.read('shipHold',{shipId:'ship'})).hold.hiddenCargoReady,true);assert.equal((await f.read('cargoAdmin',{},f.owner)).customsReady,true);assert.equal((await f.read('myCargo',{},f.other)).customsReady,undefined);await f.grant();assert.equal((await f.read('myCargo',{},f.other)).customsReady,true);await f.grant(0);assert.equal((await f.read('myCargo',{},f.other)).customsReady,undefined);
  await f.edit('ships/ship',s=>({...s,pilotId:f.otherId}));const pilot=await f.read('shipHold',{shipId:'ship'},f.other);assert.equal(pilot.hold.hiddenCargoReady,undefined);assert.equal(pilot.canRead,false);assert.deepEqual(pilot.stock,[]);
  await f.edit('',s=>{const {hiddenCargoVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});assert.equal((await f.read('shipHold',{shipId:'ship'})).hold.hiddenCargoReady,undefined);assert.equal((await f.read('cargoAdmin',{},f.owner)).customsReady,undefined);
 });
 test(`${prefix} : protocole UI exécuté par le serveur, régie sans finalisation joueur et lectures sans écriture`,async()=>{
  const f=await hiddenCargoFixture(makeStore),input={sessionId:f.sid,shipId:'ship',lotId:f.lotId,conceal:true},p=await f.read('prepareCargoConcealment',hiddenCargoRequest('prepareCargoConcealment',input,{}));await f.cmd('setCargoConcealment',hiddenCargoRequest('setCargoConcealment',{...input,confirmation:p.confirmation},{present:'on'}));await f.grant(5);
  const prepare=hiddenCargoRequest('prepareCustomsInspection',{sessionId:f.sid},{shipId:'ship',kind:'DEEP',level:5,die:6}),q=await f.read('prepareCustomsInspection',prepare,f.other),r=await f.cmd('startCustomsInspection',hiddenCargoRequest('startCustomsInspection',{...prepare,confirmation:q.confirmation},{present:'on'}),f.other);
  const ship=await f.ship(),lot=await f.get(`inventory/${f.lotId}`),points=await f.points(f.other),waiting=await f.inspect(r);assert.equal(waiting.inspection.canFinish,false);assert.equal(waiting.inspection.canCancel,true);assert.equal((await f.read('customsAdmin',{},f.owner)).inspections.find(x=>x.id===r.id).pnj,false);assert.equal((await f.inspect(r,f.owner)).inspection.canFinish,false);assert.deepEqual(await f.ship(),ship);assert.deepEqual(await f.get(`inventory/${f.lotId}`),lot);assert.deepEqual(await f.points(f.other),points);
  f.advance(120000);const ready=await f.inspect(r);assert.equal(ready.inspection.canFinish,true);assert.equal((await f.inspect(r,f.owner)).inspection.canFinish,false);await f.cmd('finishCustomsInspection',hiddenCargoRequest('finishCustomsInspection',{sessionId:f.sid,inspectionId:r.id,confirmation:ready.confirmation},{present:'on',performed:'on',die:1}),f.other);const closed=await f.inspect(r);assert.equal(closed.inspection.canFinish,false);assert.equal(closed.inspection.canCancel,false);assert.equal(closed.inspection.result.success,true);
 });

 test(`${prefix} : nouvelle inspection autorisée ne réécrit pas une découverte antérieure`,async()=>{
  const f=await hiddenCargoFixture(makeStore);
  await f.conceal();await f.grant(5);
  const first=await f.start();f.advance(120000);f.setDie(6);
  const initial=await f.close(first);
  assert.equal(initial.result.success,true);
  assert.equal(initial.result.discovered.length,1);
  assert.deepEqual(initial.result.knownCargo,[]);
  const original=await f.get(`inventory/${f.lotId}`);
  assert.equal(original.hiddenCargo.discovered,true);
  assert.ok(original.hiddenCargo.discoveredAt);
  const admin=await f.read('customsAdmin',{},f.owner);
  const ship=admin.ships.find(x=>x.id==='ship');
  await f.cmd('authorizeCustomsRetry',{shipId:ship.id,confirmation:ship.confirmation,
    reason:'Indice nouveau vérifié par le MJ'},f.owner);
  f.advance(300000);
  const second=await f.start();f.advance(120000);f.setDie(6);
  const repeated=await f.close(second);
  assert.equal(repeated.result.success,true);
  assert.deepEqual(repeated.result.discovered,[]);
  assert.equal(repeated.result.knownCargo.length,1);
  assert.equal(repeated.result.knownCargo[0].id,f.lotId);
  const after=await f.get(`inventory/${f.lotId}`);
  assert.equal(after.hiddenCargo.discoveredAt,original.hiddenCargo.discoveredAt);
  assert.equal(after.revision,original.revision);
  const history=await f.store.list(`sessions/${f.sid}/inventory/${f.lotId}/history`);
  assert.equal(history.filter(e=>e.kind==='finishCustomsInspection').length,1);
  await assert.rejects(f.start(),{code:'CUSTOMS_ATTEMPT_USED'});
 });
 test(`${prefix} : projections pause, STOP et révocation permettent la restitution MJ sans nouvelle action`,async()=>{
  const f=await hiddenCargoFixture(makeStore);await f.grant(5);const r=await f.start();f.advance(120000);await f.edit('ships/ship',s=>({...s,moduleNeutralizations:[{lotId:f.moduleId,untilGameMs:90000000}]}));assert.equal((await f.inspect(r)).inspection.canFinish,true);assert.equal((await f.inspect(r)).inspection.canCancel,true);await f.edit('ships/ship',s=>({...s,moduleNeutralizations:[]}));await f.stage('PAUSE');assert.equal((await f.inspect(r)).inspection.canFinish,false);assert.equal((await f.inspect(r)).inspection.canCancel,true);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).canMove,false);await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'});const stopped=await f.inspect(r);assert.equal(stopped.session.safetyStopped,true);assert.equal(stopped.inspection.canFinish,false);assert.equal(stopped.inspection.canCancel,false);const s=await f.read('session',{},f.owner);await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);await f.grant(0);const regie=await f.inspect(r,f.owner);assert.equal(regie.inspection.canFinish,false);assert.equal(regie.inspection.canCancel,true);await f.close(r,{cancel:true,actor:f.owner});assert.equal((await f.points(f.other)).reserved,0);
 });

 test(`${prefix} : MOD-04 cargo et transport achetés, reçus et montés par les parcours natifs`,async()=>{
  for(const profileId of ['CARGO','TRANSPORT']){const f=await nativeHiddenFlightFixture(makeStore,{profileId}),s=await f.get(''),header=await f.store.get(`campaigns/${s.campaignId}/versions/${s.versionId}`),ship=await f.ship(),lot=await f.get(`inventory/${f.moduleId}`);assert.equal(header.hiddenCargoVersion,1);assert.equal(s.spaceOutlaws.hiddenCargoVersion,1);assert.equal(lot.status,'INSTALLED');assert.equal(lot.ownerId,f.cid);assert.deepEqual(lot.location,{kind:'SHIP_MODULE',id:'ship'});assert.equal(ship.modules[0].lotId,lot.id);assert.equal(ship.capacity,profileId==='CARGO'?20:50);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenCapacity,profileId==='CARGO'?5:10);assert.equal((await f.navigation()).ship.moduleFlightBlocked,false);assert.equal((await f.points(f.other)).available,4);}
 });
 test(`${prefix} : décision B, panne native conserve le fret caché et ordinaire sans découverte ni PA`,async()=>{
  const f=await nativeHiddenFlightFixture(makeStore),lot=await f.get(`inventory/${f.lotId}`),module=await f.get(`inventory/${f.moduleId}`);await f.launch();assert.equal((await f.ship()).journey.event.neutralizedModule.code,'MOD-04');await f.arrive();await assert.rejects(f.conceal(true,f.extraLotId),{code:'HIDDEN_CARGO_FULL'});await f.grant();const points=await f.points(f.other),r=await f.startInspection('ORDINARY');f.advance(120000);const out=await f.finishInspection(r);assert.deepEqual(out.result,{documentsChecked:true,hiddenCargoRevealed:false,knownCargo:[]});assert.deepEqual(await f.get(`inventory/${f.lotId}`),lot);assert.deepEqual(await f.get(`inventory/${f.moduleId}`),module);assert.equal((await f.points(f.other)).available,points.available);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenCapacity,0);
 });
 test(`${prefix} : décision B, inspection approfondie pendant panne puis retrait réel après vidage`,async()=>{
  const f=await nativeHiddenFlightFixture(makeStore);await f.launch();await f.arrive();await f.grant();const r=await f.startInspection();f.advance(120000);assert.equal((await f.finishInspection(r)).result.success,true);const before=await f.get(`inventory/${f.lotId}`);assert.equal(before.hiddenCargo.discovered,true);f.advance(600000);await f.conceal(false);await f.conceal(true);assert.equal((await f.get(`inventory/${f.lotId}`)).hiddenCargo.discoveredAt,before.hiddenCargo.discoveredAt);await assert.rejects(f.read('prepareModuleMandateOffer',{...f.input,moduleOperation:'REMOVE'},f.owner),{code:'MODULE_CONTENT_NOT_EMPTY'});await f.conceal(false);const job=await f.offer({moduleOperation:'REMOVE'});await f.approve(job);const q=await f.read('prepareModuleWorkStart',{mandateId:job.id},f.other);await f.cmd('startModuleWork',{mandateId:job.id,confirmation:q.confirmation,present:true,workshopConfirmed:true},f.other);f.advance(300000);const done=await f.read('prepareModuleRemoval',{mandateId:job.id},f.other);await f.cmd('finishModuleRemoval',{mandateId:job.id,confirmation:done.confirmation,present:true,workshopConfirmed:true,performed:true},f.other);assert.equal((await f.get(`inventory/${f.moduleId}`)).status,'AVAILABLE');assert.equal((await f.get(`inventory/${f.lotId}`)).hiddenCargo.discovered,true);assert.equal((await f.ship()).modules.length,0);
 });
 test(`${prefix} : expiration exacte autorise un nouveau rangement sans déplacer le contenu existant`,async()=>{
  const f=await nativeHiddenFlightFixture(makeStore);await f.launch();await f.arrive();const before=await f.get(`inventory/${f.lotId}`);f.advance(599999);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenCapacity,0);await assert.rejects(f.conceal(true,f.extraLotId),{code:'HIDDEN_CARGO_FULL'});f.advance(1);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenCapacity,5);await f.conceal(true,f.extraLotId);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenUsed,5);assert.deepEqual(await f.get(`inventory/${f.lotId}`),before);assert.equal((await f.get(`inventory/${f.extraLotId}`)).quantity,2);
 });
 test(`${prefix} : panne B, PAUSE et STOP conservent délai et contenu, aucune révélation automatique`,async()=>{
  const f=await nativeHiddenFlightFixture(makeStore);await f.launch();await f.arrive();const before=await f.get(`inventory/${f.lotId}`);await f.stage('PAUSE');f.advance(900000);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenCapacity,0);await f.stage('EN_JEU');await f.cmd('stopSafety',{reason:'Sécurité'});f.advance(900000);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenCapacity,0);assert.deepEqual(await f.get(`inventory/${f.lotId}`),before);
 });
 test(`${prefix} : convoi équipé MOD-04, un événement commun et seul appareil choisi neutralisé`,async()=>{
  const f=await nativeHiddenFlightFixture(makeStore,{convoy:true}),before=await f.get(`inventory/${f.lotId}`);await f.depart();const a=await f.ship(),b=await f.get('ships/escort');assert.deepEqual(a.journey.event,b.journey.event);assert.equal(a.journey.event.affectedShipId,'ship');assert.equal(a.moduleNeutralizations[0].code,'MOD-04');assert.equal(b.moduleNeutralizations,undefined);assert.deepEqual(await f.get(`inventory/${f.lotId}`),before);assert.equal((await f.read('hiddenCargo',{shipId:'ship'})).hiddenCapacity,0);assert.equal((await f.navigation('escort',f.other)).ship.journey.event.neutralizedModule.lotId,undefined);
 });
 test(`${prefix} : ancien manifeste sans marqueur non enrichi et MOD-04 refusé sans droits de version courants`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false}),out=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${out.versionId}`,canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;await f.store.runTransaction(async tx=>{const {towingWorkVersion,towingAttachmentVersion,towingFlightVersion,towingCombatVersion,towingOutageVersion,towingRecoveryVersion,hiddenCargoVersion,manifestDigest,...old}=await tx.get(path);tx.set(path,{...old,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(old))).digest('hex')});});await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.hiddenCargoVersion,undefined);
  const g=await nativeHiddenFlightFixture(makeStore),ship=await g.ship();await g.edit('',s=>{const {hiddenCargoVersion,...old}=s.spaceOutlaws;return {...s,spaceOutlaws:old};});await assert.rejects(g.navigation(),{code:'INVALID_MODULE_CALIBRATION'});await assert.rejects(g.read('prepareShopPurchase',{shopId:'counter',offerId:'module-offer',quantity:1,useProtected:false}),{code:'INVALID_SHIP_MODULE_OFFER'});await assert.rejects(g.read('hiddenCargo',{shipId:'ship'}),{code:'SO_GAMEPLAY_NOT_OPEN'});assert.deepEqual(await g.ship(),ship);
 });
 test(`${prefix} : reprise après panne B conserve marqueur, même module et cargaison cachée`,async()=>{
  const f=await nativeHiddenFlightFixture(makeStore);await f.launch();await f.arrive();const lot=await f.get(`inventory/${f.lotId}`),module=await f.get(`inventory/${f.moduleId}`),ship=await f.ship(),e=await episodeHarness(f);await e.close();await e.resume(await e.begin());assert.equal((await e.get('')).spaceOutlaws.hiddenCargoVersion,1);assert.deepEqual(await e.get(`inventory/${f.lotId}`),lot);assert.deepEqual(await e.get(`inventory/${f.moduleId}`),module);assert.deepEqual(await e.get('ships/ship'),ship);assert.equal((await e.read('hiddenCargo',{shipId:'ship'},f.player)).hiddenCapacity,0);
 });

 test(`${prefix} : manifeste MOD-04 sans marqueur, inconnu ou sans dépendance refusé avant naissance`,async()=>{
  const f=await soVoyagesFixture(makeStore,{release:false,prepareExtra:async(f,rev)=>{await f.cc('saveCentralItem',{itemId:'hidden',itemRevision:0,draftRevision:rev++,item:{...moduleItem,shipModule:{code:'MOD-04',size:2}},reason:'Module compatible'});await f.cc('saveCentralOffer',{offerId:'hidden-offer',offerRevision:0,draftRevision:rev++,offer:{name:'Soute',shopId:'counter',itemId:'hidden',unitPrice:1000,buybackPrice:null,conditions:'Atelier séparé',gmNotes:''},reason:'Tarif canonique'});}}),out=await f.release(await f.releasePreview()),path=`campaigns/${f.campaignId}/versions/${out.versionId}`,original=await f.store.get(path),canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
  for(const mode of ['MISSING','UNKNOWN','DEPENDENCY']){const {manifestDigest,...h}=original;if(mode==='MISSING')delete h.hiddenCargoVersion;if(mode==='UNKNOWN')h.hiddenCargoVersion=2;if(mode==='DEPENDENCY')delete h.moduleFlightVersion;await f.store.runTransaction(async tx=>tx.set(path,{...h,manifestDigest:createHash('sha256').update(JSON.stringify(canonical(h))).digest('hex')}));await assert.rejects(f.birthPreview(),{code:'SO_VERSION_INVALID'});assert.equal((await f.store.get(`sessions/${f.sid}`)).versionId,null);}
  await f.store.runTransaction(async tx=>tx.set(path,original));await f.birth(await f.birthPreview());assert.equal((await f.read('mySession')).session.spaceOutlaws.hiddenCargoVersion,1);
 });

}
