import {MemoryStore} from './support/memory.mjs';
import {centralGroupsSuite} from './support/central-groups-suite.mjs';
centralGroupsSuite(()=>new MemoryStore());
