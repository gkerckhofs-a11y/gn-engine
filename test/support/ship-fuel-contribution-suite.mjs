import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {shipCrewFixture,crewPermissions} from './ship-crew-suite.mjs';
export async function contributionFixture(makeStore){
 const f=await shipCrewFixture(makeStore),inv=await f.invite();await f.respond(inv.id);
 const lot=(await f.read('myInventory')).lots.find(l=>l.item.id==='propellant');
 const give=async(p,source=f.player,recipient=f.other)=>{const q=await f.read('prepareLotTransfer',p,source),out=await f.cmd('proposeLotTransfer',{...p,confirmation:q.confirmation},source),v=await f.read('lotTransferDetail',{transferId:out.id},recipient),payload={transferId:out.id,confirmation:v.confirmation,received:true,requestId:randomUUID()},r=await f.cmd('acceptLotTransfer',payload,recipient);return {out,r,payload};};
 const first=await give({lotId:lot.id,recipientId:f.otherId,quantity:6});
 return {...f,give,donorLotId:first.r.receivedLotId,input:{lotId:first.r.receivedLotId,recipientId:f.cid,quantity:2,contributionShipId:'ship'}};
}
export function shipFuelContributionSuite(makeStore,prefix='Contribution carburant'){
 test(`${prefix} : remise partielle volontaire, puis ravitaillement natif unique en deux minutes`,async()=>{
  const f=await contributionFixture(makeStore),before=await f.ship(),wallet=await f.read('myWallet'),points=await f.store.get(`sessions/${f.sid}/characters/${f.cid}/resources/actionPoints`),q=await f.read('prepareLotTransfer',f.input,f.other);assert.equal(q.contribution.shipId,'ship');assert.equal(q.contribution.guard,undefined);
  const offered=await f.cmd('proposeLotTransfer',{...f.input,confirmation:q.confirmation},f.other);assert.deepEqual(await f.ship(),before);assert.equal((await f.read('myInventory',{},f.other)).lots.find(l=>l.id===f.donorLotId).quantity,6);
  const d=await f.read('lotTransferDetail',{transferId:offered.id}),p={transferId:offered.id,confirmation:d.confirmation,received:true,requestId:randomUUID()},r=await f.cmd('acceptLotTransfer',p);assert.deepEqual(await f.cmd('acceptLotTransfer',p),r);assert.deepEqual(await f.ship(),before);
  const refill={shipId:'ship',lotId:r.receivedLotId,quantity:2},v=await f.read('prepareRefuel',refill),start={...refill,present:true,confirmation:v.confirmation,requestId:randomUUID()},op=await f.cmd('refuelShip',start);assert.deepEqual(await f.cmd('refuelShip',start),op);assert.equal((await f.ship()).fuel,0);await assert.rejects(f.navCommand('finishSoRefuel'),{code:'VOYAGE_NOT_READY'});f.advance(120000);await f.navCommand('finishSoRefuel');assert.equal((await f.ship()).fuel,2);assert.equal((await f.read('myInventory',{},f.other)).lots.find(l=>l.id===f.donorLotId).quantity,4);assert.deepEqual(await f.read('myWallet'),wallet);assert.deepEqual(await f.store.get(`sessions/${f.sid}/characters/${f.cid}/resources/actionPoints`),points);
 });
 test(`${prefix} : révocation ou changement de pilote invalide une proposition sans créer de droits`,async()=>{
  for(const change of ['REMOVE','PILOT']){const f=await contributionFixture(makeStore),q=await f.read('prepareLotTransfer',f.input,f.other),out=await f.cmd('proposeLotTransfer',{...f.input,confirmation:q.confirmation},f.other);if(change==='REMOVE')await f.change('REMOVE');else{await f.change('ROLE',f.otherId,{role:'PILOT',permissions:crewPermissions});await f.pilot();}const d=await f.read('lotTransferDetail',{transferId:out.id});assert.equal(d.canAccept,false);await assert.rejects(f.cmd('acceptLotTransfer',{transferId:out.id,confirmation:d.confirmation,received:true}),{code:'STALE_TRANSFER'});assert.equal((await f.ship()).fuel,0);assert.equal((await f.read('myInventory',{},f.other)).lots.find(l=>l.id===f.donorLotId).quantity,6);}
 });
 test(`${prefix} : deux propositions concurrentes n’utilisent pas deux fois un lot`,async()=>{
  const f=await contributionFixture(makeStore),p={...f.input,quantity:6},q=await f.read('prepareLotTransfer',p,f.other),offers=await Promise.all([f.cmd('proposeLotTransfer',{...p,confirmation:q.confirmation},f.other),f.cmd('proposeLotTransfer',{...p,confirmation:q.confirmation},f.other)]),inputs=await Promise.all(offers.map(async o=>{const d=await f.read('lotTransferDetail',{transferId:o.id});return {transferId:o.id,confirmation:d.confirmation,received:true};})),results=await Promise.allSettled(inputs.map(p=>f.cmd('acceptLotTransfer',p)));assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal((await f.ship()).fuel,0);assert.equal((await f.read('myInventory',{},f.other)).lots.filter(l=>l.id===f.donorLotId).reduce((n,l)=>n+l.quantity,0),0);
 });
 test(`${prefix} : lot protégé, faux pilote et membre sans permission refusés`,async()=>{
  const f=await contributionFixture(makeStore);await assert.rejects(f.read('prepareLotTransfer',{...f.input,recipientId:f.otherId},f.other),{code:'INVALID_RECIPIENT'});await f.change('ROLE',f.otherId,{role:'MEMBER',permissions:{...crewPermissions,fuelContribution:false}});await assert.rejects(f.read('prepareLotTransfer',f.input,f.other),{code:'FORBIDDEN'});assert.equal((await f.ship()).fuel,0);
  const g=await shipCrewFixture(makeStore,{restrictedFuel:true}),inv=await g.invite();await g.respond(inv.id);const lot=(await g.read('myInventory')).lots.find(l=>l.item.id==='propellant');await assert.rejects(g.read('prepareLotTransfer',{lotId:lot.id,recipientId:g.otherId,quantity:1,contributionShipId:'ship'}),{code:'SO_PERSONAL_TRANSFER_RESTRICTED'});
 });
}
