import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {soVoyagesFixture} from './space-outlaws-voyages-suite.mjs';
import {centralTestItem} from './central-master-suite.mjs';
import {newLot} from '../../src/core/inventory-state.mjs';

export async function sensorFabricationFixture(makeStore,{code='R04-01'}={}){
 const shield=code==='R05-01',vault=code==='R04-02',stem=shield?'Shield':vault?'Vault':'Sensor';
 const f=await soVoyagesFixture(makeStore,{prepareExtra:async(f,rev)=>{
  for(const [id,item] of [['plan',{...centralTestItem,name:'Plan brouilleur',kind:'INDIVIDUAL',consumable:false}],['common',{...centralTestItem,name:'Alliage',referenceUnitValueCr:100}],['rare',{...centralTestItem,name:'Cristaux rares',referenceUnitValueCr:100}],['jammer',{...centralTestItem,name:shield?'Bouclier régénératif cargo':'Brouilleur cargo',kind:'INDIVIDUAL',consumable:false,shipModule:{code,size:2},shipFabrication:{planItemId:'plan',commonItemId:'common',rareItemId:'rare'}}]])await f.cc('saveCentralItem',{itemId:id,itemRevision:0,draftRevision:rev++,item,reason:'Fabrication rare'});
 }});
 const base=`sessions/${f.sid}`;
 await f.store.runTransaction(async tx=>{
  const tech=await tx.get(`${base}/characters/${f.otherId}`),items=await Promise.all(['plan','common','rare'].map(id=>tx.get(`${base}/items/${id}`)));tx.set(`${base}/characters/${f.otherId}`,{...tech,abilityProfile:{...tech.abilityProfile,published:true,skills:[...tech.abilityProfile.skills.filter(k=>k.id!=='MEC-03'),{id:'MEC-03',level:shield?5:4}]}});
  for(const [i,id] of ['plan','common','rare'].entries())tx.set(`${base}/inventory/${id}-lot`,newLot(`${id}-lot`,items[i],[1,shield?40:30,shield?25:15][i],f.cid,Date.now(),{kind:'SCENARIO_VERSION'}));
 });
 const input={shipId:'ship',moduleItemId:'jammer',planLotId:'plan-lot',commonLotId:'common-lot',rareLotId:'rare-lot',technicianId:f.otherId,source:'Atelier à quai',present:true,workshopConfirmed:true};
 const cmd=(a,p,actor=f.player)=>f.cmd(a,{...p,requestId:p.requestId??randomUUID()},actor);
 const offer=async()=>{const d=await f.read(`prepare${stem}FabricationOffer`,input,f.owner);return cmd(`offer${stem}Fabrication`,{...input,confirmation:d.confirmation},f.owner);};
 const approve=async(r)=>{const d=await f.read(`prepare${stem}FabricationApproval`,{fabricationId:r.id});return cmd(`approve${stem}Fabrication`,{fabricationId:r.id,confirmation:d.confirmation,present:true});};
 const start=async(r)=>{const d=await f.read(`prepare${stem}FabricationStart`,{fabricationId:r.id},f.other);return cmd(`start${stem}Fabrication`,{fabricationId:r.id,confirmation:d.confirmation,present:true,workshopConfirmed:true},f.other);};
 return {...f,input,base,offer,approve,start,cmd,stem,lot:id=>f.store.get(`${base}/inventory/${id}-lot`)};
}
export function sensorFabricationSuite(makeStore,prefix='Fabrication rare R04-01'){
 test(`${prefix} : plan et stocks réels, accord, réservation et finalisation personnelle`,async()=>{
  const f=await sensorFabricationFixture(makeStore),before=await f.ship(),r=await f.offer();assert.equal((await f.lot('rare')).quantity,15);assert.equal((await f.ship()).maintenanceId,undefined);
  await f.approve(r);await f.start(r);assert.equal((await f.lot('plan')).status,'FIELD_RESERVED');assert.equal((await f.ship()).maintenanceId,r.id);
  await assert.rejects(f.read('prepareModuleMandateOffer',{shipId:'ship',lotId:'plan-lot',technicianId:f.otherId,present:true,workshopConfirmed:true,source:'Atelier',reason:'Conflit'},f.owner));
  const p=await f.read('sensorFabrication',{fabricationId:r.id},f.other);await assert.rejects(f.cmd('finishSensorFabrication',{fabricationId:r.id,confirmation:p.confirmation,present:true,workshopConfirmed:true,performed:true},f.other),{code:'MODULE_WORK_NOT_READY'});
  f.advance(1200000);const d=await f.read('sensorFabrication',{fabricationId:r.id},f.other);const out=await f.cmd('finishSensorFabrication',{fabricationId:r.id,confirmation:d.confirmation,present:true,workshopConfirmed:true,performed:true,requestId:randomUUID()},f.other);
  assert.equal(out.status,'INSTALLED');assert.equal((await f.lot('common')).quantity,10);assert.equal((await f.lot('rare')).quantity,5);assert.equal((await f.lot('plan')).quantity,1);assert.equal((await f.lot('plan')).status,'AVAILABLE');const ship=await f.ship();assert.equal(ship.maintenanceId,null);assert.equal(ship.modules[0].code,'R04-01');assert.equal(ship.soProfile.hullMax,before.soProfile.hullMax);const lot=await f.store.get(`${f.base}/inventory/${ship.modules[0].lotId}`);assert.equal(lot.origin.kind,'SHIP_RARE_FABRICATION');assert.equal(lot.status,'INSTALLED');assert.equal(lot.ownerId,f.cid);assert.equal(lot.transferable,true);assert.equal(lot.resellable,true);const rem={moduleOperation:'REMOVE',shipId:'ship',lotId:lot.id,technicianId:f.otherId,present:true,workshopConfirmed:true,source:'Atelier',reason:'Retrait prévu'};assert.equal((await f.read('prepareModuleMandateOffer',rem,f.owner)).module.code,'R04-01');
 });
 test(`${prefix} : annulation rend les trois lots et le PA, aucun module créé`,async()=>{
  const f=await sensorFabricationFixture(makeStore),r=await f.offer();await f.approve(r);await f.start(r);const d=await f.read('sensorFabrication',{fabricationId:r.id},f.other);await f.cmd('cancelSensorFabrication',{fabricationId:r.id,confirmation:d.confirmation,reason:'Arrêt',requestId:randomUUID()},f.other);assert.equal((await f.lot('rare')).quantity,15);assert.equal((await f.lot('common')).status,'AVAILABLE');assert.equal((await f.lot('plan')).status,'AVAILABLE');assert.equal((await f.ship()).modules.length,0);assert.equal((await f.ship()).maintenanceId,null);assert.equal((await f.store.get(`${f.base}/characters/${f.otherId}/resources/actionPoints`)).reserved,0);
 });
 test(`${prefix} : STOP suspend la fin, révocation et annulation MJ libèrent sans création`,async()=>{
  const f=await sensorFabricationFixture(makeStore),r=await f.offer();await f.approve(r);await f.start(r);await f.cmd('stopSafety',{reason:'STOP'});f.advance(1200000);const d=await f.read('sensorFabrication',{fabricationId:r.id},f.other);await assert.rejects(f.cmd('finishSensorFabrication',{fabricationId:r.id,confirmation:d.confirmation,present:true,workshopConfirmed:true,performed:true},f.other),{code:'FORBIDDEN'});const s=await f.read('session',{},f.owner);await f.cmd('resumeSafety',{revision:s.revision,reason:'Reprise'},f.owner);await f.cmd('revokeAccess',{uid:f.other.uid},f.owner);await assert.rejects(f.read('sensorFabrication',{fabricationId:r.id},f.other),{code:'FORBIDDEN'});const a=await f.read('sensorFabricationAdmin',{fabricationId:r.id},f.owner);await f.cmd('cancelSensorFabricationAdmin',{fabricationId:r.id,confirmation:a.confirmation,reason:'Mécano indisponible',requestId:randomUUID()},f.owner);assert.equal((await f.lot('rare')).status,'AVAILABLE');assert.equal((await f.ship()).modules.length,0);
 });
 test(`${prefix} : coûts insuffisants et plan réservé refusés avant toute offre`,async()=>{
  const f=await sensorFabricationFixture(makeStore);await f.store.runTransaction(async tx=>{const p=`${f.base}/inventory/rare-lot`,l=await tx.get(p);tx.set(p,{...l,quantity:9,revision:l.revision+1});});await assert.rejects(f.read('prepareSensorFabricationOffer',f.input,f.owner),{code:'MODULE_MATERIAL_UNAVAILABLE'});assert.deepEqual(await f.store.list(`${f.base}/shipMaintenance`),[]);
 });
}
