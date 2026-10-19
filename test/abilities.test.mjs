import {MemoryStore} from './support/memory.mjs';
import {abilitiesSuite} from './support/abilities-suite.mjs';
abilitiesSuite(()=>new MemoryStore());
