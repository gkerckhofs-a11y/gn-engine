import {MemoryStore} from './support/memory.mjs';
import {logisticsSuite} from './support/logistics-suite.mjs';
logisticsSuite(()=>new MemoryStore());
