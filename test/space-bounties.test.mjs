import {spaceBountiesSuite} from './support/space-bounties-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceBountiesSuite(()=>new MemoryStore());
