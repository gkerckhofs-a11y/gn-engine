import {MemoryStore} from './support/memory.mjs';
import {inventorySuite} from './support/inventory-suite.mjs';
inventorySuite(()=>new MemoryStore());
