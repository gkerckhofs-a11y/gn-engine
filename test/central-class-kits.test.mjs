import test from 'node:test';
import assert from 'node:assert/strict';
import {centralClassKitsSuite} from './support/central-class-kits-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {initialClassKit} from '../src/shared/initial-class-kit.mjs';
centralClassKitsSuite(()=>new MemoryStore());
test('Kits V0.7 : huit compositions canoniques sans quantité ou avantage libre',()=>{
 const expected={COM:[['armor',1],['field-supplies',1]],ROG:[['discretion-pouch',1]],TRA:[['investigation-scanner',1]],MED:[['medical-tool',1],['medical-supplies',2]],MEC:[['mechanical-tools',1],['repair-supplies',2],['parts',1]],PIL:[['navigation-terminal',1]],COU:[['commercial-terminal',1]],INF:[['intrusion-interface',1],['blank-forms',2]]};
 for(const [id,slots] of Object.entries(expected)){const k=initialClassKit(id);assert.deepEqual(k.slots.map(s=>[s.id,s.quantity]),[['communicator',1],['weapon',1],...slots]);assert.equal(k.startingCredits,200);assert.equal(k.activationAvailable,false);assert.equal(k.pillable,false);assert.equal(k.resellable,false);assert.deepEqual(k.slots.filter(s=>s.requiresConsumable).map(s=>s.id),id==='MED'?['medical-supplies']:id==='MEC'?['repair-supplies']:[]);}
 assert.equal(initialClassKit('PNJ_FORCE_SENSITIVE'),null);assert.match(initialClassKit('MEC').slots.at(-1).label,/50 Cr/);assert.match(initialClassKit('ROG').note,/Aucune cache/);assert.match(initialClassKit('TRA').note,/Aucun bonus/);assert.match(initialClassKit('PIL').note,/Codes commerciaux publics/);assert.match(initialClassKit('COU').note,/Contacts initiaux/);
 const changed=initialClassKit('MED');changed.slots[0].quantity=99;assert.equal(initialClassKit('MED').slots[0].quantity,1);
});
