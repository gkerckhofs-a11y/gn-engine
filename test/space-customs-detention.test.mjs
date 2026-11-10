import test from 'node:test';
import assert from 'node:assert/strict';
import {customsDetentionSuite} from './support/space-customs-detention-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {effectiveLot} from '../src/core/inventory-state.mjs';
import {customsHoldLimitMs} from '../src/core/space-customs-detention.mjs';
customsDetentionSuite(()=>new MemoryStore());
test('Retenue : échéance strictement réelle, sans changement d’origine ni propriété',()=>{
 assert.equal(customsHoldLimitMs,900000);
 const raw={id:'lot',status:'CUSTOMS_HELD',revision:3,ownerId:'a',holderId:'a',
  origin:{kind:'SO_FORGERY',actionId:'a1'},customsDetention:{id:'case',expiresAt:1000900}};
 const before=effectiveLot(raw,1000899),after=effectiveLot(raw,1000900);
 assert.equal(before.status,'CUSTOMS_HELD');
 assert.equal(after.status,'AVAILABLE');
 assert.equal(after.revision,4);
 assert.equal(after.ownerId,'a');assert.equal(after.holderId,'a');
 assert.deepEqual(after.origin,raw.origin);
 assert.equal(after.customsDetention,null);
 assert.equal(raw.status,'CUSTOMS_HELD');
});
