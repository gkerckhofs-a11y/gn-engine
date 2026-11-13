import test from 'node:test';
import assert from 'node:assert/strict';
import {MemoryStore} from './support/memory.mjs';
import {inventoryFixture} from './support/inventory-suite.mjs';
import {spaceLogisticsFixture} from './support/space-logistics-suite.mjs';
import {soInventoryHtml} from '../web/shops.mjs';
async function fixture(){
 const f=await inventoryFixture(()=>new MemoryStore()),base=`sessions/${f.sessionId}`;
 const edit=(path,fn)=>f.store.runTransaction(async tx=>tx.set(base+path,fn(await tx.get(base+path))));
 await edit('',s=>({...s,spaceOutlaws:{actionsVersion:1}}));
 const lot=await f.lot();await edit(`/inventory/${lot.id}`,l=>({...l,transferable:true,origin:{kind:'SCENARIO_GRANT'}}));
 const input={sessionId:f.sessionId,lotId:lot.id,recipientId:f.characters[1],quantity:1};
 const propose=async(recipientId=f.characters[1])=>{const p={...input,recipientId},q=await f.read('prepareLotTransfer',f.alice,p);return f.cmd('proposeLotTransfer',f.alice,{...p,confirmation:q.confirmation});};
 const accept=async(id,who=f.bob)=>{const p={sessionId:f.sessionId,transferId:id},q=await f.read('lotTransferDetail',who,p);return f.cmd('acceptLotTransfer',who,{...p,confirmation:q.confirmation,received:true});};
 return {...f,edit,input,propose,accept};
}
test('SO sac : remise partielle confirmée, droits conservés et affichage dans les deux sacs',async()=>{
 const f=await fixture(),p=await f.propose();assert.equal((await f.lot()).quantity,3);
 const html=soInventoryHtml(await f.bag(),null);assert.match(html,/Remettre à un joueur/);assert.match(html,/Mes remises/);assert.doesNotMatch(html,/Charger dans une soute/);
 const r=await f.accept(p.id);assert.equal((await f.lot()).quantity,2);const got=(await f.bag(f.bob)).lots.find(l=>l.id===r.receivedLotId);assert.equal(got.quantity,1);assert.equal(got.transferable,true);assert.equal(got.canTransferByHand,true);
});
test('SO sac : équipement initial, restriction et fret confié refusés dès l’aperçu',async()=>{
 for(const patch of [{origin:{kind:'SO_BIRTH'}},{transferable:false},{transportContractId:'contract'},{boardingCustody:{id:'custody'}}]){
  const f=await fixture();await f.edit(`/inventory/${f.input.lotId}`,l=>({...l,...patch}));assert.equal((await f.lot()).canTransferByHand,false);
  await assert.rejects(f.read('prepareLotTransfer',f.alice,f.input),{code:'SO_PERSONAL_TRANSFER_RESTRICTED'});
 }
});
test('SO sac : STOP, décès ou restriction après proposition empêchent la réception',async()=>{
 for(const mode of ['stop','dead','restriction','captivity','busy']){const f=await fixture(),p=await f.propose();
  if(mode==='captivity'){await f.edit('',s=>({...s,spaceOutlaws:{...s.spaceOutlaws,escapeVersion:1}}));await f.edit(`/soCaptivities/${f.characters[1]}`,()=>({status:'ACTIVE'}));}
  if(mode==='busy')await f.edit(`/characters/${f.characters[1]}`,c=>({...c,activeFieldActionId:'action'}));
  if(mode==='stop')await f.edit('',s=>({...s,safetyStop:{active:true}}));
  if(mode==='dead')await f.edit(`/characters/${f.characters[1]}`,c=>({...c,survival:{dead:true}}));
  if(mode==='restriction')await f.edit(`/inventory/${f.input.lotId}`,l=>({...l,transferable:false}));
  await assert.rejects(f.accept(p.id),{code:mode==='restriction'?'STALE_TRANSFER':'OUT_OF_COMBAT'});assert.equal((await f.lot()).quantity,3);
 }
});
test('SO sac : deux remises concurrentes du même exemplaire ne dupliquent rien',async()=>{
 const f=await fixture();await f.edit(`/inventory/${f.input.lotId}`,l=>({...l,quantity:1}));const a=await f.propose(),b=await f.propose(f.characters[2]);
 const results=await Promise.allSettled([f.accept(a.id),f.accept(b.id,f.eve)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
});
test('SO fret : un volume positif ne permet jamais de charger un objet du sac',async()=>{
 const f=await spaceLogisticsFixture(()=>new MemoryStore()),l=await f.fuelLot(),d=await f.read('cargoLot',{lotId:l.id});assert.equal(d.canMove,false);assert.deepEqual(d.destinations,[]);
 await assert.rejects(f.move(l.id,1),{code:'SO_PERSONAL_NOT_FREIGHT'});assert.equal((await f.fuelLot()).quantity,l.quantity);
});
