import {intelligenceSuite} from './support/intelligence-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
intelligenceSuite(()=>new MemoryStore());
