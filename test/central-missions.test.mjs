import {MemoryStore} from './support/memory.mjs';
import {centralMissionsSuite} from './support/central-missions-suite.mjs';
centralMissionsSuite(()=>new MemoryStore());
