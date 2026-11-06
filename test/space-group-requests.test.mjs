import {MemoryStore} from './support/memory.mjs';
import {groupRequestsSuite} from './support/space-group-requests-suite.mjs';
groupRequestsSuite(()=>new MemoryStore());
