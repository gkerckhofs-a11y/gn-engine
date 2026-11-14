import {MemoryStore} from './support/memory.mjs';
import {itemCircuitsSuite} from './support/item-circuits-suite.mjs';
itemCircuitsSuite(()=>new MemoryStore());
