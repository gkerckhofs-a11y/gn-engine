import test from 'node:test';
import assert from 'node:assert/strict';
import {towingOutageSuite} from './support/space-towing-outage-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
import {startTowingOutage} from '../src/core/space-towing-outage.mjs';
towingOutageSuite(()=>new MemoryStore());
test('Attente MOD-05 : aucun changement pour autre module ou voyage sans attelage',()=>{for(const j of [{id:'j'}, {id:'j',towing:{lotId:'m'}}])assert.deepEqual(startTowingOutage(j,{neutralizedModule:{code:'MOD-01',lotId:'other'}},0),j);assert.deepEqual(startTowingOutage({id:'j'},{neutralizedModule:{code:'MOD-05',lotId:'m'}},0),{id:'j'});});
