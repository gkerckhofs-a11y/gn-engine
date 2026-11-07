import {MemoryStore} from './support/memory.mjs';
import {spaceGroupStockSuite} from './support/space-group-stock-suite.mjs';
spaceGroupStockSuite(()=>new MemoryStore());
