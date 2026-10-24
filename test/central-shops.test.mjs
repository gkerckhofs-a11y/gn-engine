import {centralShopsSuite} from './support/central-shops-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
centralShopsSuite(()=>new MemoryStore());
