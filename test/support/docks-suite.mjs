import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {commercialStorageFixture} from './commercial-storage-suite.mjs';
import {accountId} from '../../src/core/economy-state.mjs';
export async function dockFixture(makeStore,{mode='RENT',actor='client'}={}){
 const f=await commercialStorageFixture(makeStore),w=await f.store.get(`${f.base}/warehouses/${f.wid}`),dock={mode,securityTier:2,intrusionTargetId:null,revealFields:['name'],theftEnabled:false,physical:false};
 await f.configure({warehouseId:f.wid,warehouseRevision:w.revision,dock,capacity:10});
 const terminal={id:'dock',name:'Cellule du dock',placeId:'scene',portId:'home',active:true,durationSeconds:3600,operations:[{action:'dockEntry',resourceId:f.wid,characterIds:[],skillId:null,minLevel:0}]};
 await f.cmd('saveLocalTerminal',{terminal,revision:0},f.owner);
 await f.cmd('saveLocalCredential',{terminalId:'dock',revision:0,credential:{id:'dock-code',kind:'CODE',name:'Code de cellule',active:true,code:'cell-secret'}},f.owner);
 terminal.operations[0].credentialIds=['dock-code'];await f.cmd('saveLocalTerminal',{terminal,revision:1},f.owner);
 const enter=async(who=f.client)=>{await f.cmd('scanLocalTerminal',{terminalId:'dock'},who);await f.cmd('unlockLocalCode',{terminalId:'dock',code:'cell-secret'},who);};
 const rent=async(who=f.client)=>f.confirm('prepareCommercialStorageRent','rentCommercialStorage',{warehouseId:f.wid,tenantType:'CHARACTER',fromAccountId:accountId(who===f.client?f.clientId:f.cid)},who);
 await rent(actor==='client'?f.client:f.player);
 return {...f,terminal,dock,enter,rentDock:rent};
}
export function docksSuite(makeStore,prefix='Docks'){
 test(`${prefix} DOCK-01/16 : acquisition définitive payée une fois et titre conservé`,async()=>{
  const f=await dockFixture(makeStore,{mode:'OWN'}),w=await f.store.get(`${f.base}/warehouses/${f.wid}`);assert.equal(w.tenantId,f.clientId);assert.equal(w.expiresAtGameMs,null);f.advance(900000);await f.enter();await f.move(f.lotId,'DEPOSIT',1);assert.equal((await f.detail()).warehouse.expired,false);await assert.rejects(f.rentDock(),{code:'DOCK_ALREADY_OWNED'});await assert.rejects(f.read('prepareCommercialStorageRelease',{warehouseId:f.wid},f.client),{code:'DOCK_TITLE_LOCKED'});assert.equal((await f.store.get(`${f.base}/warehouses/${f.wid}`)).dock.mode,'OWN');
 });
 test(`${prefix} DOCK-06/09/17/18 : entrée distincte des mandats et révélations limitées`,async()=>{
  const f=await dockFixture(makeStore);await assert.rejects(f.move(f.lotId,'DEPOSIT',1),{code:'LOCAL_SCAN_REQUIRED'});await f.enter();await f.move(f.lotId,'DEPOSIT',2);
  let d=await f.read('dockEntry',{warehouseId:f.wid});assert.equal(d.entry,null);assert.deepEqual(d.revealed,[]);await f.enter(f.player);d=await f.read('dockEntry',{warehouseId:f.wid});assert.equal(d.entry.method,'CREDENTIAL');assert.deepEqual(d.revealed.map(x=>Object.keys(x)),[['name']]);assert.equal(d.canManageStock,false);await assert.rejects(f.read('prepareCommercialStorageMove',{warehouseId:f.wid,lotId:f.lotId,direction:'WITHDRAW',quantity:1}),{code:'FORBIDDEN'});
  await f.cmd('saveLocalCredential',{terminalId:'dock',revision:1,credential:{id:'dock-code',kind:'CODE',name:'Code de cellule',active:false,code:'cell-secret'}},f.owner);assert.equal((await f.read('dockEntry',{warehouseId:f.wid})).entry,null);
 });
 test(`${prefix} DOCK-03/04/05/13 : cellule et soute utilisent le transfert natif sans taxe locale`,async()=>{
  const f=await dockFixture(makeStore,{actor:'player'});await f.enter(f.player);
  // A native commercial purchase belongs to the client. This synthetic fixture
  // changes only legal owner/holder to give the vessel owner his own local freight.
  await f.edit(`inventory/${f.lotId}`,l=>({...l,ownerId:f.cid,holderId:f.cid,location:{...l.location,id:f.cid}}));
  const deposited=await f.confirm('prepareCommercialStorageMove','moveCommercialStorage',{warehouseId:f.wid,lotId:f.lotId,direction:'DEPOSIT',quantity:3});
  const input={lotId:deposited.id,quantity:3,destination:{kind:'HOLD',id:'ship'}},q=await f.read('prepareCargoTransfer',input),t=await f.cmd('startCargoTransfer',{...input,confirmation:q.confirmation,present:true});
  assert.equal((await f.store.get(`${f.base}/inventory/${t.lotId}`)).location.kind,'WAREHOUSE');await assert.rejects(f.read('prepareCargoReceipt',{transferId:t.id}),{code:'SO_CARGO_NOT_READY'});f.advance(180000);const receipt=await f.read('prepareCargoReceipt',{transferId:t.id});await f.cmd('receiveCargoTransfer',{transferId:t.id,confirmation:receipt.confirmation,received:true});
  const l=await f.store.get(`${f.base}/inventory/${t.lotId}`);assert.equal(l.location.kind,'HOLD');assert.equal(l.ownerId,f.cid);assert.equal(l.quantity,3);const back={lotId:l.id,quantity:3,destination:{kind:'WAREHOUSE',id:f.wid}},qb=await f.read('prepareCargoTransfer',back);assert.equal(qb.clearance,null);
  await f.edit('ships/ship',sh=>({...sh,portId:'away'}));await assert.rejects(f.read('prepareCargoTransfer',back),{code:'FORBIDDEN'});
 });
 test(`${prefix} DOCK-25 : changement de sécurité conserve titre et biens`,async()=>{
  const f=await dockFixture(makeStore,{mode:'OWN'});await f.enter();const moved=await f.move(f.lotId,'DEPOSIT',1),w=await f.store.get(`${f.base}/warehouses/${f.wid}`),lot=await f.store.get(`${f.base}/inventory/${moved.id}`);await f.configure({warehouseId:f.wid,warehouseRevision:w.revision,dock:{...f.dock,securityTier:4},rent:30,capacity:10});const next=await f.store.get(`${f.base}/warehouses/${f.wid}`);assert.equal(next.tenantId,w.tenantId);assert.equal(next.expiresAtGameMs,null);assert.deepEqual(await f.store.get(`${f.base}/inventory/${moved.id}`),lot);
 });
 test(`${prefix} : bail collectif et marchandise personnelle restent distincts`,async()=>{
  const {rosterMembership}=await import('./group-management-suite.mjs'),f=await dockFixture(makeStore);await f.confirm('prepareCommercialStorageRelease','releaseCommercialStorage',{warehouseId:f.wid},f.client);
  await f.cmd('saveGroupRoster',{groupId:'dock-group',groupRevision:0,name:'Dockers',description:'',briefing:'',gmNotes:'',visibility:'SECRET',publicationState:'PUBLISHED',kind:'FACTION',capacity:null,leaderId:null,reason:'Mandats distincts'},f.owner);
  await f.confirm('prepareGroupMembership','applyGroupMembership',{characterId:f.clientId,sourceGroupId:null,targetGroupId:'dock-group',membership:rosterMembership(['readStock','depositStock','withdrawStock','manageStorage']),authorizePermissions:true,reason:'Cellule collective'},f.owner);
  await f.confirm('prepareCommercialStorageRent','rentCommercialStorage',{warehouseId:f.wid,tenantType:'GROUP',groupId:'dock-group',fromAccountId:accountId(f.clientId)},f.client);await f.enter();const moved=await f.move(f.lotId,'DEPOSIT',1),lot=await f.store.get(`${f.base}/inventory/${moved.id}`);assert.equal(lot.ownerType,'CHARACTER');assert.equal(lot.ownerId,f.clientId);assert.equal((await f.store.get(`${f.base}/warehouses/${f.wid}`)).tenantType,'GROUP');await f.move(moved.id,'WITHDRAW',1);
 });
 test(`${prefix} : le code révoqué est revérifié même avant un reçu de mouvement`,async()=>{
  const f=await dockFixture(makeStore);await f.enter();const input={warehouseId:f.wid,lotId:f.lotId,direction:'DEPOSIT',quantity:1},q=await f.read('prepareCommercialStorageMove',input,f.client),p={...input,confirmation:q.confirmation,requestId:randomUUID()};await f.cmd('moveCommercialStorage',p,f.client);await f.cmd('saveLocalCredential',{terminalId:'dock',revision:1,credential:{id:'dock-code',kind:'CODE',name:'Code',active:false,code:'cell-secret'}},f.owner);await assert.rejects(f.cmd('moveCommercialStorage',p,f.client),{code:'LOCAL_CREDENTIAL_REQUIRED'});
 });

}

export function dockIntrusionSuite(makeStore,prefix='Forçage de cellule'){
 test(`${prefix} DOCK-07/08/19/20/21/22 : INF-01 natif, accès dix minutes, aucun mandat de retrait`,async()=>{
  const f=await dockFixture(makeStore),targetId='dock-lock',target={id:targetId,title:'Serrure fictive',description:'Interaction de jeu',publicationState:'PUBLISHED',kind:'INTRUSION',revision:1,failureLockSeconds:0,intrusion:{category:'LOCK',minLevel:2,threshold:6,successText:'Entrée fictive ouverte',failureText:'Échec'}};
  await f.edit(`fieldTargets/${targetId}`,()=>target);await f.edit(`fieldStates/${targetId}`,()=>({id:targetId,status:'ONLINE',revision:1,activeActionId:null,lockedUntilGameMs:0}));
  const w=await f.store.get(`${f.base}/warehouses/${f.wid}`);await f.configure({warehouseId:f.wid,warehouseRevision:w.revision,capacity:10,dock:{...f.dock,intrusionTargetId:targetId}});
  const train=level=>f.edit(`characters/${f.cid}`,c=>({...c,abilityProfile:{...c.abilityProfile,skills:[...c.abilityProfile.skills.filter(x=>x.id!=='INF-01'),{id:'INF-01',level,kind:'PASSIVE'}]}}));
  await train(1);await f.cmd('scanLocalTerminal',{terminalId:'dock'});await assert.rejects(f.cmd('startSoIntrusion',{targetId,present:true}),{code:'SO_INF01_SKILL'});await train(2);
  let a=await f.cmd('startSoIntrusion',{targetId,present:true});f.advance(a.durationSeconds*1000);f.setDie(1);assert.equal((await f.cmd('finishSoIntrusion',{targetId,actionId:a.id,present:true})).success,false);assert.equal((await f.read('dockEntry',{warehouseId:f.wid})).entry,null);
  f.advance(600000);a=await f.cmd('startSoIntrusion',{targetId,present:true});f.advance(a.durationSeconds*1000);f.setDie(6);assert.equal((await f.cmd('finishSoIntrusion',{targetId,actionId:a.id,present:true})).success,true);let d=await f.read('dockEntry',{warehouseId:f.wid});assert.equal(d.entry.method,'INF01');assert.equal(d.canManageStock,false);
  await assert.rejects(f.read('prepareCommercialStorageMove',{warehouseId:f.wid,lotId:f.lotId,direction:'WITHDRAW',quantity:1}),{code:'FORBIDDEN'});f.advance(600000);assert.equal((await f.read('dockEntry',{warehouseId:f.wid})).entry,null);const before=(await f.read('mySession')).actionPoints;await f.edit(`fieldTargets/${targetId}`,t=>({...t,revision:t.revision+1,intrusion:{...t.intrusion,minLevel:1}}));await assert.rejects(f.cmd('startSoIntrusion',{targetId,present:true}),{code:'INVALID_DOCK'});assert.deepEqual((await f.read('mySession')).actionPoints,before);
 });
 test(`${prefix} : absence de scan bloque aussi l’API INF-01 directe`,async()=>{
  const f=await dockFixture(makeStore),targetId='dock-lock';await f.edit(`fieldTargets/${targetId}`,()=>({id:targetId,publicationState:'PUBLISHED',kind:'INTRUSION',revision:1,intrusion:{minLevel:2}}));const w=await f.store.get(`${f.base}/warehouses/${f.wid}`);await f.configure({warehouseId:f.wid,warehouseRevision:w.revision,capacity:10,dock:{...f.dock,intrusionTargetId:targetId}});await assert.rejects(f.cmd('startSoIntrusion',{targetId,present:true}),{code:'LOCAL_SCAN_REQUIRED'});
 });
}
