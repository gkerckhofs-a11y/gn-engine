import {spaceSearchSuite} from './support/space-search-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceSearchSuite(()=>new MemoryStore());
