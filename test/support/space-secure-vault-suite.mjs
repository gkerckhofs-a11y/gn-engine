import test from 'node:test';
import assert from 'node:assert/strict';
import {newLot} from '../../src/core/inventory-state.mjs';
import {secureVaultQuote} from '../../src/shared/space-ship-modules.mjs';
import {sensorFabricationFixture} from './space-sensor-fabrication-suite.mjs';

export function secureVaultSuite(makeStore,prefix='Coffre rare R04-02'){
 test(`${prefix} : N4, cargo seulement, plan conservé et pose à 20 minutes`,async()=>{
  assert.equal(secureVaultQuote({code:'R04-02',size:1}),null);
  const q=secureVaultQuote({code:'R04-02',size:2});assert.equal(q.price,3000);assert.equal(q.commonCost,2000);assert.equal(q.rareCost,1000);assert.equal(q.capacity,5);
  const f=await sensorFabricationFixture(makeStore,{code:'R04-02'}),r=await f.offer();await f.approve(r);const start=await f.start(r);assert.equal(start.readyAtGameMs-(await f.store.get(`${f.base}/shipMaintenance/${r.id}`)).startedAtGameMs,1200000);
  f.advance(1200000);const d=await f.read('vaultFabrication',{fabricationId:r.id},f.other),out=await f.cmd('finishVaultFabrication',{fabricationId:r.id,confirmation:d.confirmation,present:true,workshopConfirmed:true,performed:true},f.other);
  assert.equal(out.status,'INSTALLED');assert.equal((await f.ship()).modules[0].code,'R04-02');assert.equal((await f.lot('common')).quantity,10);assert.equal((await f.lot('rare')).quantity,5);assert.equal((await f.lot('plan')).quantity,1);
 });
 test(`${prefix} : verrou réel, capacité cinq, transfert refusé, ouverture et réessai`,async()=>{
  const f=await sensorFabricationFixture(makeStore,{code:'R04-02'}),r=await f.offer();await f.approve(r);await f.start(r);f.advance(1200000);const d=await f.read('vaultFabrication',{fabricationId:r.id},f.other);await f.cmd('finishVaultFabrication',{fabricationId:r.id,confirmation:d.confirmation,present:true,workshopConfirmed:true,performed:true},f.other);
  await f.store.runTransaction(async tx=>{const item=await tx.get(`${f.base}/items/propellant`),lot=newLot('vault-stock',item,5,f.cid,Date.now(),{kind:'SCENARIO_VERSION'}),other=newLot('other-stock',item,1,f.cid,Date.now(),{kind:'SCENARIO_VERSION'});for(const l of [lot,other])tx.set(`${f.base}/inventory/${l.id}`,{...l,holderId:'ship',location:{kind:'HOLD',id:'ship'}});});
  const p={sessionId:f.sid,shipId:'ship',lotId:'vault-stock',secure:true},preview=await f.read('prepareVaultCargo',p),input={...p,confirmation:preview.confirmation,present:true,requestId:'vault-lock'};
  await assert.rejects(f.read('vaultCargo',{shipId:'ship'},f.other),{code:'FORBIDDEN'});
  const out=await f.cmd('setVaultCargo',input);assert.deepEqual(await f.cmd('setVaultCargo',input),out);assert.equal((await f.read('vaultCargo',{shipId:'ship'})).used,5);
  const moduleLotId=(await f.ship()).modules[0].lotId,removal={moduleOperation:'REMOVE',shipId:'ship',lotId:moduleLotId,technicianId:f.otherId,present:true,workshopConfirmed:true,source:'Atelier',reason:'Dépose'};
  await assert.rejects(f.read('prepareModuleMandateOffer',removal,f.owner),{code:'MODULE_CONTENT_NOT_EMPTY'});
  await assert.rejects(f.read('prepareVaultCargo',{shipId:'ship',lotId:'other-stock',secure:true}),{code:'VAULT_CAPACITY'});
  await assert.rejects(f.read('prepareCargoTransfer',{lotId:'vault-stock',quantity:1,destination:{kind:'HOLD',id:'ship'}}),{code:'VAULT_LOCKED'});
  const unlock={...p,secure:false},u=await f.read('prepareVaultCargo',unlock);await f.cmd('setVaultCargo',{...unlock,confirmation:u.confirmation,present:true,requestId:'vault-open'});assert.equal((await f.read('vaultCargo',{shipId:'ship'})).used,0);
  assert.equal((await f.read('prepareModuleMandateOffer',removal,f.owner)).module.code,'R04-02');
 });
}
