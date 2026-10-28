import {spaceMissionsSuite} from './support/space-missions-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
spaceMissionsSuite(()=>new MemoryStore());
