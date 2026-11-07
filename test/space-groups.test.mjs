import {MemoryStore} from './support/memory.mjs';
import {spaceGroupsSuite} from './support/space-groups-suite.mjs';
spaceGroupsSuite(()=>new MemoryStore());
