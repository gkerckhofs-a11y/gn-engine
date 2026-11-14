import {shipCrewSuite} from './support/ship-crew-suite.mjs';
import {MemoryStore} from './support/memory.mjs';
shipCrewSuite(()=>new MemoryStore());
