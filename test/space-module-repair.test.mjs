import {MemoryStore} from './support/memory.mjs';
import {moduleRepairSuite} from './support/space-module-repair-suite.mjs';
moduleRepairSuite(()=>new MemoryStore());
