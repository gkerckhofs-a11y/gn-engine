import {MemoryStore} from './support/memory.mjs';
import {negotiationsSuite} from './support/negotiations-suite.mjs';
negotiationsSuite(()=>new MemoryStore());
