import {MemoryStore} from './support/memory.mjs';
import {collectiveSuite} from './support/collective-suite.mjs';
collectiveSuite(()=>new MemoryStore());
