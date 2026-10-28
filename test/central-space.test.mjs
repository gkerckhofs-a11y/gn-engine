import {MemoryStore} from './support/memory.mjs';
import {centralSpaceSuite} from './support/central-space-suite.mjs';
centralSpaceSuite(()=>new MemoryStore());
