import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {shipCrewFixture,crewPermissions} from './ship-crew-suite.mjs';
import {classifyMaster} from './item-circuits-suite.mjs';
import {newLot} from '../../src/core/inventory-state.mjs';
export async function crewCargoFixture(makeStore,{ownerFreight=false}={}){
 const f=await shipCrewFixture(makeStore,{prepareExtra:f=>classifyMaster(f,'COMMERCIAL')}),i=await f.invite(f.otherId,'FREIGHT',{permissions:{...crewPermissions,logistics:true,ownerFreight}});await f.respond(i.id);
 const item=await f.store.get(`sessions/${f.sid}/items/kit_medical-supplies`);
 const seed=async(ownerId=f.otherId,location={kind:'COMMERCIAL',id:ownerId,portId:'home'},patch={})=>{const lot={...newLot(randomUUID(),item,3,ownerId,1000000,{kind:'TEST_FIXTURE'}),location,...patch};await f.store.runTransaction(async tx=>tx.set(`sessions/${f.sid}/inventory/${lot.id}`,lot));return lot;};
 const start=async(lot,destination={kind:'HOLD',id:'ship'},actor=f.other)=>{const p={lotId:lot.id,quantity:1,destination},q=await f.read('prepareCargoTransfer',p,actor);return f.cmd('startCargoTransfer',{...p,confirmation:q.confirmation,present:true},actor);};
 const finish=async(id,actor=f.other)=>{f.advance(180000);const p=await f.read('prepareCargoReceipt',{transferId:id},actor);return f.cmd('receiveCargoTransfer',{transferId:id,confirmation:p.confirmation,received:true},actor);};return {...f,seed,startCargo:start,finishCargo:finish};
}
export function crewCargoSuite(makeStore,prefix='Fret équipage'){
 test(`${prefix} : responsable non Courtier, droits de soute et propriété des lots distincts`,async()=>{
  const f=await crewCargoFixture(makeStore),lot=await f.seed(),wallet=await f.read('myWallet',{},f.other),points=await f.store.get(`sessions/${f.sid}/characters/${f.otherId}/resources/actionPoints`);await assert.rejects(f.read('market',{},f.other),{code:'FORBIDDEN'});const t=await f.startCargo(lot);await f.finishCargo(t.id);const hold=await f.read('shipHold',{shipId:'ship'},f.other);assert.equal(hold.stock.length,1);assert.equal(hold.stock[0].ownerId,f.otherId);assert.deepEqual(await f.read('myWallet',{},f.other),wallet);assert.deepEqual(await f.store.get(`sessions/${f.sid}/characters/${f.otherId}/resources/actionPoints`),points);assert.equal((await f.ship()).ownerId,f.cid);
 });
 test(`${prefix} : mandat logistique ne révèle ni autres propriétaires, ni fret caché ou sous contrat`,async()=>{
  const f=await crewCargoFixture(makeStore),owned=await f.seed(f.cid,{kind:'HOLD',id:'ship'}),hidden=await f.seed(f.cid,{kind:'HOLD',id:'ship'},{hiddenCargo:{concealed:true}});await f.seed('third-party',{kind:'HOLD',id:'ship'});await f.seed(f.cid,{kind:'HOLD',id:'ship'},{transportContractId:'private-contract'});const hold=await f.read('shipHold',{shipId:'ship'},f.other);assert.deepEqual(hold.stock,[]);await assert.rejects(f.read('cargoLot',{lotId:owned.id},f.other),{code:'FORBIDDEN'});await assert.rejects(f.read('cargoLot',{lotId:hidden.id},f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : mandat explicite du propriétaire permet un déchargement sans vente ni transfert de biens`,async()=>{
  const f=await crewCargoFixture(makeStore,{ownerFreight:true}),lot=await f.seed(f.cid,{kind:'HOLD',id:'ship'});await f.seed('third-party',{kind:'HOLD',id:'ship'});await f.seed(f.cid,{kind:'HOLD',id:'ship'},{hiddenCargo:{concealed:true}});const hold=await f.read('shipHold',{shipId:'ship'},f.other);assert.equal(hold.stock.length,1);const t=await f.startCargo(lot,{kind:'COMMERCIAL',id:f.cid,portId:'home'}),r=await f.finishCargo(t.id);const moved=await f.store.get(`sessions/${f.sid}/inventory/${r.lotId}`);assert.equal(moved.ownerId,f.cid);assert.equal(moved.location.id,f.cid);assert.equal(moved.location.kind,'COMMERCIAL');await assert.rejects(f.read('prepareLotSale',{lotId:moved.id,buyerId:f.cid,quantity:1,amount:5,minutes:10,pickupPlace:'Port',conditions:'Interdit'},f.other),{code:'FORBIDDEN'});
 });
 test(`${prefix} : retrait en cours de manutention préserve la réservation et autorise seulement sa clôture`,async()=>{
  const f=await crewCargoFixture(makeStore),lot=await f.seed(),t=await f.startCargo(lot);const before=await f.store.get(`sessions/${f.sid}/cargoTransfers/${t.id}`);await f.change('REMOVE');assert.deepEqual(await f.store.get(`sessions/${f.sid}/cargoTransfers/${t.id}`),before);await assert.rejects(f.read('shipHold',{shipId:'ship'},f.other),{code:'FORBIDDEN'});assert.ok((await f.read('myCargo',{},f.other)).transfers.some(x=>x.id===t.id));f.advance(180000);const q=await f.read('prepareCargoReceipt',{transferId:t.id},f.other),p={transferId:t.id,confirmation:q.confirmation,received:true,requestId:randomUUID()},result=await f.cmd('receiveCargoTransfer',p,f.other);assert.deepEqual(await f.cmd('receiveCargoTransfer',p,f.other),result);await assert.rejects(f.startCargo(lot),{code:'FORBIDDEN'});assert.equal((await f.store.get(`sessions/${f.sid}/inventory/${t.lotId}`)).quantity,1);assert.equal((await f.store.get(`sessions/${f.sid}/characters/${f.otherId}`)).activeCargoId,null);
 });
 test(`${prefix} : changement de capitaine conserve la clôture d’une manutention déjà engagée`,async()=>{
  const f=await crewCargoFixture(makeStore),cap=await f.captain();await f.respond(cap.id);const lot=await f.seed(),t=await f.startCargo(lot),next=await f.captain(f.cid);await f.respond(next.id,true,f.player);const d=await f.read('shipWorkspace',{shipId:'ship'},f.other);assert.equal(d.ship.role,'MEMBER');assert.equal(d.ship.permissions.logistics,false);await f.finishCargo(t.id);assert.equal((await f.read('shipWorkspace',{shipId:'ship'})).ship.role,'OWNER');assert.equal((await f.ship()).ownerId,f.cid);
 });

}
