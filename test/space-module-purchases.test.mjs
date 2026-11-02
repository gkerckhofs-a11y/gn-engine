import {modulePurchasesSuite} from './support/space-module-purchases-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
modulePurchasesSuite(()=>new MemoryStore());
