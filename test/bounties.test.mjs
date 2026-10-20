import {MemoryStore} from './support/memory.mjs';
import {bountiesSuite} from './support/bounties-suite.mjs';
bountiesSuite(()=>new MemoryStore());
