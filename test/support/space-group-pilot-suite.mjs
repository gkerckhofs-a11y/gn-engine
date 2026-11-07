import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {rosterMembership} from './group-management-suite.mjs';
import {episodeHarness} from './space-episodes-suite.mjs';

export async function spaceGroupPilotFixture(makeStore,{riskId='SECURED',provision=true}={}){
 const f=await soVoyagesFixture(makeStore,{riskId,restrictedFuel:false}),groupId='faction-secrete',shipId='collective';
 const get=path=>f.store.get(`sessions/${f.sid}${path?'/'+path:''}`);
 await f.cmd('saveGroupRoster',{
  groupId,groupRevision:0,name:'Escadron secret',description:'',briefing:'',gmNotes:'',
  visibility:'SECRET',publicationState:'PUBLISHED',kind:'FACTION',capacity:null,leaderId:null,reason:'Groupe configuré'
 },f.owner);
 const membership=async(cid,from,to,permissions=['pilotShip'])=>{
  const input={characterId:cid,sourceGroupId:from,targetGroupId:to,
   membership:to?rosterMembership(permissions):null,authorizePermissions:!!to,reason:'Vérification du mandat'};
  const p=await f.read('prepareGroupMembership',input,f.owner);
  return f.cmd('applyGroupMembership',{...input,confirmation:p.confirmation},f.owner);
 };
 const input=f.provisionInput({shipId,ownerId:undefined,groupId,name:'Navette collective'});
 if(provision){
  await membership(f.cid,null,groupId);
  await f.provision(input);
 }
 const ship=()=>get(`ships/${shipId}`);
 const refuelGroup=async quantity=>{
  const lot=(await f.navigation(shipId)).lots.find(l=>l.quantity>=quantity);
  const p={shipId,lotId:lot.id,quantity},q=await f.read('prepareRefuel',p);
  await f.cmd('refuelShip',{...p,confirmation:q.confirmation,present:true});
  f.advance(120000);
  return f.navCommand('finishSoRefuel',{shipId});
 };
 const adminNavigation=async(action,reason)=>{
  const sh=(await f.read('spaceportAdmin',{},f.owner)).ships.find(s=>s.shipId===shipId);
  return f.cmd(action,{shipId,confirmation:sh.confirmation,reason},f.owner);
 };
 const plan={shipId,navigationCode:'AWAY-CODE',passengerCodes:[]};
 const reserve=async(p=plan)=>{
  const quote=await f.read('prepareVoyage',p);
  const request={...p,confirmation:quote.confirmation,present:true,requestId:randomUUID()};
  await f.cmd('departShip',request);
  return request;
 };
 return {...f,get,groupId,shipId,ship,input,plan,membership,reserve,refuelGroup,adminNavigation};
}

export function spaceGroupPilotSuite(makeStore,prefix='Pilotage de groupe SO'){
 test(`${prefix} : attribution MJ avec mandat courant, propriété du groupe et carburant initial nul`,async()=>{
  const f=await spaceGroupPilotFixture(makeStore,{provision:false});
  await assert.rejects(f.read('prepareSoShip',f.input,f.owner),{code:'FORBIDDEN'});
  await assert.rejects(f.read('prepareSoShip',f.input),{code:'FORBIDDEN'});
  await f.membership(f.cid,null,f.groupId);
  const initial=await f.read('prepareSoShip',f.input,f.owner);
  await f.membership(f.cid,f.groupId,null);
  await f.membership(f.cid,null,f.groupId);
  await assert.rejects(f.cmd('provisionSoShip',{...f.input,confirmation:initial.confirmation},f.owner),{code:'STALE_REVISION'});
  await f.provision(f.input);
  const ship=await f.ship();
  assert.deepEqual([ship.ownerType,ship.ownerId,ship.pilotId,ship.groupPilotId,ship.fuel],['GROUP',f.groupId,null,f.cid,0]);
  assert.equal((await f.navigation(f.shipId)).canPilot,true);
  assert.equal((await f.navigation(f.shipId)).ship.ownerId,undefined);
  await f.membership(f.otherId,null,f.groupId);
  await assert.rejects(f.navigation(f.shipId,f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : vol natif avec un PA, carburant consommé une fois et voyage conservé`,async()=>{
  const f=await spaceGroupPilotFixture(makeStore);
  await f.refuelGroup(5);
  const pa=await f.points(),input={...f.plan,passengerCodes:[f.otherId]};
  await f.reserve(input);
  assert.equal((await f.ship()).fuel,5);
  await assert.rejects(f.navigation(f.shipId,f.other),{code:'FORBIDDEN'});
  f.advance(180000);
  await f.navCommand('finishSoPreparation',{shipId:f.shipId});
  assert.equal((await f.ship()).fuel,3);
  assert.equal((await f.points()).available,pa.available-1);
  assert.equal((await f.navigation(f.shipId,f.other)).canPilot,false);
  await f.membership(f.cid,f.groupId,null);
  assert.equal((await f.navigation(f.shipId)).canPilot,false);
  await assert.rejects(f.cmd('arriveShip',{shipId:f.shipId,confirmation:(await f.navigation(f.shipId)).confirmation}),{code:'FORBIDDEN'});
  f.advance(300000);
  await f.adminNavigation('arriveSoShipAdmin','Arrivée attestée');
  assert.deepEqual([(await f.ship()).ownerId,(await f.ship()).portId,(await f.ship()).journey],[f.groupId,'away',null]);
  const e=await episodeHarness(f);await e.close();await e.resume(await e.begin());
  assert.deepEqual(await e.get(`ships/${f.shipId}`),await f.ship());
  assert.equal((await e.read('mySpaceport',{},f.player)).ships.some(s=>s.shipId===f.shipId),false);
 });
 test(`${prefix} : révocation invalide préparation et ancien reçu, annulation MJ restitue le PA`,async()=>{
  const f=await spaceGroupPilotFixture(makeStore);
  await f.refuelGroup(4);
  const pa=await f.points(),request=await f.reserve();
  await f.cmd('stopSafety',{reason:'STOP de test'});
  await assert.rejects(f.cmd('departShip',request),{code:'SO_SAFETY_STOP'});
  await f.cmd('resumeSafety',{revision:(await f.get('')).revision,reason:'Reprise autorisée'},f.owner);
  await f.membership(f.cid,f.groupId,null);
  await assert.rejects(f.cmd('departShip',request),{code:'FORBIDDEN'});
  await assert.rejects(f.navigation(f.shipId),{code:'FORBIDDEN'});
  await f.membership(f.cid,null,f.groupId);
  assert.equal((await f.navigation(f.shipId)).mandateChanged,true);
  assert.equal((await f.navigation(f.shipId)).canAct,false);
  await assert.rejects(f.cmd('departShip',request),{code:'FORBIDDEN'});
  f.advance(180000);
  await assert.rejects(f.navCommand('finishSoPreparation',{shipId:f.shipId}),{code:'FORBIDDEN'});
  await f.adminNavigation('cancelSoNavigationAdmin','Mandat retiré');
  assert.deepEqual([(await f.ship()).operation,(await f.ship()).fuel],[null,4]);
  assert.equal((await f.points()).available,pa.available);
 });
 test(`${prefix} : relève soumise au mandat, contrôle de capacité et périmètre autonome`,async()=>{
  const f=await spaceGroupPilotFixture(makeStore);
  const input={shipId:f.shipId,pilotId:f.otherId,reason:'Relève constatée'};
  await assert.rejects(f.read('prepareSoPilot',input,f.owner),{code:'FORBIDDEN'});
  await f.membership(f.otherId,null,f.groupId);
  await f.refuelGroup(2);
  await assert.rejects(f.read('prepareVoyage',f.plan),{code:'INSUFFICIENT_FUEL'});
  await assert.rejects(f.read('prepareSoConvoy',{shipId:f.shipId,escortShipId:'ship',navigationCode:'AWAY-CODE'}),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await assert.rejects(f.read('shipHold',{shipId:f.shipId}),{code:'FORBIDDEN'});
  const q=await f.read('prepareSoPilot',input,f.owner);
  await f.cmd('changeSoPilot',{...input,confirmation:q.confirmation,present:true},f.owner);
  assert.equal((await f.ship()).groupPilotId,f.otherId);
  assert.equal((await f.ship()).pilotId,null);
  await assert.rejects(f.navigation(f.shipId),{code:'FORBIDDEN'});
  assert.equal((await f.navigation(f.shipId,f.other)).canPilot,true);
 });
 test(`${prefix} : liaison dangereuse et ancienne version fermées`,async()=>{
  const f=await spaceGroupPilotFixture(makeStore,{riskId:'DANGEROUS'});
  await f.refuelGroup(5);
  await assert.rejects(f.read('prepareVoyage',f.plan),{code:'SO_GROUP_ROUTE_REQUIRED'});
  const path=`sessions/${f.sid}`;
  await f.store.runTransaction(async tx=>{
   const s=await tx.get(path),{groupPilotVersion,...spaceOutlaws}=s.spaceOutlaws;
   tx.set(path,{...s,spaceOutlaws});
  });
  await assert.rejects(f.navigation(f.shipId),{code:'SO_GAMEPLAY_NOT_OPEN'});
  await assert.rejects(f.read('prepareSoShip',f.input,f.owner),{code:'SO_GAMEPLAY_NOT_OPEN'});
 });
}
