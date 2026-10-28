import {spaceOutlawsShopsSuite} from './support/space-outlaws-shops-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceOutlawsShopsSuite(()=>new MemoryStore());
